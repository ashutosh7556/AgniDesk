import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 3500;

const TONES = {
  success: { icon: CheckCircle2, classes: 'border-emerald-200 text-emerald-800', iconClass: 'text-emerald-600' },
  error: { icon: AlertCircle, classes: 'border-fire-200 text-fire-700', iconClass: 'text-fire-600' },
};

/** Minimal toast notifications for save/delete feedback. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, tone = 'success') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({ success: (msg) => show(msg, 'success'), error: (msg) => show(msg, 'error') }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto" aria-live="polite">
        {toasts.map((toast) => {
          const tone = TONES[toast.tone];
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg ${tone.classes}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClass}`} aria-hidden="true" />
              <p className="flex-1 font-medium">{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
