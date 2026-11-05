import { readStorage, writeStorage } from './storage';

export const MODES = ['system', 'light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

export const MODE_KEY = 'bloggers:theme';
export const DEFAULT_MODE: Mode = 'system';

export const loadMode = (): Mode => {
  const stored = readStorage(MODE_KEY);
  return MODES.find((mode) => mode === stored) ?? DEFAULT_MODE;
};

export const saveMode = (mode: Mode): void => writeStorage(MODE_KEY, mode);

/** Цвет панели браузера (адресная строка на телефоне) для каждой темы. */
export const THEME_COLORS = { light: '#ffffff', dark: '#0a0a0c' } as const;

/**
 * В разметке два `theme-color` с media-запросами: они работают, пока тема системная.
 * Когда человек выбрал тему сам, оба тега получают цвет выбранной темы.
 */
function syncThemeColor(mode: Mode): void {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLORS[mode === 'system' ? own : mode];
  }
}

/** «Системная» тема — это отсутствие атрибута: решает prefers-color-scheme. */
export function applyMode(mode: Mode): void {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  syncThemeColor(mode);
}
