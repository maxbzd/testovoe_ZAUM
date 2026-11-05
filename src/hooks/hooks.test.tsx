import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from './usePresence';
import { useToast, TOAST_MS } from './useToast';
import { URL_DELAY_MS, useUrlState } from './useUrlState';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('usePresence', () => {
  it('держит компонент на время анимации выхода', () => {
    const { result, rerender } = renderHook(({ open }) => usePresence(open, 200), {
      initialProps: { open: true },
    });
    expect(result.current).toEqual({ mounted: true, closing: false });

    rerender({ open: false });
    expect(result.current).toEqual({ mounted: true, closing: true });

    act(() => void vi.advanceTimersByTime(199));
    expect(result.current.mounted).toBe(true);
    act(() => void vi.advanceTimersByTime(2));
    expect(result.current).toEqual({ mounted: false, closing: false });
  });

  it('открытие во время закрытия отменяет выход', () => {
    const { result, rerender } = renderHook(({ open }) => usePresence(open, 200), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    rerender({ open: true });
    act(() => void vi.advanceTimersByTime(500));
    expect(result.current).toEqual({ mounted: true, closing: false });
  });
});

describe('useToast', () => {
  it('показывает сообщение и убирает по таймеру', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current[1]('Готово'));
    expect(result.current[0]?.text).toBe('Готово');
    act(() => void vi.advanceTimersByTime(TOAST_MS + 1));
    expect(result.current[0]).toBeNull();
  });

  it('одинаковые сообщения подряд получают разные id', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current[1]('Готово'));
    const first = result.current[0]?.id;
    act(() => result.current[1]('Готово'));
    expect(result.current[0]?.id).not.toBe(first);
  });
});

describe('useUrlState', () => {
  it('пишет адрес не сразу, а одним вызовом после серии изменений', () => {
    window.history.replaceState(null, '', '/');
    const spy = vi.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useUrlState());

    act(() => {
      for (let i = 1; i <= 30; i += 1) {
        result.current[1]((s) => ({ ...s, openId: i }));
      }
    });
    expect(spy).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(URL_DELAY_MS + 1));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('?open=30');
    spy.mockRestore();
  });

  it('не падает, если адресная строка недоступна', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const { result } = renderHook(() => useUrlState());
    act(() => result.current[1]((s) => ({ ...s, openId: 5 })));
    expect(() => act(() => void vi.advanceTimersByTime(URL_DELAY_MS + 1))).not.toThrow();
    spy.mockRestore();
  });
});
