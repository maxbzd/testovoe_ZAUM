import type { Filters, Placement, Sort, SortKey } from '../types';
import { STATUSES } from '../types';
import { cpmOf } from './metrics';

/** Нижний регистр и «ё» → «е»: поиск не придирается к написанию. */
export const normalize = (value: string): string => value.toLowerCase().replaceAll('ё', 'е');

/** Всё, по чему можно искать, одной строкой. */
export const searchText = (item: Placement): string =>
  normalize(
    [
      item.name,
      item.article,
      item.comment,
      item.platform,
      item.format,
      item.status,
      item.budgetType,
      item.audienceAge,
      item.audienceGeo,
    ].join(' '),
  );

export const EMPTY_FILTERS: Filters = { query: '', status: null, platforms: [] };

export const hasActiveFilters = (filters: Filters): boolean =>
  filters.query.trim() !== '' || filters.status !== null || filters.platforms.length > 0;

/**
 * Отбор строк. Каждое слово запроса должно встретиться где-нибудь в строке (И).
 * `ignore` позволяет не учитывать один из фильтров — так считаются счётчики
 * у карточек воронки («сколько будет, если выбрать этот статус»).
 */
export function applyFilters(
  items: readonly Placement[],
  filters: Filters,
  ignore?: 'status',
): Placement[] {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (ignore !== 'status' && filters.status && item.status !== filters.status) return false;
    if (filters.platforms.length > 0 && !filters.platforms.includes(item.platform)) return false;
    if (words.length === 0) return true;
    const haystack = searchText(item);
    return words.every((word) => haystack.includes(word));
  });
}

const sortValue = (item: Placement, key: SortKey): number | string => {
  switch (key) {
    case 'name':
      return item.name;
    case 'platform':
      return item.platform;
    case 'status':
      return STATUSES.indexOf(item.status);
    case 'date':
      return item.date;
    case 'cpm':
      return cpmOf(item);
    default:
      return item[key];
  }
};

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

export function sortItems(items: readonly Placement[], sort: Sort): Placement[] {
  const direction = sort.dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = sortValue(a, sort.key);
    const right = sortValue(b, sort.key);
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : collator.compare(String(left), String(right));
    return order !== 0 ? order * direction : a.id - b.id;
  });
}

const tokens = (text: string): string[] =>
  normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Насколько запрос подходит блогеру: начало слова в имени весит больше, чем начало
 * в артикуле, а оно — больше, чем случайное совпадение внутри. Для сортировки подсказок.
 */
export function relevance(item: Placement, words: readonly string[]): number {
  const name = tokens(item.name);
  const article = tokens(item.article);
  return words.reduce((total, word) => {
    if (name.some((token) => token.startsWith(word))) return total + 3;
    if (article.some((token) => token.startsWith(word))) return total + 2;
    return total + 1;
  }, 0);
}
