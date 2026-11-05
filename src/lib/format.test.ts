import { describe, expect, it } from 'vitest';
import {
  formatDateLong,
  formatDateRange,
  formatDateShort,
  formatInt,
  formatPercent,
  formatRub,
  parseIsoDate,
  plural,
} from './format';

describe('format', () => {
  it('форматирует числа с неразрывными пробелами', () => {
    expect(formatInt(329600)).toBe('329 600');
    expect(formatRub(6300)).toBe('6 300 ₽');
    expect(formatInt(1888.9)).toBe('1 889');
  });

  it('форматирует доли', () => {
    expect(formatPercent(0.25)).toBe('25%');
  });

  it('разбирает ISO-даты и отбрасывает несуществующие', () => {
    expect(parseIsoDate('2026-11-02')).toEqual({ year: 2026, month: 11, day: 2 });
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('02.11.2026')).toBeNull();
  });

  it('форматирует даты без сдвига часовых поясов', () => {
    expect(formatDateShort('2026-11-02')).toBe('2 ноя');
    expect(formatDateLong('2026-11-12')).toBe('12 ноября 2026, четверг');
    expect(formatDateShort('мусор')).toBe('мусор');
  });

  it('форматирует диапазон дат', () => {
    expect(formatDateRange('2026-11-02', '2026-11-25')).toBe('2–25 ноября 2026');
    expect(formatDateRange('2026-11-02', '2026-11-02')).toBe('2 ноября 2026');
    expect(formatDateRange('2026-10-28', '2026-11-25')).toContain('2026');
  });

  it('склоняет существительные', () => {
    const forms = ['размещение', 'размещения', 'размещений'] as const;
    expect(plural(1, forms)).toBe('размещение');
    expect(plural(2, forms)).toBe('размещения');
    expect(plural(5, forms)).toBe('размещений');
    expect(plural(11, forms)).toBe('размещений');
    expect(plural(21, forms)).toBe('размещение');
    expect(plural(24, forms)).toBe('размещения');
  });
});
