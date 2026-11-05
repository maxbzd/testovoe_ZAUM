import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config';
import { copyText } from '../lib/clipboard';
import { downloadCsv } from '../lib/csv';
import { EMPTY_FILTERS, hasActiveFilters } from '../lib/filter';
import { plural } from '../lib/format';
import { buildPaletteActions } from '../lib/palette-actions';
import { DEFAULT_DIR, isDefaultSort } from '../lib/sort';
import { prefersReducedMotion, withTransition } from '../lib/transition';
import type { AppState } from '../lib/url-state';
import type { Placement, Platform, Sort, SortKey, Status } from '../types';
import { useMode } from './useAppearance';
import { useDataScale, useDerivedData } from './useDerivedData';
import { useHotkeys } from './useHotkeys';
import { useMediaQuery } from './useMediaQuery';
import { useToast } from './useToast';
import { useUrlState } from './useUrlState';

export const DRAWER_EXIT_MS = 240;
/** Ниже этой ширины таблица тесна: переходим на телефонную раскладку. */
const COMPACT_QUERY = '(max-width: 899px)';
const INTRO_MS = 1400;

export const WORDS = ['размещение', 'размещения', 'размещений'] as const;

const csvFilename = (): string => `bloggers-${new Date().toISOString().slice(0, 10)}.csv`;

/**
 * Всё состояние и все действия приложения в одном месте. Оболочки для компьютера
 * и телефона только раскладывают это по экрану и ничего не решают сами.
 */
