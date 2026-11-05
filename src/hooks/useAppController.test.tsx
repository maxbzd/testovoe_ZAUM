import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sample, make } from '../test/fixtures';
import { mockCompactViewport, mockReducedMotion, resetMedia } from '../test/media';
import { DRAWER_EXIT_MS, useAppController } from './useAppController';

const setup = (placements = sample) => renderHook(() => useAppController(placements));

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetMedia();
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  document.documentElement.classList.remove('is-locked');
});

describe('useAppController: данные', () => {
  it('подпись под заголовком: количество, площадки, период', () => {
    expect(setup().result.current.subtitle).toBe('4 размещения · 3 площадки · 1–4 ноября 2026');
    expect(setup([make({ id: 1, date: '2026-11-02' })]).result.current.subtitle).toBe(
      '1 размещение · 1 площадка · 2 ноября 2026',
    );
    expect(setup([]).result.current.subtitle).toBe('0 размещений · 0 площадок');
  });

  it('вначале ничего не открыто и страница не заблокирована', () => {
    const { result } = setup();
    expect(result.current.overlayOpen).toBe(false);
    expect(result.current.drawer.item).toBeNull();
    expect(result.current.palette.open).toBe(false);
    expect(result.current.sheet.open).toBe(false);
    expect(document.documentElement.classList.contains('is-locked')).toBe(false);
    expect(result.current.compact).toBe(false);
  });
});

describe('useAppController: карточка', () => {
  beforeEach(() => vi.useFakeTimers());

  it('открывается на первой строке отбора и закрывается с задержкой на анимацию', () => {
    const { result } = setup();
    act(() => result.current.openPlacement(2)); // по дате первая строка
    expect(result.current.drawer).toMatchObject({
      closing: false,
      suspended: false,
      position: { index: 0, total: 4 },
    });
    expect(result.current.drawer.item?.id).toBe(2);
    expect(result.current.overlayOpen).toBe(true);
    expect(document.documentElement.classList.contains('is-locked')).toBe(true);

    act(() => result.current.drawer.onClose());
    expect(result.current.drawer.closing).toBe(true);
    expect(result.current.drawer.item?.id).toBe(2); // ещё на экране: играет анимация
    act(() => void vi.advanceTimersByTime(DRAWER_EXIT_MS - 1));
    expect(result.current.drawer.item).not.toBeNull();
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.drawer.item).toBeNull();
    expect(result.current.overlayOpen).toBe(false);
    expect(document.documentElement.classList.contains('is-locked')).toBe(false);
  });

  it('повторное закрытие во время анимации не обрывает её', () => {
    const { result } = setup();
    act(() => result.current.openPlacement(2));
    act(() => result.current.drawer.onClose());
    act(() => result.current.drawer.onClose()); // например, второй Esc
    act(() => void vi.advanceTimersByTime(DRAWER_EXIT_MS - 1));
    expect(result.current.drawer.item?.id).toBe(2);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.drawer.item).toBeNull();
  });

  it('при отключённых анимациях исчезает сразу', () => {
    mockReducedMotion();
    const { result } = setup();
    act(() => result.current.openPlacement(3));
    act(() => result.current.drawer.onClose());
    act(() => void vi.advanceTimersByTime(0));
    expect(result.current.drawer.item).toBeNull();
  });

  it('размонтирование во время выхода снимает все таймеры', () => {
    const { result, unmount } = setup();
    act(() => result.current.openPlacement(3));
    act(() => result.current.drawer.onClose());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('листается по кругу вперёд и назад, а для скрытого фильтром блогера — нет', () => {
    const { result } = setup();
    act(() => result.current.openPlacement(4)); // последняя по дате
    act(() => result.current.drawer.onStep(1));
    expect(result.current.drawer.item?.id).toBe(2); // по кругу
    act(() => result.current.drawer.onStep(-1));
    expect(result.current.drawer.item?.id).toBe(4);

    act(() => result.current.selectStatus('Согласование')); // блогера 4 (Запланировано) в отборе нет
    expect(result.current.drawer.position).toBeNull();
    act(() => result.current.drawer.onStep(1));
    expect(result.current.drawer.item?.id).toBe(4);
  });

  it('номер, которого нет в данных, карточку не открывает', () => {
    const { result } = setup();
    act(() => result.current.openPlacement(999));
    expect(result.current.drawer.item).toBeNull();
  });
});

