import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette, type PaletteAction } from './components/CommandPalette';
import { Drawer } from './components/Drawer';
import { EmptyState } from './components/EmptyState';
import { Icon } from './components/Icon';
import { PlacementList } from './components/PlacementList';
import { PlacementTable } from './components/PlacementTable';
import { Sidebar } from './components/Sidebar';
import { StatsBar } from './components/StatsBar';
import { ThemeButton } from './components/ThemeButton';
import { Toast, type ToastMessage } from './components/Toast';
import { SORT_LABELS, Toolbar } from './components/Toolbar';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useMode } from './hooks/useAppearance';
import { MODES } from './lib/appearance';
import { copyText } from './lib/clipboard';
import { downloadCsv } from './lib/csv';
import { applyFilters, EMPTY_FILTERS, hasActiveFilters, sortItems } from './lib/filter';
import { formatDateRange, plural } from './lib/format';
import { computeMetrics, cpmOf } from './lib/metrics';
import { prefersReducedMotion, withTransition } from './lib/transition';
import { parseState, serializeState, type AppState } from './lib/url-state';
import {
  PLATFORMS,
  STATUSES,
  type Placement,
  type Platform,
  type SortDir,
  type SortKey,
  type Status,
} from './types';

interface Props {
  placements: readonly Placement[];
}

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: 'asc',
  platform: 'asc',
  status: 'asc',
  date: 'asc',
  subscribers: 'desc',
  storyReach: 'desc',
  reelsViews: 'desc',
  cost: 'desc',
  cpm: 'desc',
};

