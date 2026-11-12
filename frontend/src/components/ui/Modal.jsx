import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible dialog: Escape and backdrop close it, body scroll is locked,
 * focus moves into the dialog on open and returns to the trigger on close.
 */
export default function Modal({ isOpen, onClose, title, description, children, footer, size = 'md' }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusTarget = panelRef.current?.querySelector('input, select, textarea, button:not([data-close])');
    (focusTarget ?? panelRef.current)?.focus();

    const handleKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full ${width} flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-navy-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" data-close onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
