import { useState } from 'react';
import { Download, PlusSquare, Share } from 'lucide-react';
import Modal from '../components/ui/Modal.jsx';
import { usePwa } from './PwaContext.jsx';
import { useToast } from '../hooks/useToast.js';

/**
 * "Install app" button. Renders nothing when the app is already installed or
 * the browser can't install it.
 * - Android / Chrome / Edge: opens the browser's install dialog.
 * - iPhone / iPad (Safari has no install dialog): shows "Add to Home Screen" steps.
 * variant: 'header' (icon on phones, label on larger screens) | 'link' | 'menu'
 */
export default function InstallAppButton({ variant = 'header', className = '' }) {
  const { canInstall, hasNativePrompt, install, isIOS } = usePwa();
  const toast = useToast();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await install();
      if (outcome === 'accepted') toast.success('AgniDesk is being installed.');
    } else if (isIOS) {
      setShowIOSHelp(true);
    }
  };

  const styles = {
    header: 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50',
    link: 'inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-flame-600 hover:text-fire-600',
    menu: 'flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50',
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={`${styles[variant]} ${className}`} aria-label="Install AgniDesk app">
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className={variant === 'header' ? 'hidden sm:inline' : ''}>Install app</span>
      </button>

      <Modal isOpen={showIOSHelp} onClose={() => setShowIOSHelp(false)} title="Install AgniDesk on iPhone / iPad" size="sm">
        <ol className="space-y-4 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flame-50 font-semibold text-flame-600">1</span>
            <span>
              Open this page in <strong>Safari</strong>, then tap the <strong>Share</strong> button
              <Share className="mx-1 inline h-4 w-4 align-text-bottom" aria-label="Share icon" />
              at the bottom of the screen.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flame-50 font-semibold text-flame-600">2</span>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>
              <PlusSquare className="mx-1 inline h-4 w-4 align-text-bottom" aria-label="Add icon" />.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-flame-50 font-semibold text-flame-600">3</span>
            <span>Tap <strong>Add</strong>. AgniDesk appears on your home screen and opens like an app.</span>
          </li>
        </ol>
      </Modal>
    </>
  );
}
