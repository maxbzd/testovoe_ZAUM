import { afterEach, describe, expect, it, vi } from 'vitest';
import { parsePlacements } from '../data/load';
import raw from '../data/bloggers.json';
import { applyMode, loadMode } from './appearance';
import { relevance, sortItems } from './filter';
import { formatDateLong, formatDateRange, formatDateShort } from './format';
import { readStorage, writeStorage } from './storage';
import { parseState } from './url-state';
import { make, sample } from '../test/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe('storage', () => {
  it('не падает, если localStorage недоступен', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(readStorage('k')).toBeNull();
    expect(() => writeStorage('k', 'v')).not.toThrow();
  });

  it('читает и пишет, когда доступен', () => {
    writeStorage('bloggers:test', 'значение');
    expect(readStorage('bloggers:test')).toBe('значение');
  });
});

describe('appearance', () => {
  it('«системная» тема убирает атрибут, явная ставит его', () => {
    applyMode('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyMode('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('игнорирует мусор в сохранённой теме', () => {
    window.localStorage.setItem('bloggers:theme', 'розовая');
    expect(loadMode()).toBe('system');
    window.localStorage.setItem('bloggers:theme', 'dark');
    expect(loadMode()).toBe('dark');
  });
});

describe('filter', () => {
  it('сортирует по имени естественным порядком', () => {
    const items = [make({ id: 3, name: 'Блогер 10' }), make({ id: 1, name: 'Блогер 2' })];
    expect(sortItems(items, { key: 'name', dir: 'asc' }).map((i) => i.name)).toEqual([
      'Блогер 2',
      'Блогер 10',
    ]);
  });

  it('совпадение в артикуле весит меньше имени, но больше случайного', () => {
    const item = make({ id: 7, name: 'Иван', article: 'DEMO-777' });
    expect(relevance(item, ['demo'])).toBe(2);
    expect(relevance(item, ['иван'])).toBe(3);
    expect(relevance(item, ['emo'])).toBe(1);
    expect(sample).toHaveLength(4);
  });
});

describe('url-state', () => {
  it('читает сортировку по возрастанию без минуса', () => {
    expect(parseState('?sort=cost').sort).toEqual({ key: 'cost', dir: 'asc' });
  });
});

describe('format (некорректные даты)', () => {
  it('возвращает исходную строку, а не падает', () => {
    expect(formatDateLong('не дата')).toBe('не дата');
    expect(formatDateShort('2026-13-40')).toBe('2026-13-40');
    expect(formatDateRange('x', '2026-11-02')).toBe('');
    expect(formatDateRange('2026-11-02', 'y')).toBe('');
  });
});

describe('parsePlacements (строгая проверка)', () => {
  it('отвергает нестроковые поля и неизвестную категорию бюджета', () => {
    const row = (raw as unknown[])[0] as Record<string, unknown>;
    expect(() => parsePlacements([{ ...row, name: 42 }])).toThrow('должно быть строкой');
    expect(() => parsePlacements([{ ...row, budgetType: 'Подарок' }])).toThrow('категория бюджета');
  });
});