export function useAppController(placements: readonly Placement[]) {
  const [state, setState] = useUrlState();
  const [mode, setMode] = useMode();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [exiting, setExiting] = useState<Placement | null>(null);
  const [intro, setIntro] = useState(true);
  const compact = useMediaQuery(COMPACT_QUERY);
  const searchRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  const scale = useDataScale(placements);
  const derived = useDerivedData(placements, state);
  const { rows, statusCounts } = derived;

  const current = useMemo(
    () => (state.openId === null ? null : (placements.find((p) => p.id === state.openId) ?? null)),
    [placements, state.openId],
  );
  const drawerItem = current ?? exiting;
  const position = useMemo(() => {
    const index = rows.findIndex((item) => item.id === state.openId);
    return index >= 0 ? { index, total: rows.length } : null;
  }, [rows, state.openId]);

  const filtersActive = hasActiveFilters(state.filters);
  const sheetOpen = filtersOpen && compact;
  const overlayOpen = paletteOpen || sheetOpen || drawerItem !== null;

  // ——— действия ———
  // `animate: false` — для шторки фильтров: список под ней закрыт, анимация не видна,
  // а переключатели должны отзываться мгновенно.
  const commit = useCallback(
    (next: (previous: AppState) => AppState, animate = true) => {
      if (animate) withTransition(() => setState(next));
      else setState(next);
    },
    [setState],
  );

  const selectStatus = useCallback(
    (status: Status | null) => commit((s) => ({ ...s, filters: { ...s.filters, status } })),
    [commit],
  );
  const togglePlatform = useCallback(
    (platform: Platform, animate = true) =>
      commit((s) => {
        const has = s.filters.platforms.includes(platform);
        const platforms = has
          ? s.filters.platforms.filter((p) => p !== platform)
          : [...s.filters.platforms, platform];
        return { ...s, filters: { ...s.filters, platforms } };
      }, animate),
    [commit],
  );
  const clearPlatforms = useCallback(
    () => commit((s) => ({ ...s, filters: { ...s.filters, platforms: [] } })),
    [commit],
  );
  const setQuery = useCallback(
    (query: string) => setState((s) => ({ ...s, filters: { ...s.filters, query } })),
    [setState],
  );
  const resetFilters = useCallback(
    (animate = true) => commit((s) => ({ ...s, filters: EMPTY_FILTERS }), animate),
    [commit],
  );
  const setSort = useCallback(
    (sort: Sort, animate = true) => commit((s) => ({ ...s, sort }), animate),
    [commit],
  );
  const sortBy = useCallback(
    (key: SortKey) =>
      commit((s) => ({
        ...s,
        sort:
          s.sort.key === key
            ? { key, dir: s.sort.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: DEFAULT_DIR[key] },
      })),
    [commit],
  );

  const openPlacement = useCallback(
    (id: number) => setState((s) => ({ ...s, openId: id })),
    [setState],
  );
  const closeDrawer = useCallback(() => {
    if (current) {
      setExiting(current);
      timers.current.push(
        window.setTimeout(() => setExiting(null), prefersReducedMotion() ? 0 : DRAWER_EXIT_MS),
      );
    }
    setState((s) => ({ ...s, openId: null }));
  }, [current, setState]);
  const step = useCallback(
    (delta: 1 | -1) => {
      // Есть позиция в отборе — значит, отбор не пуст и индекс по кругу всегда существует.
      if (!position) return;
      const next = rows[(position.index + delta + rows.length) % rows.length] as Placement;
      setState((s) => ({ ...s, openId: next.id }));
    },
    [position, rows, setState],
  );

  const copyArticle = useCallback(
    (article: string) => {
      void copyText(article).then((ok) => {
        showToast(ok ? `Артикул ${article} скопирован` : 'Не удалось скопировать');
      });
    },
    [showToast],
  );

  const exportCsv = useCallback(() => {
    if (config.preview) {
      // В песочнице превью скачивание файлов заблокировано платформой.
      showToast('В превью скачивание отключено, на сайте файл сохранится');
      return;
    }
    const ok = downloadCsv(rows, csvFilename());
    showToast(
      ok ? `Выгружено: ${rows.length} ${plural(rows.length, WORDS)}` : 'Не удалось создать файл',
    );
  }, [rows, showToast]);

  const paletteActions = useMemo(
    () =>
      buildPaletteActions({
        statusCounts,
        selectedPlatforms: state.filters.platforms,
        rowCount: rows.length,
        filtersActive,
        selectStatus,
        togglePlatform,
        resetFilters,
        exportCsv,
        setMode,
      }),
    [
      statusCounts,
      state.filters.platforms,
      rows.length,
      filtersActive,
      selectStatus,
      togglePlatform,
      resetFilters,
      exportCsv,
      setMode,
    ],
  );

  // ——— побочные эффекты ———
  useEffect(() => {
    const timeout = window.setTimeout(() => setIntro(false), INTRO_MS);
    const pending = timers.current;
    return () => {
      window.clearTimeout(timeout);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('is-locked', overlayOpen);
  }, [overlayOpen]);

  useHotkeys({
    searchRef,
    onTogglePalette: useCallback(() => setPaletteOpen((open) => !open), []),
    blocked: overlayOpen,
  });

  const subtitle = [
    `${placements.length} ${plural(placements.length, WORDS)}`,
    `${scale.platforms} ${plural(scale.platforms, ['площадка', 'площадки', 'площадок'])}`,
    scale.range,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    // данные и производные
    placements,
    state,
    scale,
    ...derived,
    subtitle,
    filtersActive,
    /** Сколько настроек на телефоне отличается от умолчаний (для значка на кнопке фильтров). */
    activeFilterCount: state.filters.platforms.length + (isDefaultSort(state.sort) ? 0 : 1),
    // экран
    compact,
    intro,
    overlayOpen,
    searchRef,
    mode,
    setMode,
    // действия над данными
    selectStatus,
    togglePlatform,
    clearPlatforms,
    setQuery,
    resetFilters,
    setSort,
    sortBy,
    openPlacement,
    exportCsv,
    // окна
    openPalette: useCallback(() => setPaletteOpen(true), []),
    openFilters: useCallback(() => setFiltersOpen(true), []),
    drawer: {
      item: drawerItem,
      closing: current === null,
      suspended: paletteOpen || sheetOpen,
      position,
      onClose: closeDrawer,
      onStep: step,
      onCopy: copyArticle,
    },
    sheet: { open: sheetOpen, onClose: useCallback(() => setFiltersOpen(false), []) },
    palette: {
      open: paletteOpen,
      actions: paletteActions,
      onClose: useCallback(() => setPaletteOpen(false), []),
    },
    toast,
  };
}

export type AppController = ReturnType<typeof useAppController>;
