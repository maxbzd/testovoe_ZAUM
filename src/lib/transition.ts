import { flushSync } from 'react-dom';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Обновляет состояние внутри View Transition: браузер сам плавно «переезжает»
 * строки, карточки и цвета. Где API нет (или анимации отключены) — обычное обновление.
 */
export function withTransition(update: () => void): void {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  document.startViewTransition(() => {
    flushSync(update);
  });
}
