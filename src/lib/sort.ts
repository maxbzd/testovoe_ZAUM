import type { Sort, SortDir, SortKey } from '../types';

export const SORT_LABELS: Record<SortKey, string> = {
  name: 'Блогер',
  platform: 'Площадка',
  status: 'Статус',
  date: 'Дата',
  subscribers: 'Подписчики',
  storyReach: 'Охват сторис',
  reelsViews: 'Просмотры рилс',
  cost: 'Стоимость',
  cpm: 'CPM',
};

export const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

/** Текст — от А к Я, даты — от ранних, числа — от больших: так обычно и ищут. */
export const DEFAULT_DIR: Record<SortKey, SortDir> = {
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

export const DEFAULT_SORT: Sort = { key: 'date', dir: 'asc' };

export const isDefaultSort = (sort: Sort): boolean =>
  sort.key === DEFAULT_SORT.key && sort.dir === DEFAULT_SORT.dir;
