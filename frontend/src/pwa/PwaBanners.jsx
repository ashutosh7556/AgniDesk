import { RefreshCw, WifiOff, X } from 'lucide-react';
import { usePwa } from './PwaContext.jsx';

/** "New version available" + "You're offline" notices, shown on every page. */
export default function PwaBanners() {
  const { needRefresh, updateApp, dismissUpdate, isOnline } = usePwa();

  return (
    <>
      {!isOnline && (
        <div role="status" className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-amber-950 shadow">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          You're offline. AgniDesk needs internet to load and save data.
        </div>
      )}

      {needRefresh && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-[65] mx-auto flex max-w-md items-center gap-3 rounded-xl bg-navy-900 px-4 py-3 text-sm text-white shadow-xl sm:left-auto sm:right-4"
        >
          <RefreshCw className="h-5 w-5 shrink-0 text-gold-400" aria-hidden="true" />
          <p className="flex-1">A new version of AgniDesk is available.</p>
          <button type="button" onClick={updateApp} className="min-h-9 rounded-lg bg-linear-to-r from-fire-600 to-flame-500 px-3 py-1.5 text-xs font-semibold">
            Update
          </button>
          <button type="button" onClick={dismissUpdate} className="rounded p-1 text-slate-400 hover:text-white" aria-label="Later">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
