import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastTone = "ok" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  push: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId++;
      setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (m) => push(m, "ok"),
      error: (m) => push(m, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="staff-toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <div
            key={t.id}
            className={`staff-toast staff-toast-${t.tone === "error" ? "error" : t.tone === "ok" ? "ok" : "info"}`}
            role="status"
          >
            <span>{t.message}</span>
            <button
              type="button"
              className="staff-toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => undefined,
      success: () => undefined,
      error: () => undefined,
    };
  }
  return ctx;
}
