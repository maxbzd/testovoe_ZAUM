/**
 * Тесты, найденные мутационным тестированием: каждая проверка здесь закрывает
 * порчу кода, которую покрытие в 100% пропускало.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';
import { downloadCsv, sanitizeCell } from './csv';
import { isTyping } from './dom';
import {
  applyFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  relevance,
  searchText,
  sortItems,
} from './filter';
import { formatDateRange, formatInt, parseIsoDate, plural } from './format';
import { computeMetrics } from './metrics';
import { DEFAULT_SORT, isDefaultSort, SORT_LABELS } from './sort';
import { prefersReducedMotion } from './transition';
import { parseState, serializeState, initialState } from './url-state';
import { parsePlacements } from '../data/load';
import raw from '../data/bloggers.json';
import { make, sample } from '../test/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('format', () => {
  it('группирует разряды неразрывным пробелом и округляет', () => {
    expect(formatInt(1_234_567)).toBe('1 234 567');
    expect(formatInt(1234.6)).toBe('1 235');
    expect(formatInt(0)).toBe('0');
  });

  it('принимает только дату целиком и только существующую', () => {
    expect(parseIsoDate('2026-11-02')).not.toBeNull();
    expect(parseIsoDate('2026-11-02x')).toBeNull();
    expect(parseIsoDate('x2026-11-02')).toBeNull();
    expect(parseIsoDate('2026-02-29')).toBeNull(); // 2026 — не високосный
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
    expect(parseIsoDate('2026-00-10')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('2026-04-31')).toBeNull();
    expect(parseIsoDate('2026-11-00')).toBeNull();
  });

  it('склоняет на границах десятков', () => {
    const forms = ['один', 'два', 'много'] as const;
    const pick = (n: number): string => plural(n, forms);
    expect(
      [1, 2, 4, 5, 10, 11, 12, 14, 15, 19, 20, 21, 22, 25, 100, 101, 111, 112, 121].map(pick),
    ).toEqual([
      'один',
      'два',
      'два',
      'много',
      'много',
      'много',
      'много',
      'много',
      'много',
      'много',
      'много',
      'один',
      'два',
      'много',
      'много',
      'один',
      'много',
      'много',
      'один',
    ]);
  });

  it('формулирует диапазоны дат по случаям', () => {
    expect(formatDateRange('2026-11-02', '2026-11-25')).toBe('2–25 ноября 2026');
    expect(formatDateRange('2026-11-05', '2026-11-05')).toBe('5 ноября 2026');
    expect(formatDateRange('2026-10-28', '2026-11-25')).toBe('28 окт – 25 ноя 2026');
    expect(formatDateRange('2025-11-02', '2026-11-25')).toBe('2 ноя – 25 ноя 2026');
    expect(formatDateRange('2026-11-25', '2026-11-02')).toBe('25–2 ноября 2026');
  });
});

describe('metrics', () => {
  it('суммирует просмотры рилс и охват', () => {
    const metrics = computeMetrics(sample);
    expect(metrics.reelsViews).toBe(12_000);
    expect(metrics.storyReach).toBe(7_000);
  });
});

describe('sort', () => {
  it('подписи полей — точные русские названия', () => {
    expect(SORT_LABELS).toEqual({
      name: 'Блогер',
      platform: 'Площадка',
      status: 'Статус',
      date: 'Дата',
      subscribers: 'Подписчики',
      storyReach: 'Охват сторис',
      reelsViews: 'Просмотры рилс',
      cost: 'Стоимость',
      cpm: 'CPM',
    });
  });

  it('умолчание — только сама дата по возрастанию', () => {
    expect(isDefaultSort(DEFAULT_SORT)).toBe(true);
    expect(isDefaultSort({ key: 'date', dir: 'desc' })).toBe(false);
    expect(isDefaultSort({ key: 'cost', dir: 'asc' })).toBe(false);
  });
});

describe('filter', () => {
  it('слова запроса не склеиваются через границу полей', () => {
    const item = make({
      id: 1,
      name: 'xa',
      article: 'bz',
      comment: '',
      format: '',
      audienceAge: '',
      audienceGeo: '',
    });
    expect(searchText(item)).toContain('xa bz');
    expect(applyFilters([item], { ...EMPTY_FILTERS, query: 'ab' })).toEqual([]);
  });

  it('пробелы не считаются фильтром', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: ' a ' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: 'Опубликовано' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, platforms: ['VK'] })).toBe(true);
    expect(applyFilters(sample, { ...EMPTY_FILTERS, query: '  ' })).toHaveLength(4);
    expect(applyFilters(sample, { ...EMPTY_FILTERS, query: ' блогер   002 ' })).toHaveLength(1);
  });

  it('при равных значениях порядок по номеру не зависит от направления', () => {
    const items = [make({ id: 3 }), make({ id: 1 }), make({ id: 2 })]; // у всех одинаковая стоимость
    expect(sortItems(items, { key: 'cost', dir: 'asc' }).map((i) => i.id)).toEqual([1, 2, 3]);
    expect(sortItems(items, { key: 'cost', dir: 'desc' }).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('сортирует по названию площадки и по имени', () => {
    const items = [
      make({ id: 1, platform: 'YouTube', name: 'Б' }),
      make({ id: 2, platform: 'Telegram', name: 'А' }),
    ];
    expect(sortItems(items, { key: 'platform', dir: 'asc' }).map((i) => i.id)).toEqual([2, 1]);
    expect(sortItems(items, { key: 'name', dir: 'desc' }).map((i) => i.id)).toEqual([1, 2]);
  });

  it('релевантность: слово в начале токена, а не в середине', () => {
    const item = make({ id: 9, name: 'Анна', article: 'DEMO-2024' });
    expect(relevance(item, ['ан'])).toBe(3);
    expect(relevance(item, ['nna'])).toBe(1); // не в начале слова
    expect(relevance(item, ['20'])).toBe(2);
    expect(relevance(item, ['024'])).toBe(1);
  });
});

describe('dom', () => {
  it('isTyping узнаёт поля ввода, списки и редактируемые области', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(isTyping(document.createElement(tag))).toBe(true);
    }
    const editable = document.createElement('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isTyping(editable)).toBe(true);
    expect(isTyping(document.createElement('button'))).toBe(false);
    expect(isTyping(document.createElement('div'))).toBe(false);
    expect(isTyping(null)).toBe(false);
  });
});

describe('csv', () => {
  it('экранирует только ячейки, которые НАЧИНАЮТСЯ опасным символом', () => {
    expect(sanitizeCell('1+1')).toBe('1+1');
    expect(sanitizeCell('a=b')).toBe('a=b');
    expect(sanitizeCell('x-y')).toBe('x-y');
    expect(sanitizeCell('\tтаб')).toBe("'\tтаб");
    expect(sanitizeCell('\rпереход')).toBe("'\rпереход");
  });

  it('отдаёт настоящее содержимое с нужным типом и кладёт ссылку в документ на время клика', async () => {
    const blobs: Blob[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => {
        blobs.push(blob);
        return 'blob:x';
      },
      revokeObjectURL: vi.fn(),
    });
    let connected = false;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      connected = this.isConnected;
    });
    expect(downloadCsv([make({ id: 1, name: 'Иван' })], 'f.csv')).toBe(true);
    expect(connected).toBe(true);
    expect(blobs[0]?.type).toBe('text/csv;charset=utf-8');
    const text = await blobs[0]?.text();
    expect(text).toContain('Иван');
    expect(text).toContain('Блогер');
  });
});

describe('clipboard (запасной путь)', () => {
  it('выбирает временное скрытое поле и копирует из него', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    let seen: Record<string, unknown> = {};
    document.execCommand = vi.fn().mockImplementation(() => {
      const area = document.querySelector('textarea');
      seen = {
        connected: area?.isConnected,
        value: area?.value,
        readOnly: area?.readOnly,
        className: area?.className,
        selected: area ? area.selectionEnd - area.selectionStart : -1,
      };
      return true;
    });
    expect(await copyText('DEMO-777')).toBe(true);
    expect(seen).toEqual({
      connected: true,
      value: 'DEMO-777',
      readOnly: true,
      className: 'sr-only',
      selected: 'DEMO-777'.length,
    });
  });
});

describe('transition', () => {
  it('без window (сервер) анимации считаются отключёнными', () => {
    vi.stubGlobal('window', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('url-state', () => {
  it('записывает и читает все статусы, площадки и сортировки точно', () => {
    const state = parseState('?status=planned&platform=telegram,youtube&sort=cost');
    expect(state.filters.status).toBe('Запланировано');
    expect(state.filters.platforms).toEqual(['Telegram', 'YouTube']);
    expect(serializeState(state)).toBe('?status=planned&platform=telegram%2Cyoutube&sort=cost');
    expect(serializeState({ ...state, sort: { key: 'cost', dir: 'desc' } })).toContain(
      'sort=-cost',
    );
  });

  it('обрезает пробелы запроса и не склеивает ключ сортировки с минусом посередине', () => {
    const state = { ...initialState(), filters: { ...EMPTY_FILTERS, query: '  привет ' } };
    expect(serializeState(state)).toBe('?q=%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
    expect(parseState('?sort=co-st').sort).toEqual(DEFAULT_SORT);
    expect(parseState('?sort=-cost').sort).toEqual({ key: 'cost', dir: 'desc' });
    expect(parseState('?sort=cost-').sort).toEqual(DEFAULT_SORT);
  });
});

describe('load', () => {
  it('нуль допустим, а примитив вместо объекта — нет', () => {
    const row = (raw as unknown[])[0] as Record<string, unknown>;
    expect(parsePlacements([{ ...row, cost: 0, storyReach: 0 }])[0]).toMatchObject({
      cost: 0,
      storyReach: 0,
    });
    expect(() => parsePlacements([42])).toThrow('ожидался объект');
    expect(() => parsePlacements(['текст'])).toThrow('ожидался объект');
  });
});
