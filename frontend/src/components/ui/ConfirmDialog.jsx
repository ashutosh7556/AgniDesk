import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

/** Confirmation for destructive actions (e.g. delete). */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={isProcessing}>
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fire-50 text-fire-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </Modal>
  );
}
