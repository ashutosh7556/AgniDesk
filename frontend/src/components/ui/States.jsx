import { AlertCircle, Loader2, RotateCw } from 'lucide-react';

/** Shared loading / empty / error placeholders for lists and detail pages. */

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-flame-500" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center" role="alert">
      <AlertCircle className="h-8 w-8 text-fire-500" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-slate-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <LoadingState label="Loading AgniDesk..." />
    </div>
  );
}
