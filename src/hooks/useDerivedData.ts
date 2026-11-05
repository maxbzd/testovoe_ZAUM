import { useDeferredValue, useMemo } from 'react';
import { applyFilters, sortItems } from '../lib/filter';
import { formatDateRange } from '../lib/format';
import { computeMetrics, cpmOf } from '../lib/metrics';
import type { AppState } from '../lib/url-state';
import { PLATFORMS, STATUSES, type Placement, type Platform, type Status } from '../types';

/** Постоянные для набора данных: шкалы, чтобы полоски не «прыгали» при фильтрах. */
export function useDataScale(placements: readonly Placement[]) {
  return useMemo(() => {
    const cpms = placements.map(cpmOf).filter((value) => value > 0);
    const dates = placements.map((item) => item.date).sort();
    return {
      cpmMin: cpms.length ? Math.min(...cpms) : 0,
      cpmMax: cpms.length ? Math.max(...cpms) : 0,
      maxReach: Math.max(0, ...placements.map((item) => item.storyReach)),
      maxReels: Math.max(0, ...placements.map((item) => item.reelsViews)),
      range: dates.length ? formatDateRange(dates[0] ?? '', dates[dates.length - 1] ?? '') : '',
      platforms: new Set(placements.map((item) => item.platform)).size,
    };
  }, [placements]);
}

const countBy = <K extends string>(
  keys: readonly K[],
  items: readonly Placement[],
  pick: (item: Placement) => K,
): Record<K, number> => {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const item of items) counts[pick(item)] += 1;
  return counts;
};

/** Всё, что считается из данных и текущих фильтров. Запрос «догоняет» ввод через deferred. */
export function useDerivedData(placements: readonly Placement[], state: AppState) {
  const deferredQuery = useDeferredValue(state.filters.query);
  const filters = useMemo(
    () => ({ ...state.filters, query: deferredQuery }),
    [state.filters, deferredQuery],
  );

  const rows = useMemo(
    () => sortItems(applyFilters(placements, filters), state.sort),
    [placements, filters, state.sort],
  );
  const metrics = useMemo(() => computeMetrics(rows), [rows]);

  // Счётчики «а что будет, если выбрать это»: каждый учитывает остальные фильтры.
  const statusCounts = useMemo(
    () => countBy<Status>(STATUSES, applyFilters(placements, filters, 'status'), (i) => i.status),
    [placements, filters],
  );
  const rowStatusCounts = useMemo(() => countBy<Status>(STATUSES, rows, (i) => i.status), [rows]);
  const platformCounts = useMemo(
    () =>
      countBy<Platform>(
        PLATFORMS,
        applyFilters(placements, { ...filters, platforms: [] }),
        (i) => i.platform,
      ),
    [placements, filters],
  );
  const statusTotal = useMemo(
    () => STATUSES.reduce((sum, status) => sum + statusCounts[status], 0),
    [statusCounts],
  );

  return { rows, metrics, statusCounts, statusTotal, rowStatusCounts, platformCounts };
}
