import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast { id: number; type: ToastType; message: string; }

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return {
    toasts,
    show,
    success: useCallback((m: string) => show('success', m), [show]),
    error: useCallback((m: string) => show('error', m, 4000), [show]),
    info: useCallback((m: string) => show('info', m), [show]),
    warning: useCallback((m: string) => show('warning', m), [show]),
    dismiss,
  };
}
