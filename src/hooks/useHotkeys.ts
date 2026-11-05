import { useEffect, type RefObject } from 'react';
import { isTyping } from '../lib/dom';

interface Options {
  searchRef: RefObject<HTMLInputElement | null>;
  onTogglePalette: () => void;
  /** Поверх что-то открыто: «/» не должен уводить фокус в поиск под ним. */
  blocked: boolean;
}

/** Глобальные клавиши: ⌘K / Ctrl+K — палитра, «/» — поиск. */
export function useHotkeys({ searchRef, onTogglePalette, blocked }: Options): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onTogglePalette();
        return;
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (blocked || isTyping(event.target)) return;
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchRef, onTogglePalette, blocked]);
}
