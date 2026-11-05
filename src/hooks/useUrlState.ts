import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { parseState, serializeState, type AppState } from '../lib/url-state';

export const URL_DELAY_MS = 200;

/** Состояние экрана, которое живёт в адресной строке: ссылкой можно поделиться. */
export function useUrlState(): [AppState, Dispatch<SetStateAction<AppState>>] {
  const [state, setState] = useState<AppState>(() => parseState(window.location.search));

  // Пишем в адрес не чаще раза в URL_DELAY_MS: Safari бросает ошибку после 100 вызовов
  // replaceState за 30 секунд, а набор текста и листание клавишей дают их десятки в секунду.
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const next = serializeState(state);
        if (next !== window.location.search) {
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${next}${window.location.hash}`,
          );
        }
      } catch {
        /* адресная строка недоступна (iframe, file://) — состояние просто не попадёт в ссылку */
      }
    }, URL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [state]);

  return [state, setState];
}