const EXIT_MS = 240;

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export default function App({ placements }: Props) {
  const [state, setState] = useState<AppState>(() => parseState(window.location.search));
  const [mode, setMode] = useMode();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [exiting, setExiting] = useState<Placement | null>(null);
  const [intro, setIntro] = useState(true);
  const compact = useMediaQuery('(max-width: 759px)');
  const searchRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  // Постоянные для набора данных: шкалы, чтобы полоски не «прыгали» при фильтрах.
  const scale = useMemo(() => {
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
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const item of applyFilters(placements, filters, 'status')) counts[item.status] += 1;
    return counts;
  }, [placements, filters]);
  const statusTotal = useMemo(
    () => STATUSES.reduce((sum, status) => sum + statusCounts[status], 0),
    [statusCounts],
  );
  const rowStatusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const item of rows) counts[item.status] += 1;
    return counts;
  }, [rows]);
  const platformCounts = useMemo(() => {
    const counts = Object.fromEntries(PLATFORMS.map((p) => [p, 0])) as Record<Platform, number>;
    for (const item of applyFilters(placements, { ...filters, platforms: [] })) {
      counts[item.platform] += 1;
    }
    return counts;
  }, [placements, filters]);

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
  const overlayOpen = paletteOpen || drawerItem !== null;

  // ——— действия ———
  const commit = useCallback((next: (previous: AppState) => AppState) => {
    withTransition(() => setState(next));
  }, []);

  const showToast = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
  }, []);

  const selectStatus = useCallback(
    (status: Status | null) => commit((s) => ({ ...s, filters: { ...s.filters, status } })),
    [commit],
  );
  const togglePlatform = useCallback(
    (platform: Platform) =>
      commit((s) => {
        const has = s.filters.platforms.includes(platform);
        const platforms = has
          ? s.filters.platforms.filter((p) => p !== platform)
          : [...s.filters.platforms, platform];
        return { ...s, filters: { ...s.filters, platforms } };
      }),
    [commit],
  );
  const clearPlatforms = useCallback(
    () => commit((s) => ({ ...s, filters: { ...s.filters, platforms: [] } })),
    [commit],
  );
  const setQuery = useCallback(
    (query: string) => setState((s) => ({ ...s, filters: { ...s.filters, query } })),
    [],
  );
  const resetFilters = useCallback(
    () => commit((s) => ({ ...s, filters: EMPTY_FILTERS })),
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
  const toggleDir = useCallback(
    () =>
      commit((s) => ({ ...s, sort: { ...s.sort, dir: s.sort.dir === 'asc' ? 'desc' : 'asc' } })),
    [commit],
  );

  const openPlacement = useCallback((id: number) => {
    setState((s) => ({ ...s, openId: id }));
  }, []);

  const closeDrawer = useCallback(() => {
    if (current) {
      setExiting(current);
      timers.current.push(
        window.setTimeout(() => setExiting(null), prefersReducedMotion() ? 0 : EXIT_MS),
      );
    }
    setState((s) => ({ ...s, openId: null }));
  }, [current]);

  const step = useCallback(
    (delta: 1 | -1) => {
      if (!position || rows.length === 0) return;
      const next = rows[(position.index + delta + rows.length) % rows.length];
      if (next) setState((s) => ({ ...s, openId: next.id }));
    },
    [position, rows],
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
    const ok = downloadCsv(rows, 'bloggers.csv');
    showToast(
      ok
        ? `Выгружено: ${rows.length} ${plural(rows.length, ['размещение', 'размещения', 'размещений'])}`
        : 'Не удалось создать файл',
    );
  }, [rows, showToast]);

  const palette = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      {
        id: 'view-all',
        label: 'Показать все размещения',
        icon: 'table',
        keywords: 'все статус вид',
        run: () => selectStatus(null),
      },
      ...STATUSES.map<PaletteAction>((status) => ({
        id: `view-${status}`,
        label: `Показать: ${status}`,
        hint: `${statusCounts[status]}`,
        icon: 'table',
        keywords: 'статус вид воронка',
        run: () => selectStatus(status),
      })),
      ...PLATFORMS.map<PaletteAction>((platform) => ({
        id: `platform-${platform}`,
        label: `${state.filters.platforms.includes(platform) ? 'Убрать' : 'Добавить'} фильтр: ${platform}`,
        icon: 'filter',
        keywords: 'площадка фильтр',
        run: () => togglePlatform(platform),
      })),
      {
        id: 'export',
        label: 'Экспорт в CSV',
        hint: `${rows.length}`,
        icon: 'download',
        keywords: 'скачать выгрузка excel',
        run: exportCsv,
      },
      ...MODES.map<PaletteAction>((m) => ({
        id: `theme-${m}`,
        label: `Тема: ${m === 'system' ? 'системная' : m === 'light' ? 'светлая' : 'тёмная'}`,
        icon: m === 'system' ? 'monitor' : m === 'light' ? 'sun' : 'moon',
        keywords: 'оформление цвет',
        run: () => setMode(m),
      })),
    ];
    if (filtersActive) {
      list.unshift({
        id: 'reset',
        label: 'Сбросить фильтры',
        icon: 'x',
        keywords: 'очистить убрать',
        run: resetFilters,
      });
    }
    return list;
  }, [
    statusCounts,
    state.filters.platforms,
    rows.length,
    filtersActive,
    selectStatus,
    togglePlatform,
    exportCsv,
    setMode,
    resetFilters,
  ]);

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
    try {
      const next = serializeState(state);
      if (next !== window.location.search) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${next}${window.location.hash}`,
        );
      }
    } catch {
      /* адресная строка недоступна (iframe, file://) — состояние просто не сохранится в ссылке */
    }
  }, [state]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (paletteOpen || drawerItem || isTyping(event.target)) return;
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [paletteOpen, drawerItem]);

  useEffect(() => {
    document.documentElement.classList.toggle('is-locked', overlayOpen);
  }, [overlayOpen]);

  return (
    <>
      <div className={intro ? 'app is-intro' : 'app'} inert={overlayOpen}>
        <Sidebar
          total={statusTotal}
          counts={statusCounts}
          active={state.filters.status}
          onSelect={selectStatus}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="main">
          <header className="topbar">
            <div>
              <h1 className="topbar__title">Размещения</h1>
              <p className="topbar__sub">
                {placements.length}{' '}
                {plural(placements.length, ['размещение', 'размещения', 'размещений'])} ·{' '}
                {scale.platforms} {plural(scale.platforms, ['площадка', 'площадки', 'площадок'])}
                {scale.range && ` · ${scale.range}`}
              </p>
            </div>
            <div className="topbar__actions">
              <span className="badge">Демо-данные</span>
              <ThemeButton mode={mode} onChange={setMode} />
              <button type="button" className="btn" onClick={exportCsv}>
                <Icon name="download" size={15} />
                <span className="btn__text">Экспорт CSV</span>
              </button>
            </div>
          </header>

          <StatsBar
            metrics={metrics}
            rows={rows}
            scale={scale}
            statusCounts={rowStatusCounts}
            filtered={filtersActive}
          />

          <Toolbar
            query={state.filters.query}
            onQuery={setQuery}
            searchRef={searchRef}
            platforms={state.filters.platforms}
            platformCounts={platformCounts}
            onTogglePlatform={togglePlatform}
            onClearPlatforms={clearPlatforms}
            sort={state.sort}
            onSort={sortBy}
            onToggleDir={toggleDir}
            showSort={compact}
            shown={rows.length}
            total={placements.length}
            hasFilters={filtersActive}
            onReset={resetFilters}
          />

          {rows.length === 0 ? (
            <EmptyState onReset={resetFilters} />
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
          )}
          <p className="sr-only">Сортировка: {SORT_LABELS[state.sort.key]}</p>
        </main>
      </div>

      {drawerItem && (
        <Drawer
          item={drawerItem}
          closing={current === null}
          position={position}
          onClose={closeDrawer}
          onStep={step}
          onCopy={(text) => void copyArticle(text)}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          placements={placements}
          actions={palette}
          onOpenPlacement={openPlacement}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      <Toast message={toast} />
    </>
  );
}
