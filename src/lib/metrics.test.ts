import { describe, expect, it } from 'vitest';
import { make, sample } from '../test/fixtures';
import { computeMetrics, cpmOf, positionInRange } from './metrics';

describe('metrics', () => {
  it('считает CPM как в таблице: стоимость / охват × 1000', () => {
    expect(cpmOf(make({ id: 1, cost: 6300, storyReach: 3200 }))).toBeCloseTo(1968.75);
    expect(cpmOf(make({ id: 1, storyReach: 0 }))).toBe(0);
  });

  it('отделяет платный бюджет от бартера', () => {
    const metrics = computeMetrics(sample);
    expect(metrics.count).toBe(4);
    expect(metrics.paidBudget).toBe(10_000);
    expect(metrics.paidByPlatform).toEqual({ Telegram: 7_000, VK: 3_000, YouTube: 0 });
    expect(metrics.barterValue).toBe(4_000);
    expect(metrics.barterCount).toBe(1);
  });

  it('считает охват, воронку и средневзвешенный CPM', () => {
    const metrics = computeMetrics(sample);
    expect(metrics.storyReach).toBe(7_000);
    expect(metrics.resultsReceived).toBe(1);
    expect(metrics.awaitingResults).toBe(1);
    expect(metrics.avgCpm).toBeCloseTo((14_000 / 7_000) * 1000);
    expect(metrics.cpmMin).toBeCloseTo(1000);
    expect(metrics.cpmMax).toBeCloseTo(2000);
  });

  it('не падает на пустом наборе', () => {
    const metrics = computeMetrics([]);
    expect(metrics).toMatchObject({ count: 0, paidBudget: 0, avgCpm: 0, cpmMin: 0, cpmMax: 0 });
  });

  it('позиционирует значение в диапазоне', () => {
    expect(positionInRange(15, 10, 20)).toBe(0.5);
    expect(positionInRange(5, 10, 20)).toBe(0);
    expect(positionInRange(99, 10, 20)).toBe(1);
    expect(positionInRange(5, 10, 10)).toBe(0.5);
  });
});
