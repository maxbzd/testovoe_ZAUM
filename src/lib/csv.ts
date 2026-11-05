import type { Placement } from '../types';
import { cpmOf } from './metrics';

const HEADER = [
  '№',
  'Артикул',
  'Блогер',
  'Площадка',
  'Категория бюджета',
  'Подписчики',
  'Возраст аудитории',
  'Гео аудитории',
  'Охват сторис',
  'Просмотры рилс',
  'Стоимость размещения, ₽',
  'Себестоимость товара, ₽',
  'Формат рекламы',
  'Статус',
  'Дата рекламы',
  'Ссылка на рекламу',
  'Комментарий',
  'CPM, ₽',
] as const;

const DELIMITER = ';';

/**
 * Защита от CSV-инъекций: Excel и Google Sheets выполняют ячейки, начинающиеся
 * с = + - @ (а также табуляции и переноса). Такие значения помечаем апострофом.
 */
export function sanitizeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const quote = (value: string): string => `"${sanitizeCell(value).replaceAll('"', '""')}"`;

const cell = (value: string | number): string =>
  typeof value === 'number' ? String(value).replace('.', ',') : quote(value);

/** CSV под русский Excel: разделитель «;», запятая в дробях, BOM для кириллицы. */
export function toCsv(items: readonly Placement[]): string {
  const lines = items.map((item) =>
    [
      item.id,
      item.article,
      item.name,
      item.platform,
      item.budgetType,
      item.subscribers,
      item.audienceAge,
      item.audienceGeo,
      item.storyReach,
      item.reelsViews,
      item.cost,
      item.productCost,
      item.format,
      item.status,
      item.date,
      item.link,
      item.comment,
      Math.round(cpmOf(item) * 100) / 100,
    ]
      .map(cell)
      .join(DELIMITER),
  );
  return `﻿${[HEADER.map(quote).join(DELIMITER), ...lines].join('\r\n')}\r\n`;
}

/** Скачивает CSV. Возвращает false, если браузер не дал создать файл. */
export function downloadCsv(items: readonly Placement[], filename: string): boolean {
  try {
    const blob = new Blob([toCsv(items)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
