import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDialog } from './useDialog';
import { useSheetDrag } from './useSheetDrag';

function Sheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useSheetDrag(ref, onClose);
  return (
    <div ref={ref} data-testid="sheet">
      <div data-testid="grip" {...drag} />
    </div>
  );
}

const drag = (from: number, to: number): void => {
  const grip = screen.getByTestId('grip');
  grip.setPointerCapture = vi.fn();
  fireEvent.pointerDown(grip, { clientY: from, pointerId: 1 });
  fireEvent.pointerMove(grip, { clientY: to, pointerId: 1 });
  fireEvent.pointerUp(grip, { clientY: to, pointerId: 1 });
};

describe('useSheetDrag', () => {
  it('закрывает шторку, если её потянули достаточно далеко', () => {
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    drag(100, 300);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('следует за пальцем и пружинит обратно при малом сдвиге', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Sheet onClose={onClose} />);
    const sheet = screen.getByTestId('sheet');
    const grip = screen.getByTestId('grip');
    grip.setPointerCapture = vi.fn();

    fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientY: 120, pointerId: 1 });
    expect(sheet.style.getPropertyValue('--drag')).toBe('20px');

    vi.advanceTimersByTime(500); // палец «задержался»: скорость мала
    fireEvent.pointerUp(grip, { clientY: 120, pointerId: 1 });
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet.style.getPropertyValue('--drag')).toBe('0px');
    vi.useRealTimers();
  });

  it('не уходит вверх от начальной точки', () => {
    render(<Sheet onClose={vi.fn()} />);
    const grip = screen.getByTestId('grip');
    grip.setPointerCapture = vi.fn();
    fireEvent.pointerDown(grip, { clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientY: 50, pointerId: 1 });
    expect(screen.getByTestId('sheet').style.getPropertyValue('--drag')).toBe('0px');
  });
});

function Dialog({ onClose, suspended = false }: { onClose: () => void; suspended?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(ref, { onClose, suspended });
  return (
    <div ref={ref} role="dialog" aria-label="окно">
      <button>первая</button>
      <button>последняя</button>
    </div>
  );
}

describe('useDialog', () => {
  it('ставит фокус внутрь и возвращает его при закрытии', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(<Dialog onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'первая' })).toHaveFocus();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('Tab ходит по кругу, Shift+Tab — в обратную сторону', async () => {
    const user = userEvent.setup();
    render(<Dialog onClose={vi.fn()} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'последняя' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'первая' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'последняя' })).toHaveFocus();
  });

  it('Esc закрывает, а в приостановленном состоянии молчит', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<Dialog onClose={onClose} suspended />);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    rerender(<Dialog onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
