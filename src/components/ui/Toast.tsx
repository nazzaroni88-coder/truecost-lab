import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
}
interface ToastApi {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const toast = useCallback((message: string) => {
    const id = ++counter.current;
    setItems((prev) => [...prev.slice(-2), { id, message }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);
  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-host" aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
