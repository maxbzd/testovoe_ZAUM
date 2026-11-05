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

/** «Системная» тема — это отсутствие атрибута: решает prefers-color-scheme. */
export function applyMode(mode: Mode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
}
