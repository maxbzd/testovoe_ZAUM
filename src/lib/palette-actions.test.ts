import { describe, expect, it, vi } from 'vitest';
import { buildPaletteActions } from './palette-actions';

const params = () => ({
  statusCounts: { Согласование: 2, Запланировано: 1, Опубликовано: 3, 'Результаты получены': 0 },
  selectedPlatforms: ['VK' as const],
  rowCount: 6,
  filtersActive: false,
  selectStatus: vi.fn(),
  togglePlatform: vi.fn(),
  resetFilters: vi.fn(),
  exportCsv: vi.fn(),
  setMode: vi.fn(),
});

describe('buildPaletteActions', () => {
  it('содержит виды, фильтры, экспорт и темы', () => {
    const ids = buildPaletteActions(params()).map((action) => action.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'view-all',
        'view-Согласование',
        'platform-VK',
        'export',
        'theme-dark',
      ]),
    );
    expect(ids).not.toContain('reset');
  });

  it('«Сбросить фильтры» появляется первым только при активных фильтрах', () => {
    const actions = buildPaletteActions({ ...params(), filtersActive: true });
    expect(actions[0]?.id).toBe('reset');
  });

  it('подписи фильтров отражают текущее состояние', () => {
    const actions = buildPaletteActions(params());
    expect(actions.find((a) => a.id === 'platform-VK')?.label).toBe('Убрать фильтр: VK');
    expect(actions.find((a) => a.id === 'platform-Telegram')?.label).toBe(
      'Добавить фильтр: Telegram',
    );
  });

  it('каждая команда вызывает нужное действие', () => {
    const p = params();
    const actions = buildPaletteActions({ ...p, filtersActive: true });
    const run = (id: string): void => actions.find((a) => a.id === id)?.run();

    run('view-all');
    expect(p.selectStatus).toHaveBeenLastCalledWith(null);
    run('view-Опубликовано');
    expect(p.selectStatus).toHaveBeenLastCalledWith('Опубликовано');
    run('platform-Telegram');
    expect(p.togglePlatform).toHaveBeenCalledWith('Telegram');
    run('export');
    expect(p.exportCsv).toHaveBeenCalled();
    run('theme-light');
    expect(p.setMode).toHaveBeenCalledWith('light');
    run('reset');
    expect(p.resetFilters).toHaveBeenCalled();
  });
});
