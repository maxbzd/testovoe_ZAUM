import type { Placement } from '../types';
import { BUDGET_TYPES, PLATFORMS, STATUSES } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const oneOf = <T extends string>(allowed: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Проверка данных при старте: сломанный JSON даст понятную ошибку, а не пустой экран. */
export function parsePlacements(input: unknown): Placement[] {
  if (!Array.isArray(input)) throw new Error('Данные должны быть списком размещений');
  return input.map((row: unknown, index): Placement => {
    const where = `Размещение #${index + 1}`;
    if (!isRecord(row)) throw new Error(`${where}: ожидался объект`);
    const text = (key: string): string => {
      const value = row[key];
      if (typeof value !== 'string') throw new Error(`${where}: поле «${key}» должно быть строкой`);
      return value;
    };
    const count = (key: string): number => {
      const value = row[key];
      if (!isCount(value)) throw new Error(`${where}: поле «${key}» должно быть числом ≥ 0`);
      return value;
    };
    const { platform, budgetType, status } = row;
    if (!oneOf(PLATFORMS, platform)) throw new Error(`${where}: неизвестная площадка`);
    if (!oneOf(BUDGET_TYPES, budgetType)) throw new Error(`${where}: неизвестная категория бюджета`);
    if (!oneOf(STATUSES, status)) throw new Error(`${where}: неизвестный статус`);

    return {
      id: count('id'),
      article: text('article'),
      name: text('name'),
      platform,
      budgetType,
      subscribers: count('subscribers'),
      audienceAge: text('audienceAge'),
      audienceGeo: text('audienceGeo'),
      storyReach: count('storyReach'),
      reelsViews: count('reelsViews'),
      cost: count('cost'),
      productCost: count('productCost'),
      format: text('format'),
      status,
      date: text('date'),
      link: text('link'),
      comment: text('comment'),
    };
  });
}
