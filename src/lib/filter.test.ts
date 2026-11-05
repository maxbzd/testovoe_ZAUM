import { describe, expect, it } from 'vitest';
import { sample } from '../test/fixtures';
import {
  applyFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  normalize,
  relevance,
  sortItems,
} from './filter';
import { make } from '../test/fixtures';

const ids = (items: { id: number }[]): number[] => items.map((item) => item.id);

describe('filter', () => {
  it('нормализует регистр и «ё»', () => {
    expect(normalize('ЁЛКА')).toBe('елка');
  });

  it('без фильтров возвращает всё', () => {
    expect(applyFilters(sample, EMPTY_FILTERS)).toHaveLength(4);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('фильтрует по статусу и площадке', () => {
    expect(ids(applyFilters(sample, { ...EMPTY_FILTERS, status: 'Опубликовано' }))).toEqual([2]);
    expect(ids(applyFilters(sample, { ...EMPTY_FILTERS, platforms: ['Telegram'] }))).toEqual([
      1, 4,
    ]);
    expect(
      ids(
        applyFilters(sample, {
          ...EMPTY_FILTERS,
          platforms: ['Telegram', 'VK'],
          status: 'Опубликовано',
        }),
      ),
    ).toEqual([2]);
  });

  it('ищет по имени, артикулу и комментарию, все слова должны совпасть', () => {
    expect(ids(applyFilters(sample, { ...EMPTY_FILTERS, query: 'блогер 003' }))).toEqual([3]);
    expect(ids(applyFilters(sample, { ...EMPTY_FILTERS, query: 'demo-101' }))).toEqual([1]);
    expect(ids(applyFilters(sample, { ...EMPTY_FILTERS, query: 'ПРОВЕРИТЬ результаты' }))).toEqual([
      2,
    ]);
    expect(applyFilters(sample, { ...EMPTY_FILTERS, query: 'nothing here' })).toEqual([]);
  });

  it('может не учитывать статус — для счётчиков воронки', () => {
    const filters = {
      ...EMPTY_FILTERS,
      status: 'Опубликовано' as const,
      platforms: ['Telegram' as const],
    };
    expect(ids(applyFilters(sample, filters, 'status'))).toEqual([1, 4]);
  });

  it('сортирует числа, строки, статусы и CPM, стабильно по id', () => {
    expect(ids(sortItems(sample, { key: 'date', dir: 'asc' }))).toEqual([2, 3, 1, 4]);
    expect(ids(sortItems(sample, { key: 'cost', dir: 'desc' }))).toEqual([4, 3, 2, 1]);
    expect(ids(sortItems(sample, { key: 'status', dir: 'asc' }))).toEqual([1, 4, 2, 3]);
    expect(ids(sortItems(sample, { key: 'platform', dir: 'asc' }))).toEqual([1, 4, 2, 3]);
    // CPM: 2000, 1500, 1000, 0 (нулевой охват)
    expect(ids(sortItems(sample, { key: 'cpm', dir: 'desc' }))).toEqual([1, 2, 3, 4]);
  });

  it('не мутирует исходный массив', () => {
    const copy = [...sample];
    sortItems(sample, { key: 'cost', dir: 'desc' });
    expect(sample).toEqual(copy);
  });

  it('ранжирует подсказки: начало слова в имени сильнее случайного совпадения', () => {
    const exact = make({ id: 20, name: 'Блогер 020', article: 'DEMO-121' });
    const incidental = make({ id: 1, name: 'Блогер 001', article: 'DEMO-102' });
    const words = ['блогер', '02'];
    expect(relevance(exact, words)).toBeGreaterThan(relevance(incidental, words));
  });
});
