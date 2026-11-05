import { EMPTY_FILTERS } from './filter';
import { DEFAULT_SORT, isDefaultSort, SORT_KEYS } from './sort';
import type { Filters, Platform, Sort, Status } from '../types';
import { PLATFORMS, STATUSES } from '../types';

/** Всё, что человек выбрал на экране. Живёт в адресной строке — ссылкой можно поделиться. */
export interface AppState {
  filters: Filters;
  sort: Sort;
  openId: number | null;
}

const STATUS_SLUGS: Record<Status, string> = {
  Согласование: 'approval',
  Запланировано: 'planned',
  Опубликовано: 'published',
  'Результаты получены': 'results',
};
export const initialState = (): AppState => ({
  filters: EMPTY_FILTERS,
  sort: DEFAULT_SORT,
  openId: null,
});

export function parseState(search: string): AppState {
  const params = new URLSearchParams(search);
  const state = initialState();

  const status = STATUSES.find((s) => STATUS_SLUGS[s] === params.get('status'));
  // Stryker disable next-line StringLiteral: любая «заглушка» при отсутствии параметра отфильтровывается ниже
  const platforms = (params.get('platform') ?? '')
    .split(',')
    .map((slug) => PLATFORMS.find((p) => p.toLowerCase() === slug))
    .filter((p): p is Platform => p !== undefined);

  // Stryker disable next-line StringLiteral: при отсутствии параметра ключ не находится в любом случае
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
  if (!isDefaultSort(state.sort)) {
    params.set('sort', `${state.sort.dir === 'desc' ? '-' : ''}${state.sort.key}`);
  }
  if (state.openId !== null) params.set('open', String(state.openId));
  const text = params.toString();
  return text ? `?${text}` : '';
}
