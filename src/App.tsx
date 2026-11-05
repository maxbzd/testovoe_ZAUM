import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { Drawer } from './components/Drawer';
import { EmptyState } from './components/EmptyState';
import { FilterSheet } from './components/FilterSheet';
import { Icon } from './components/Icon';
import { MobileBar } from './components/MobileBar';
import { PlacementList } from './components/PlacementList';
import { PlacementTable } from './components/PlacementTable';
import { SearchField } from './components/SearchField';
import { Sidebar } from './components/Sidebar';
import { StatsBar } from './components/StatsBar';
import { StatusChips } from './components/StatusChips';
import { ThemeButton } from './components/ThemeButton';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { Topbar } from './components/Topbar';
import { useMode } from './hooks/useAppearance';
import { useDataScale, useDerivedData } from './hooks/useDerivedData';
import { useHotkeys } from './hooks/useHotkeys';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useToast } from './hooks/useToast';
import { useUrlState } from './hooks/useUrlState';
import { copyText } from './lib/clipboard';
import { downloadCsv } from './lib/csv';
import { EMPTY_FILTERS, hasActiveFilters } from './lib/filter';
import { plural } from './lib/format';
import { buildPaletteActions } from './lib/palette-actions';
import { DEFAULT_DIR, isDefaultSort, SORT_LABELS } from './lib/sort';
import { prefersReducedMotion, withTransition } from './lib/transition';
import type { AppState } from './lib/url-state';
import type { Placement, Platform, Sort, SortKey, Status } from './types';

interface Props {
  placements: readonly Placement[];
}

const DRAWER_EXIT_MS = 240;
/** Ниже этой ширины таблица тесна: переходим на телефонную раскладку. */
const COMPACT_QUERY = '(max-width: 899px)';

const csvFilename = (): string => `bloggers-${new Date().toISOString().slice(0, 10)}.csv`;

const WORDS = ['размещение', 'размещения', 'размещений'] as const;

export default function App({ placements }: Props) {
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
  const { rows, metrics, statusCounts, statusTotal, rowStatusCounts, platformCounts } =
    useDerivedData(placements, state);

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
      if (!position || rows.length === 0) return;
      const next = rows[(position.index + delta + rows.length) % rows.length];
      if (next) setState((s) => ({ ...s, openId: next.id }));
    },
    [position, rows, setState],
  );

  const copyArticle = useCallback(
    async (article: string) => {
      showToast(
        (await copyText(article)) ? `Артикул ${article} скопирован` : 'Не удалось скопировать',
      );
    },
    [showToast],
  );

  const exportCsv = useCallback(() => {
    if (__PREVIEW__) {
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
    const timeout = window.setTimeout(() => setIntro(false), 1400);
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
    blocked: paletteOpen || sheetOpen || drawerItem !== null,
  });

  const subtitle = [
    `${placements.length} ${plural(placements.length, WORDS)}`,
    `${scale.platforms} ${plural(scale.platforms, ['площадка', 'площадки', 'площадок'])}`,
    scale.range,
  ]
    .filter(Boolean)
    .join(' · ');
  const activeFilterCount = state.filters.platforms.length + (isDefaultSort(state.sort) ? 0 : 1);

  const results =
    rows.length === 0 ? (
      <EmptyState onReset={() => resetFilters()} />
    ) : compact ? (
      <PlacementList rows={rows} activeId={state.openId} onOpen={openPlacement} />
    ) : (
      <PlacementTable
        rows={rows}
        sort={state.sort}
        onSort={sortBy}
        activeId={state.openId}
        onOpen={openPlacement}
        maxReach={scale.maxReach}
        maxReels={scale.maxReels}
      />
    );

  return (
    <>
      <div className={intro ? 'app is-intro' : 'app'} inert={overlayOpen}>
        {compact ? (
          <MobileBar
            mode={mode}
            onMode={setMode}
            onOpenPalette={() => setPaletteOpen(true)}
            onExport={exportCsv}
          />
        ) : (
          <Sidebar
            total={statusTotal}
            counts={statusCounts}
            active={state.filters.status}
            onSelect={selectStatus}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        )}

        <main className="main">
          <Topbar title="Размещения" subtitle={subtitle}>
            {!compact && (
              <>
                <span className="badge">Демо-данные</span>
                <ThemeButton mode={mode} onChange={setMode} />
                <button type="button" className="btn" onClick={exportCsv}>
                  <Icon name="download" size={15} />
                  Экспорт CSV
                </button>
              </>
            )}
          </Topbar>

          <StatsBar
            metrics={metrics}
            rows={rows}
            scale={scale}
            statusCounts={rowStatusCounts}
            filtered={filtersActive}
            scrollable={compact}
          />

          {compact ? (
            <>
              <div className="mtools">
                <div className="mtools__row">
                  <SearchField
                    value={state.filters.query}
                    onChange={setQuery}
                    inputRef={searchRef}
                  />
                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => setFiltersOpen(true)}
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
                  total={statusTotal}
                  counts={statusCounts}
                  active={state.filters.status}
                  onSelect={selectStatus}
                />
              </div>
              <p className="summary" role="status" aria-live="polite">
                <span>
                  {rows.length} из {placements.length} · {SORT_LABELS[state.sort.key]}{' '}
                  {state.sort.dir === 'asc' ? '↑' : '↓'}
                </span>
                {filtersActive && (
                  <button type="button" className="link-btn" onClick={() => resetFilters()}>
                    Сбросить
                  </button>
                )}
              </p>
            </>
          ) : (
            <Toolbar
              query={state.filters.query}
              onQuery={setQuery}
              searchRef={searchRef}
              platforms={state.filters.platforms}
              platformCounts={platformCounts}
              onTogglePlatform={togglePlatform}
              onClearPlatforms={clearPlatforms}
              shown={rows.length}
              total={placements.length}
              hasFilters={filtersActive}
              onReset={() => resetFilters()}
            />
          )}

          {results}
        </main>
      </div>

      {drawerItem && (
        <Drawer
          item={drawerItem}
          closing={current === null}
          suspended={paletteOpen || sheetOpen}
          position={position}
          onClose={closeDrawer}
          onStep={step}
          onCopy={(text) => void copyArticle(text)}
        />
      )}

      <FilterSheet
        open={sheetOpen}
        platforms={state.filters.platforms}
        platformCounts={platformCounts}
        onTogglePlatform={(platform) => togglePlatform(platform, false)}
        sort={state.sort}
        onSort={(sort) => setSort(sort, false)}
        shown={rows.length}
        hasFilters={filtersActive}
        onReset={() => resetFilters(false)}
        onClose={() => setFiltersOpen(false)}
      />

      <CommandPalette
        open={paletteOpen}
        placements={placements}
        actions={paletteActions}
        onOpenPlacement={openPlacement}
        onClose={() => setPaletteOpen(false)}
      />

      <Toast message={toast} />
    </>
  );
}