describe('useAppController: палитра и шторка', () => {
  it('палитра открывается кнопкой и ⌘K, блокирует страницу и усыпляет карточку', () => {
    const { result } = setup();
    act(() => result.current.openPalette());
    expect(result.current.palette.open).toBe(true);
    expect(result.current.overlayOpen).toBe(true);
    act(() => result.current.palette.onClose());
    expect(result.current.palette.open).toBe(false);
    expect(result.current.overlayOpen).toBe(false);

    act(() => void fireEvent.keyDown(document, { key: 'k', ctrlKey: true }));
    expect(result.current.palette.open).toBe(true);
    act(() => void fireEvent.keyDown(document, { key: 'k', ctrlKey: true }));
    expect(result.current.palette.open).toBe(false);

    act(() => result.current.openPlacement(2));
    expect(result.current.drawer.suspended).toBe(false);
    act(() => result.current.openPalette());
    expect(result.current.drawer.suspended).toBe(true);
  });

  it('шторка фильтров существует только на телефоне', () => {
    const desktop = setup();
    act(() => desktop.result.current.openFilters());
    expect(desktop.result.current.sheet.open).toBe(false);
    expect(desktop.result.current.overlayOpen).toBe(false);

    mockCompactViewport(true);
    const phone = setup();
    expect(phone.result.current.compact).toBe(true);
    act(() => phone.result.current.openFilters());
    expect(phone.result.current.sheet.open).toBe(true);
    expect(phone.result.current.overlayOpen).toBe(true);
    act(() => phone.result.current.openPlacement(2));
    expect(phone.result.current.drawer.suspended).toBe(true);
    act(() => phone.result.current.sheet.onClose());
    expect(phone.result.current.sheet.open).toBe(false);
    expect(phone.result.current.drawer.suspended).toBe(false);
  });
});

describe('useAppController: фильтры и сортировка', () => {
  it('статус, площадки, запрос, сброс', () => {
    const { result } = setup();
    act(() => result.current.selectStatus('Опубликовано'));
    expect(result.current.state.filters.status).toBe('Опубликовано');

    act(() => result.current.togglePlatform('VK'));
    act(() => result.current.togglePlatform('Telegram'));
    expect(result.current.state.filters.platforms).toEqual(['VK', 'Telegram']);
    act(() => result.current.togglePlatform('VK')); // снять одну, другая остаётся
    expect(result.current.state.filters.platforms).toEqual(['Telegram']);
    act(() => result.current.clearPlatforms());
    expect(result.current.state.filters.platforms).toEqual([]);

    act(() => result.current.setQuery('блогер'));
    expect(result.current.state.filters.query).toBe('блогер');
    expect(result.current.filtersActive).toBe(true);
    act(() => result.current.resetFilters());
    expect(result.current.state.filters).toEqual({ query: '', status: null, platforms: [] });
    expect(result.current.filtersActive).toBe(false);
  });

  it('сортировка: новое поле берёт направление по умолчанию, то же поле переворачивается', () => {
    const { result } = setup();
    act(() => result.current.sortBy('cost'));
    expect(result.current.state.sort).toEqual({ key: 'cost', dir: 'desc' });
    act(() => result.current.sortBy('cost'));
    expect(result.current.state.sort).toEqual({ key: 'cost', dir: 'asc' });
    act(() => result.current.sortBy('name'));
    expect(result.current.state.sort).toEqual({ key: 'name', dir: 'asc' });
    act(() => result.current.setSort({ key: 'cpm', dir: 'asc' }));
    expect(result.current.state.sort).toEqual({ key: 'cpm', dir: 'asc' });
  });

  it('значок на кнопке фильтров считает площадки и нестандартную сортировку', () => {
    const { result } = setup();
    expect(result.current.activeFilterCount).toBe(0);
    act(() => result.current.togglePlatform('VK'));
    expect(result.current.activeFilterCount).toBe(1);
    act(() => result.current.sortBy('cost'));
    expect(result.current.activeFilterCount).toBe(2);
  });

  it('плавный переход включён по умолчанию и выключается явным false', () => {
    const start = vi.fn((update: () => void) => update());
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    const { result } = setup();
    const calls = (): number => start.mock.calls.length;

    act(() => result.current.selectStatus('Опубликовано'));
    expect(calls()).toBe(1);
    act(() => result.current.togglePlatform('VK'));
    expect(calls()).toBe(2);
    act(() => result.current.togglePlatform('Telegram', false));
    expect(calls()).toBe(2);
    act(() => result.current.setSort({ key: 'cost', dir: 'asc' }));
    expect(calls()).toBe(3);
    act(() => result.current.setSort({ key: 'cost', dir: 'desc' }, false));
    expect(calls()).toBe(3);
    act(() => result.current.sortBy('name'));
    expect(calls()).toBe(4);
    act(() => result.current.clearPlatforms());
    expect(calls()).toBe(5);
    act(() => result.current.resetFilters(false));
    expect(calls()).toBe(5);
    act(() => result.current.resetFilters());
    expect(calls()).toBe(6);
  });
});

describe('useAppController: вступительная анимация', () => {
  beforeEach(() => vi.useFakeTimers());

  it('включена вначале и выключается через 1,4 секунды', () => {
    const { result } = setup();
    expect(result.current.intro).toBe(true);
    act(() => void vi.advanceTimersByTime(1399));
    expect(result.current.intro).toBe(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.intro).toBe(false);
  });

  it('размонтирование снимает таймер', () => {
    const { unmount } = setup();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
