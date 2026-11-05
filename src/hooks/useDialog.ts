import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { FOCUSABLE } from '../lib/dom';

interface Options {
  onClose: () => void;
  /** Куда поставить фокус при открытии; по умолчанию — первый доступный элемент. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Поверх открылось что-то ещё: диалог временно не слушает клавиатуру. */
  suspended?: boolean;
}

/**
 * Поведение модального окна: фокус внутрь при открытии и обратно при закрытии,
 * Tab ходит по кругу, Esc закрывает.
 */
export function useDialog(root: RefObject<HTMLElement | null>, options: Options): void {
  const { onClose, initialFocus, suspended = false } = options;

  // Синхронный эффект: фокус возвращается в том же кадре, что и закрытие, без «провала» на body.
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Эффект выполняется после монтирования: корневой элемент уже существует.
    const first = (root.current as HTMLElement).querySelector<HTMLElement>(FOCUSABLE);
    (initialFocus?.current ?? first)?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [root, initialFocus]);

  useEffect(() => {
    if (suspended) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      // Слушатель снимается при размонтировании, поэтому корень здесь всегда есть.
      const nodes = (root.current as HTMLElement).querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [root, onClose, suspended]);
}
