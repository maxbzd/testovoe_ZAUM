import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/transition';

/** Плавно «досчитывает» число от текущего значения до нового. При reduced-motion — сразу итог. */
export function useCountUp(target: number, duration = 700): number {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (reduced) return undefined;
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      shown.current = from + (target - from) * eased;
      setValue(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return reduced ? target : value;
}
