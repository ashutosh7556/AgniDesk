import { useState } from 'react';
import { KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import SectionCard from '../ui/SectionCard.jsx';
import Modal from '../ui/Modal.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { TextField } from '../ui/FormControls.jsx';
import { ErrorState, LoadingState } from '../ui/States.jsx';
import { createUser, deleteUser, listUsers, resetUserPassword } from '../../services/settingsService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate } from '../../utils/format.js';

function validatePassword(password, confirm) {
  const errors = {};
  if (password.length < 8) errors.password = 'At least 8 characters.';
  if (confirm !== password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

function AddUserModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const set = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = validatePassword(form.password, form.confirmPassword);
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSaving(true);
    try {
      const { user } = await createUser({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      toast.success(`${user.name} can now log in with ${user.email}.`);
      onSaved();
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={isSaving ? () => {} : onClose}
      title="Add admin"
      description="They log in with this email and temporary password, then change it under Profile & Password."
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" form="add-user-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add admin
          </button>
        </>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField label="Name" name="name" value={form.name} onChange={set} error={errors.name} required maxLength={100} autoComplete="off" />
        <TextField label="Login email" name="email" type="email" value={form.email} onChange={set} error={errors.email} required maxLength={150} autoComplete="off" />
        <TextField label="Temporary password" name="password" type="password" value={form.password} onChange={set} error={errors.password} required autoComplete="new-password" hint="At least 8 characters." />
        <TextField label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={set} error={errors.confirmPassword} required autoComplete="new-password" />
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const set = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = validatePassword(form.password, form.confirmPassword);
    setErrors(next);
    if (Object.keys(next).length) return;
    setIsSaving(true);
    try {
      await resetUserPassword(user.id, form.password);
      toast.success(`Password reset for ${user.name}. They have been signed out everywhere.`);
      onClose();
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={isSaving ? () => {} : onClose}
      title="Reset password"
      description={`${user.name} · ${user.email}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" form="reset-user-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Reset password
          </button>
        </>
      }
    >
      <form id="reset-user-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField label="New password" name="password" type="password" value={form.password} onChange={set} error={errors.password} required autoComplete="new-password" hint="Share it with them privately." />
        <TextField label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={set} error={errors.confirmPassword} required autoComplete="new-password" />
      </form>
    </Modal>
  );
}

/** Settings > Users: list, add, reset password, remove admins. */
export default function UserManagement() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [modal, setModal] = useState(null); // { type: 'add' } | { type: 'reset', user } | null
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, error, isLoading, reload } = useFetch((signal) => listUsers(signal), []);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      toast.success(`${userToDelete.name} removed. They can no longer log in.`);
      setUserToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const atLimit = data && data.users.length >= data.maxAdmins;

  return (
    <SectionCard
      title="Admin users"
      subtitle={data ? `${data.users.length} of ${data.maxAdmins} admins · every admin has full access` : 'People who can log in to AgniDesk'}
      action={
        <button type="button" className="btn-primary min-h-9 px-3! py-1.5! text-xs" onClick={() => setModal({ type: 'add' })} disabled={!data || atLimit} title={atLimit ? `Maximum ${data.maxAdmins} admins` : undefined}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add admin
        </button>
      }
    >
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {isLoading && !data && <LoadingState />}
      {data && (
        <>
          <ul className="-mx-5 -my-5 divide-y divide-slate-100">
            {data.users.map((u) => {
              const isMe = u.id === me?.id;
              return (
                <li key={u.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
                      {u.role === 'owner' ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : <UserRound className="h-5 w-5" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                        {u.name}
                        {isMe && <span className="rounded-full bg-flame-50 px-2 py-0.5 text-[11px] font-semibold text-flame-600 ring-1 ring-inset ring-flame-100">You</span>}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">{u.role}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">{u.email}{u.createdAt && ` · added ${formatDate(u.createdAt)}`}</p>
                    </div>
                  </div>
                  {!isMe && (
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary min-h-9 px-3! py-1.5! text-xs" onClick={() => setModal({ type: 'reset', user: u })}>
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Reset password
                      </button>
                      <button type="button" className="btn-secondary min-h-9 px-3! py-1.5! text-xs text-fire-600! hover:bg-fire-50!" onClick={() => setUserToDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {atLimit && <p className="mt-8 text-xs text-slate-500">Maximum of {data.maxAdmins} admins reached. Remove one to add another (limit set by MAX_ADMINS in backend/.env).</p>}
        </>
      )}

      {modal?.type === 'add' && <AddUserModal onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} />}
      {modal?.type === 'reset' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Remove admin?"
        message={userToDelete && <><strong className="text-slate-800">{userToDelete.name}</strong> ({userToDelete.email}) will no longer be able to log in. Any open sessions stop working immediately.</>}
        confirmLabel="Remove"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </SectionCard>
  );
}
