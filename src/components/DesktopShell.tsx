import type { AppController } from '../hooks/useAppController';
import { Icon } from './Icon';
import { Results } from './Results';
import { Sidebar } from './Sidebar';
import { StatsBar } from './StatsBar';
import { ThemeButton } from './ThemeButton';
import { Toolbar } from './Toolbar';
import { Topbar } from './Topbar';

/** Компьютер: слева виды, справа показатели, панель поиска и таблица. */
export function DesktopShell({ app }: { app: AppController }) {
  const { state } = app;
  return (
    <>
      <Sidebar
        total={app.statusTotal}
        counts={app.statusCounts}
        active={state.filters.status}
        onSelect={app.selectStatus}
        onOpenPalette={app.openPalette}
      />
      <main className="main">
        <Topbar title="Размещения" subtitle={app.subtitle}>
          <span className="badge">Демо-данные</span>
          <ThemeButton mode={app.mode} onChange={app.setMode} />
          <button type="button" className="btn" onClick={app.exportCsv}>
            <Icon name="download" size={15} />
            Экспорт CSV
          </button>
        </Topbar>

        <StatsBar
          metrics={app.metrics}
          rows={app.rows}
          scale={app.scale}
          statusCounts={app.rowStatusCounts}
          filtered={app.filtersActive}
          scrollable={false}
        />

        <Toolbar
          query={state.filters.query}
          onQuery={app.setQuery}
          searchRef={app.searchRef}
          platforms={state.filters.platforms}
          platformCounts={app.platformCounts}
          onTogglePlatform={app.togglePlatform}
          onClearPlatforms={app.clearPlatforms}
          shown={app.rows.length}
          total={app.placements.length}
          hasFilters={app.filtersActive}
          onReset={() => app.resetFilters()}
        />

        <Results app={app} />
      </main>
    </>
  );
}
