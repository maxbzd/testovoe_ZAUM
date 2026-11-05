import type { AppController } from '../hooks/useAppController';
import { EmptyState } from './EmptyState';
import { PlacementList } from './PlacementList';
import { PlacementTable } from './PlacementTable';

/** Что показать под панелью инструментов: пустое состояние, список (телефон) или таблицу. */
export function Results({ app }: { app: AppController }) {
  const { rows, state, scale } = app;
  if (rows.length === 0) return <EmptyState onReset={() => app.resetFilters()} />;
  if (app.compact) {
    return <PlacementList rows={rows} activeId={state.openId} onOpen={app.openPlacement} />;
  }
  return (
    <PlacementTable
      rows={rows}
      sort={state.sort}
      onSort={app.sortBy}
      activeId={state.openId}
      onOpen={app.openPlacement}
      maxReach={scale.maxReach}
      maxReels={scale.maxReels}
    />
  );
}
