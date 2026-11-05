/** Детальные проверки хуков: очистка таймеров и подписок, события, пороги, аргументы. */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { make } from '../test/fixtures';
import { mockMedia, resetMedia } from '../test/media';
import { useMode } from './useAppearance';
import { useCountUp } from './useCountUp';
import { useDataScale, useDerivedData } from './useDerivedData';
import { useDialog } from './useDialog';
import { useDismiss } from './useDismiss';
import { useHotkeys } from './useHotkeys';
import { useMediaQuery } from './useMediaQuery';
import { usePresence } from './usePresence';
import { useSheetDrag } from './useSheetDrag';
import { TOAST_MS, useToast } from './useToast';
import { URL_DELAY_MS, useUrlState } from './useUrlState';
import { initialState } from '../lib/url-state';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetMedia();
  window.history.replaceState(null, '', '/');
});

describe('очистка таймеров при размонтировании', () => {
  beforeEach(() => vi.useFakeTimers());

  it('usePresence: пока открыто, таймера нет; при закрытии есть; размонтирование снимает', () => {
    const { rerender, unmount } = renderHook(({ open }) => usePresence(open, 200), {
      initialProps: { open: true },
    });
    expect(vi.getTimerCount()).toBe(0);
    rerender({ open: false });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('useToast: без сообщения таймера нет, с сообщением есть, размонтирование снимает', () => {
    const { result, unmount } = renderHook(() => useToast());
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current[1]('Готово'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(TOAST_MS).toBeGreaterThan(2000);
  });

  it('useUrlState: размонтирование отменяет отложенную запись адреса', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    const { result, unmount } = renderHook(() => useUrlState());
    act(() => result.current[1]((s) => ({ ...s, openId: 5 })));
    unmount();
    vi.advanceTimersByTime(URL_DELAY_MS * 2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('useUrlState: не пишет, если адрес уже верный, а пишет с точными аргументами', () => {
    const spy = vi.spyOn(window.history, 'replaceState');
    window.history.replaceState(null, '', '/app?x=1#h'); // для проверки сохранения пути и якоря
    spy.mockClear();
    const { result } = renderHook(() => useUrlState());
    act(() => void vi.advanceTimersByTime(URL_DELAY_MS + 1));
    expect(spy).toHaveBeenCalledTimes(1); // «?x=1» не совпадает с состоянием по умолчанию
    expect(spy).toHaveBeenLastCalledWith(null, '', '/app#h');

    spy.mockClear();
    act(() => result.current[1]((s) => ({ ...s, openId: 7 })));
    act(() => void vi.advanceTimersByTime(URL_DELAY_MS + 1));
    expect(spy).toHaveBeenLastCalledWith(null, '', '/app?open=7#h');

    spy.mockClear();
    act(() => result.current[1]((s) => ({ ...s }))); // то же состояние
    act(() => void vi.advanceTimersByTime(URL_DELAY_MS + 1));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useCountUp (детали)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.advanceTimersByTime(1000); // отсчёт времени начинается не с нуля
  });

  it('кривая замедления: на середине пути уже больше 90%, и после конца кадры не планируются', () => {
    const { result } = renderHook(() => useCountUp(100, 100, 100));
    act(() => void vi.advanceTimersByTime(50));
    // Кривая быстрее линейной (50), но к цели ещё не пришла: у 1 − 2^(−10·t) на середине около 94–97.
    expect(result.current).toBeGreaterThan(90);
    expect(result.current).toBeLessThan(99);
    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe(100);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('размонтирование отменяет запланированный кадр', () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const { unmount } = renderHook(() => useCountUp(100, 500, 500));
    act(() => void vi.advanceTimersByTime(20));
    unmount();
    expect(cancel).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useMediaQuery (подписка)', () => {
  it('подписывается на change и отписывается тем же обработчиком', () => {
    const add = vi.fn();
    const remove = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({ matches: false, addEventListener: add, removeEventListener: remove }),
    });
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 10px)'));
    expect(add).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0]?.[1]);
  });
});

describe('useSheetDrag (пороги и аргументы)', () => {
  const setup = () => {
    const sheet = document.createElement('div');
    const grip = document.createElement('div');
    const capture = vi.fn();
    grip.setPointerCapture = capture;
    const onClose = vi.fn();
    const { result } = renderHook(() => useSheetDrag({ current: sheet }, onClose));
    const ev = (y: number, timeStamp: number) =>
      ({ clientY: y, pointerId: 7, timeStamp, currentTarget: grip }) as never;
    const release = (dy: number, ms: number): boolean => {
      onClose.mockClear();
      result.current.onPointerDown(ev(0, 1000));
      result.current.onPointerMove(ev(dy, 1000 + ms / 2));
      result.current.onPointerUp(ev(dy, 1000 + ms));
      return onClose.mock.calls.length > 0;
    };
    return { sheet, capture, release, result, ev };
  };

  it('захватывает указатель, во время движения без анимации, при возврате с анимацией', () => {
    const { sheet, capture, result, ev } = setup();
    result.current.onPointerDown(ev(0, 1000));
    expect(capture).toHaveBeenCalledWith(7);
    result.current.onPointerMove(ev(20, 1010));
    expect(sheet.style.getPropertyValue('--drag')).toBe('20px');
    expect(sheet.style.getPropertyValue('--drag-transition')).toBe('none');
    result.current.onPointerUp(ev(20, 5000));
    expect(sheet.style.getPropertyValue('--drag')).toBe('0px');
    expect(sheet.style.getPropertyValue('--drag-transition')).toBe(
      'translate 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    );
  });

  it('далеко (больше 110 px) — закрывает, ровно 110 медленно — нет', () => {
    const { release } = setup();
    expect(release(111, 5000)).toBe(true);
    expect(release(110, 5000)).toBe(false);
  });

  it('рывок: больше 36 px и быстрее 0,6 px/мс — закрывает, на границах — нет', () => {
    const { release } = setup();
    expect(release(60, 99)).toBe(true); // 0,606 px/мс
    expect(release(60, 100)).toBe(false); // ровно 0,6
    expect(release(37, 10)).toBe(true);
    expect(release(36, 10)).toBe(false); // ровно 36 px
  });

  it('отмена жеста возвращает шторку с анимацией', () => {
    const { sheet, result, ev } = setup();
    result.current.onPointerDown(ev(0, 1000));
    result.current.onPointerMove(ev(50, 1010));
    result.current.onPointerCancel();
    expect(sheet.style.getPropertyValue('--drag')).toBe('0px');
    expect(sheet.style.getPropertyValue('--drag-transition')).toContain('translate');
  });
});

function Modal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, { onClose });
  return (
    <div ref={ref} role="dialog" aria-label="окно">
      <button>первая</button>
      <button>средняя</button>
      <button>последняя</button>
    </div>
  );
}

describe('useDialog (детали)', () => {
  it('фокус ставится без прокрутки страницы, при возврате тоже', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    focus.mockClear();
    const { unmount } = render(<Modal onClose={vi.fn()} />);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockClear();
    unmount();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    opener.remove();
  });

  it('Esc отменяет действие по умолчанию, но не срабатывает на уже обработанное событие', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} />);
    expect(fireEvent.keyDown(document, { key: 'Escape' })).toBe(false); // preventDefault вызван
    expect(onClose).toHaveBeenCalledTimes(1);

    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    handled.preventDefault();
    document.dispatchEvent(handled);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Tab перехватывается только на краях окна и только в нужную сторону', () => {
    render(<Modal onClose={vi.fn()} />);
    const [first, middle, last] = screen.getAllByRole('button') as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];

    first.focus();
    expect(fireEvent.keyDown(first, { key: 'Tab' })).toBe(true); // вперёд с первой — обычный переход
    expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(last).toHaveFocus();

    expect(fireEvent.keyDown(last, { key: 'Tab', shiftKey: true })).toBe(true); // назад с последней — обычный
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(first).toHaveFocus();

    middle.focus();
    expect(fireEvent.keyDown(middle, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(middle, { key: 'Tab', shiftKey: true })).toBe(true);
  });
});

