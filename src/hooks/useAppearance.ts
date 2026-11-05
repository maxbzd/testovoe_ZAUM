import { useCallback, useState } from 'react';
import { applyMode, loadMode, saveMode, type Mode } from '../lib/appearance';
import { withTransition } from '../lib/transition';

export function useMode(): [Mode, (next: Mode) => void] {
  const [mode, setModeState] = useState<Mode>(loadMode);

  const setMode = useCallback((next: Mode) => {
    withTransition(() => {
      applyMode(next);
      setModeState(next);
    });
    saveMode(next);
  }, []);

  return [mode, setMode];
}
