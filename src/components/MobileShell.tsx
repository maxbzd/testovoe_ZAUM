import type { AppController } from '../hooks/useAppController';
import { SORT_LABELS } from '../lib/sort';
import { Icon } from './Icon';
import { MobileBar } from './MobileBar';
import { Results } from './Results';
import { SearchField } from './SearchField';
import { StatsBar } from './StatsBar';
import { StatusChips } from './StatusChips';
import { Topbar } from './Topbar';

/** Телефон: компактная шапка, лента показателей, закреплённые поиск и статусы, список. */
export function MobileShell({ app }: { app: AppController }) {
  const { state, activeFilterCount } = app;
  return (
    <>
      <MobileBar
        mode={app.mode}
        onMode={app.setMode}
        onOpenPalette={app.openPalette}
        onExport={app.exportCsv}
      />
      <main className="main">
        <Topbar title="Размещения" subtitle={app.subtitle} />

        <StatsBar
          metrics={app.metrics}
          rows={app.rows}
          scale={app.scale}
          statusCounts={app.rowStatusCounts}
          filtered={app.filtersActive}
          scrollable
        />

        <div className="mtools">
          <div className="mtools__row">
            <SearchField
              value={state.filters.query}
              onChange={app.setQuery}
              inputRef={app.searchRef}
            />
            <button
              type="button"
              className="filter-btn"
              onClick={app.openFilters}
              aria-label={
                activeFilterCount > 0
                  ? `Фильтры и сортировка, изменено: ${activeFilterCount}`
                  : 'Фильтры и сортировка'
              }
            >
              <Icon name="sliders" size={18} />
              {activeFilterCount > 0 && (
                <span className="filter-btn__badge" aria-hidden="true">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          <StatusChips
            total={app.statusTotal}
            counts={app.statusCounts}
            active={state.filters.status}
            onSelect={app.selectStatus}
          />
        </div>

        <p className="summary" role="status" aria-live="polite">
          <span>
            {app.rows.length} из {app.placements.length} · {SORT_LABELS[state.sort.key]}{' '}
            {state.sort.dir === 'asc' ? '↑' : '↓'}
          </span>
          {app.filtersActive && (
            <button type="button" className="link-btn" onClick={() => app.resetFilters()}>
              Сбросить
            </button>
          )}
        </p>

        <Results app={app} />
      </main>
    </>
  );
}