function Dismissable({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onClose);
  return <div ref={ref}>меню</div>;
}

describe('useDismiss (детали)', () => {
  it('Esc не уходит дальше по цепочке, а после размонтирования слушатели сняты', () => {
    const onClose = vi.fn();
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    const { unmount } = render(<Dismissable onClose={onClose} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled(); // stopPropagation сработал

    unmount();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', outer);
  });
});

describe('useHotkeys (детали)', () => {
  const setup = (blocked = false) => {
    const input = document.createElement('input');
    document.body.append(input);
    const onToggle = vi.fn();
    renderHook(() =>
      useHotkeys({ searchRef: { current: input }, onTogglePalette: onToggle, blocked }),
    );
    return { input, onToggle };
  };
  afterEach(() => document.body.replaceChildren());

  it('⌘K и Ctrl+K (в любом регистре) переключают палитру и гасят действие браузера', () => {
    const { onToggle } = setup();
    expect(fireEvent.keyDown(document, { key: 'k', ctrlKey: true })).toBe(false);
    expect(fireEvent.keyDown(document, { key: 'K', metaKey: true })).toBe(false);
    expect(onToggle).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'k' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('«/» фокусирует поиск и гасит ввод символа; с модификаторами и другие клавиши — нет', () => {
    const { input } = setup();
    expect(fireEvent.keyDown(document.body, { key: '/' })).toBe(false);
    expect(input).toHaveFocus();

    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      input.blur();
      expect(fireEvent.keyDown(document.body, { key: '/', ...mod })).toBe(true);
      expect(input).not.toHaveFocus();
    }
    fireEvent.keyDown(document.body, { key: 'a' });
    expect(input).not.toHaveFocus();
  });

  it('при открытом окне «/» не уводит фокус', () => {
    const { input } = setup(true);
    expect(fireEvent.keyDown(document.body, { key: '/' })).toBe(true);
    expect(input).not.toHaveFocus();
  });
});

describe('useDataScale и useDerivedData (значения)', () => {
  const items = [
    make({
      id: 1,
      cost: 3000,
      storyReach: 1000,
      reelsViews: 500,
      date: '2026-11-09',
      platform: 'VK',
      status: 'Опубликовано',
    }),
    make({
      id: 2,
      cost: 1000,
      storyReach: 1000,
      reelsViews: 9000,
      date: '2026-11-02',
      status: 'Согласование',
    }),
    make({
      id: 3,
      cost: 5000,
      storyReach: 0,
      reelsViews: 100,
      date: '2026-11-05',
      platform: 'YouTube',
      status: 'Опубликовано',
    }),
  ];

  it('шкала: CPM без нулевого охвата, максимумы, диапазон по отсортированным датам', () => {
    const { result } = renderHook(() => useDataScale(items));
    expect(result.current).toMatchObject({
      cpmMin: 1000,
      cpmMax: 3000,
      maxReach: 1000,
      maxReels: 9000,
      range: '2–9 ноября 2026',
      platforms: 3,
    });
  });

  it('счётчики по статусам, площадкам и итог считаются от нужных наборов', () => {
    const state = {
      ...initialState(),
      filters: { query: '', status: 'Опубликовано' as const, platforms: ['VK' as const] },
    };
    const { result } = renderHook(() => useDerivedData(items, state));
    expect(result.current.rows.map((r) => r.id)).toEqual([1]);
    expect(result.current.rowStatusCounts).toEqual({
      Согласование: 0,
      Запланировано: 0,
      Опубликовано: 1,
      'Результаты получены': 0,
    });
    // «а что будет, если выбрать другой статус»: статус фильтра не учитывается, площадка учитывается
    expect(result.current.statusCounts).toEqual({
      Согласование: 0,
      Запланировано: 0,
      Опубликовано: 1,
      'Результаты получены': 0,
    });
    expect(result.current.statusTotal).toBe(1);
    expect(result.current.platformCounts).toEqual({ Telegram: 0, VK: 1, YouTube: 1 });
    expect(result.current.metrics.count).toBe(1);
  });
});

describe('useMode', () => {
  it('меняет текущий режим и запоминает его', () => {
    const { result } = renderHook(() => useMode());
    expect(result.current[0]).toBe('system');
    act(() => result.current[1]('dark'));
    expect(result.current[0]).toBe('dark');
    expect(window.localStorage.getItem('bloggers:theme')).toBe('dark');
    mockMedia(() => false);
  });
});
