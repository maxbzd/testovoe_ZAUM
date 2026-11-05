import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { make } from '../test/fixtures';
import { mockReducedMotion, resetMedia } from '../test/media';
import { useCountUp } from './useCountUp';
import { useDataScale } from './useDerivedData';
import { useDialog } from './useDialog';
import { useDismiss } from './useDismiss';
import { useHotkeys } from './useHotkeys';
import { useMediaQuery } from './useMediaQuery';
import { useSheetDrag } from './useSheetDrag';

afterEach(() => {
  vi.useRealTimers();
  resetMedia();
});

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  it('разгоняется от нуля до значения, затем обновляется быстрее', () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 100, 40), {
      initialProps: { target: 100 },
    });
    expect(result.current).toBe(0);
    act(() => void vi.advanceTimersByTime(60));
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toBe(100);

    rerender({ target: 300 });
    act(() => void vi.advanceTimersByTime(60));
    expect(result.current).toBe(300);
  });

  it('при отключённых анимациях сразу показывает итог', () => {
    mockReducedMotion();
    const { result } = renderHook(() => useCountUp(250));
    expect(result.current).toBe(250);
  });
});

describe('useDataScale', () => {
  it('на пустых данных не падает и даёт нули', () => {
    const { result } = renderHook(() => useDataScale([]));
    expect(result.current).toMatchObject({
      cpmMin: 0,
      cpmMax: 0,
      maxReach: 0,
      range: '',
      platforms: 0,
    });
  });

  it('считает диапазоны по данным', () => {
    const { result } = renderHook(() =>
      useDataScale([
        make({ id: 1, cost: 2000, storyReach: 1000, date: '2026-11-02' }),
        make({ id: 2, cost: 3000, storyReach: 1000, date: '2026-11-09', platform: 'VK' }),
      ]),
    );
    expect(result.current).toMatchObject({
      cpmMin: 2000,
      cpmMax: 3000,
      platforms: 2,
      range: '2–9 ноября 2026',
    });
  });
});

function Dismissable({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, onClose);
  return (
    <div>
      <div ref={ref}>
        <button>внутри</button>
      </div>
      <button>снаружи</button>
    </div>
  );
}

describe('useDismiss', () => {
  it('закрывает по клику снаружи и по Esc, но не по клику внутри', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dismissable open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'внутри' }));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'снаружи' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
    await user.keyboard('a');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('в закрытом состоянии ничего не слушает', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dismissable open={false} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'снаружи' }));
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('без привязанного элемента клики не считаются «снаружи»', () => {
    const onClose = vi.fn();
    renderHook(() => useDismiss({ current: null }, true, onClose));
    fireEvent.pointerDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });
});

function Keys({
  blocked,
  onToggle,
  searchRef,
}: {
  blocked: boolean;
  onToggle: () => void;
  searchRef: { current: HTMLInputElement | null };
}) {
  useHotkeys({ searchRef, onTogglePalette: onToggle, blocked });
  return <input aria-label="поле" ref={(el) => void (searchRef.current = el)} />;
}

describe('useHotkeys', () => {
  it('«/» фокусирует поиск, ⌘K переключает палитру', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Keys blocked={false} onToggle={onToggle} searchRef={{ current: null }} />);
    await user.keyboard('/');
    expect(screen.getByLabelText('поле')).toHaveFocus();
    await user.keyboard('{Control>}k{/Control}');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('«/» не срабатывает при вводе текста и когда поверх что-то открыто', async () => {
    const user = userEvent.setup();
    const ref = { current: null as HTMLInputElement | null };
    const { rerender } = render(<Keys blocked={false} onToggle={vi.fn()} searchRef={ref} />);
    await user.click(screen.getByLabelText('поле'));
    await user.keyboard('/');
    expect(screen.getByLabelText('поле')).toHaveValue('/'); // символ напечатан, а не перехвачен

    (document.activeElement as HTMLElement).blur();
    rerender(<Keys blocked onToggle={vi.fn()} searchRef={ref} />);
    await user.keyboard('/');
    expect(screen.getByLabelText('поле')).not.toHaveFocus();
  });
});

