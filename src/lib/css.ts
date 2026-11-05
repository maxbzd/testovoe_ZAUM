import type { CSSProperties } from 'react';

type Vars = { [name: `--${string}`]: string | number } & { viewTransitionName?: string };

/** Типизированная передача CSS-переменных в `style` (React ставит их через CSSOM — под CSP это разрешено). */
export const cssVars = (vars: Vars): CSSProperties => vars as CSSProperties;
