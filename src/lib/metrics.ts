import type { Platform, Placement } from '../types';
import { PLATFORMS } from '../types';

/** CPM — стоимость 1000 охвата сторис (та же формула, что и в исходной таблице). */
export const cpmOf = (item: Pick<Placement, 'cost' | 'storyReach'>): number =>
  item.storyReach > 0 ? (item.cost / item.storyReach) * 1000 : 0;

export interface Metrics {
  count: number;
  /** Деньги, которые реально платим (без бартера). */
  paidBudget: number;
  paidByPlatform: Record<Platform, number>;
  /** Оценка стоимости бартерных размещений. */
  barterValue: number;
  barterCount: number;
  storyReach: number;
  reelsViews: number;
  /** Средневзвешенный CPM по отбору. */
  avgCpm: number;
  cpmMin: number;
  cpmMax: number;
  resultsReceived: number;
  awaitingResults: number;
}

export function computeMetrics(items: readonly Placement[]): Metrics {
  const paidByPlatform = Object.fromEntries(PLATFORMS.map((p) => [p, 0])) as Record<
    Platform,
    number
  >;
  let paidBudget = 0;
  let barterValue = 0;
  let barterCount = 0;
  let storyReach = 0;
  let reelsViews = 0;
  let costTotal = 0;
  let resultsReceived = 0;
  let awaitingResults = 0;
  let cpmMin = Infinity;
  let cpmMax = -Infinity;

  for (const item of items) {
    if (item.budgetType === 'Бартер') {
      barterValue += item.cost;
      barterCount += 1;
    } else {
      paidBudget += item.cost;
      paidByPlatform[item.platform] += item.cost;
    }
    storyReach += item.storyReach;
    reelsViews += item.reelsViews;
    costTotal += item.cost;
    if (item.status === 'Результаты получены') resultsReceived += 1;
    if (item.status === 'Опубликовано') awaitingResults += 1;
    const cpm = cpmOf(item);
    if (cpm > 0) {
      cpmMin = Math.min(cpmMin, cpm);
      cpmMax = Math.max(cpmMax, cpm);
    }
  }

  return {
    count: items.length,
    paidBudget,
    paidByPlatform,
    barterValue,
    barterCount,
    storyReach,
    reelsViews,
    avgCpm: storyReach > 0 ? (costTotal / storyReach) * 1000 : 0,
    cpmMin: Number.isFinite(cpmMin) ? cpmMin : 0,
    cpmMax: Number.isFinite(cpmMax) ? cpmMax : 0,
    resultsReceived,
    awaitingResults,
  };
}

/** Где значение лежит между минимумом и максимумом, 0..1. */
export function positionInRange(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}
