import { describe, expect, it } from 'vitest';
import { make } from '../test/fixtures';
import { sanitizeCell, toCsv } from './csv';

describe('csv', () => {
  it('защищает от формул', () => {
    expect(sanitizeCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(sanitizeCell('+7 999')).toBe("'+7 999");
    expect(sanitizeCell('-1')).toBe("'-1");
    expect(sanitizeCell('@cmd')).toBe("'@cmd");
    expect(sanitizeCell('обычный текст')).toBe('обычный текст');
  });

  it('пишет BOM, заголовок и разделитель «;»', () => {
    const csv = toCsv([make({ id: 1 })]);
    expect(csv.startsWith('﻿"№";"Артикул"')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(3); // заголовок, строка, пустой хвост
  });

  it('экранирует кавычки и обезвреживает опасные поля', () => {
    const csv = toCsv([make({ id: 1, name: 'Иван "Ваня"', comment: '=HYPERLINK("x")' })]);
    expect(csv).toContain('"Иван ""Ваня"""');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('числа пишет числами, CPM с десятичной запятой', () => {
    const csv = toCsv([make({ id: 1, cost: 6300, storyReach: 3200 })]);
    expect(csv).toContain(';6300;');
    expect(csv.trimEnd().endsWith(';1968,75')).toBe(true);
  });
});
