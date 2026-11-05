import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastMessage } from '../components/Toast';

export const TOAST_MS = 2600;

/** Показывает короткое сообщение и убирает его из разметки по таймеру. */
export function useToast(): [ToastMessage | null, (text: string) => void] {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const counter = useRef(0);

  const show = useCallback((text: string) => {
    // Stryker disable next-line AssignmentOperator: нужна лишь уникальность номера, направление счёта не важно
    counter.current += 1;
    setMessage({ id: counter.current, text });
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const id = window.setTimeout(() => setMessage(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [message]);

  return [message, show];
}
