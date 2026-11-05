import { useEffect, useState } from 'react';

/**
 * Держит компонент в DOM на время анимации закрытия.
 * `mounted` — рендерить ли, `closing` — играть ли анимацию выхода.
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; closing: boolean } {
  const [phase, setPhase] = useState<'open' | 'closing' | 'closed'>(open ? 'open' : 'closed');

  // Производное состояние: меняем фазу прямо при рендере, без лишнего прохода эффекта.
  if (open && phase !== 'open') setPhase('open');
  if (!open && phase === 'open') setPhase('closing');

  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const id = window.setTimeout(() => setPhase('closed'), exitMs);
    return () => window.clearTimeout(id);
  }, [phase, exitMs]);

  return { mounted: phase !== 'closed', closing: phase === 'closing' };
}
