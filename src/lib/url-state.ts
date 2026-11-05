import { EMPTY_FILTERS } from './filter';
import type { Filters, Platform, Sort, SortKey, Status } from '../types';
import { PLATFORMS, STATUSES } from '../types';

/** Всё, что человек выбрал на экране. Живёт в адресной строке — ссылкой можно поделиться. */
export interface AppState {
  filters: Filters;
  sort: Sort;
  openId: number | null;
}

export const DEFAULT_SORT: Sort = { key: 'date', dir: 'asc' };

const STATUS_SLUGS: Record<Status, string> = {
  Согласование: 'approval',
  Запланировано: 'planned',
  Опубликовано: 'published',
  'Результаты получены': 'results',
};
const SORT_KEYS: readonly SortKey[] = [
  'name',
  'platform',
  'status',
  'date',
  'subscribers',
  'storyReach',
  'reelsViews',
  'cost',
  'cpm',
];

export const initialState = (): AppState => ({
  filters: EMPTY_FILTERS,
  sort: DEFAULT_SORT,
  openId: null,
});

export function parseState(search: string): AppState {
  const params = new URLSearchParams(search);
  const state = initialState();

  const status = STATUSES.find((s) => STATUS_SLUGS[s] === params.get('status'));
  const platforms = (params.get('platform') ?? '')
    .split(',')
    .map((slug) => PLATFORMS.find((p) => p.toLowerCase() === slug))
    .filter((p): p is Platform => p !== undefined);

  const rawSort = params.get('sort') ?? '';
  const key = SORT_KEYS.find((k) => k === rawSort.replace(/^-/, ''));
  const openId = Number(params.get('open'));

  return {
    filters: {
      query: (params.get('q') ?? '').slice(0, 100),
      status: status ?? null,
      platforms: [...new Set(platforms)],
    },
    sort: key ? { key, dir: rawSort.startsWith('-') ? 'desc' : 'asc' } : state.sort,
    openId: Number.isInteger(openId) && openId > 0 ? openId : null,
  };
}

export function serializeState(state: AppState): string {
  const params = new URLSearchParams();
  const query = state.filters.query.trim();
  if (query) params.set('q', query);
  if (state.filters.status) params.set('status', STATUS_SLUGS[state.filters.status]);
  if (state.filters.platforms.length > 0) {
    params.set('platform', state.filters.platforms.map((p) => p.toLowerCase()).join(','));
  }
  if (state.sort.key !== DEFAULT_SORT.key || state.sort.dir !== DEFAULT_SORT.dir) {
    params.set('sort', `${state.sort.dir === 'desc' ? '-' : ''}${state.sort.key}`);
  }
  if (state.openId !== null) params.set('open', String(state.openId));
  const text = params.toString();
  return text ? `?${text}` : '';
}
