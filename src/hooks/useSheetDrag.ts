import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

/**
 * Шторку можно смахнуть вниз за ручку. Закрывается, если потянули достаточно далеко
 * или быстро; иначе пружинит обратно.
 */
export function useSheetDrag(sheet: RefObject<HTMLElement | null>, onClose: () => void) {
  const drag = useRef<{ startY: number; dy: number; startT: number } | null>(null);

  const set = (value: number, animate: boolean): void => {
    const el = sheet.current;
    if (!el) return;
    el.style.setProperty('--drag', `${value}px`);
    el.style.setProperty(
      '--drag-transition',
      animate ? 'translate 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
    );
  };

  return {
    onPointerDown(event: ReactPointerEvent<HTMLElement>): void {
      drag.current = { startY: event.clientY, dy: 0, startT: event.timeStamp };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>): void {
      const state = drag.current;
      if (!state) return;
      state.dy = Math.max(0, event.clientY - state.startY);
      set(state.dy, false);
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>): void {
      const state = drag.current;
      drag.current = null;
      if (!state) return;
      const speed = state.dy / Math.max(1, event.timeStamp - state.startT);
      if (state.dy > 110 || (state.dy > 36 && speed > 0.6)) onClose();
      else set(0, true);
    },
    onPointerCancel(): void {
      drag.current = null;
      set(0, true);
    },
  };
}
