import { vi } from 'vitest';

/** Подменяет matchMedia: запрос считается выполненным, если его одобряет `matches`. */
export function mockMedia(matches: (query: string) => boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }),
  });
}

/** Телефон: запросы с max-width выполняются. */
export const mockCompactViewport = (compact: boolean): void =>
  mockMedia((query) => compact && query.includes('max-width'));

/** Пользователь отключил анимации в системе. */
export const mockReducedMotion = (): void =>
  mockMedia((query) => query.includes('prefers-reduced-motion'));

/** Возвращает обычное поведение: ничего не выполняется. */
export const resetMedia = (): void => mockMedia(() => false);