describe('useMediaQuery', () => {
  it('на сервере возвращает false', () => {
    function Probe() {
      return <p>{String(useMediaQuery('(max-width: 10px)'))}</p>;
    }
    expect(renderToString(<Probe />)).toContain('false');
  });
});

describe('useSheetDrag (крайние случаи)', () => {
  const setup = (onClose = vi.fn()) => {
    const sheet = document.createElement('div');
    const grip = document.createElement('div');
    grip.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useSheetDrag({ current: sheet }, onClose));
    const make = (_type: string, y: number, timeStamp = 0) =>
      ({ clientY: y, pointerId: 1, timeStamp, currentTarget: grip }) as never;
    return { sheet, result, make, onClose };
  };

  it('быстрый короткий рывок вниз закрывает шторку', () => {
    const { result, make, onClose } = setup();
    result.current.onPointerDown(make('down', 0));
    result.current.onPointerMove(make('move', 60));
    result.current.onPointerUp(make('up', 60, 20));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('медленный короткий сдвиг шторку не закрывает', () => {
    const { result, make, onClose, sheet } = setup();
    result.current.onPointerDown(make('down', 0));
    result.current.onPointerMove(make('move', 60));
    result.current.onPointerUp(make('up', 60, 2000));
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet.style.getPropertyValue('--drag')).toBe('0px');
  });

  it('движение и отпускание без нажатия игнорируются, отмена возвращает шторку', () => {
    const { result, make, onClose, sheet } = setup();
    result.current.onPointerMove(make('move', 80));
    result.current.onPointerUp(make('up', 80));
    expect(sheet.style.getPropertyValue('--drag')).toBe('');
    result.current.onPointerDown(make('down', 0));
    result.current.onPointerMove(make('move', 30));
    result.current.onPointerCancel();
    expect(sheet.style.getPropertyValue('--drag')).toBe('0px');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('без элемента шторки ничего не ломает', () => {
    const onClose = vi.fn();
    const grip = document.createElement('div');
    grip.setPointerCapture = vi.fn();
    const { result } = renderHook(() => useSheetDrag({ current: null }, onClose));
    const event = { clientY: 0, pointerId: 1, timeStamp: 0, currentTarget: grip } as never;
    expect(() => {
      result.current.onPointerDown(event);
      result.current.onPointerMove({ ...(event as object), clientY: 50 } as never);
      result.current.onPointerCancel();
    }).not.toThrow();
  });
});

function Modal({ initialFocusMissing = false }: { initialFocusMissing?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const missing = useRef<HTMLButtonElement>(null);
  useDialog(ref, { onClose: vi.fn(), ...(initialFocusMissing ? { initialFocus: missing } : {}) });
  return (
    <div ref={ref} role="dialog" aria-label="окно">
      <button>единственная</button>
    </div>
  );
}

function EmptyModal() {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, { onClose: vi.fn() });
  return <div ref={ref} role="dialog" aria-label="пустое" />;
}

describe('useDialog (крайние случаи)', () => {
  it('если запрошенного элемента для фокуса нет, берёт первый доступный', () => {
    render(<Modal initialFocusMissing />);
    expect(screen.getByRole('button', { name: 'единственная' })).toHaveFocus();
  });

  it('Tab в окне без интерактивных элементов ничего не делает', async () => {
    const user = userEvent.setup();
    render(<EmptyModal />);
    await expect(user.tab()).resolves.not.toThrow();
  });

  it('не пытается вернуть фокус элементу, который не HTML (например, SVG)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('tabindex', '0');
    document.body.append(svg);
    (svg as unknown as HTMLElement).focus();
    const { unmount } = render(<Modal />);
    expect(() => unmount()).not.toThrow();
    svg.remove();
  });
});
