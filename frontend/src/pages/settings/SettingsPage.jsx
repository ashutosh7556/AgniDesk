import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { TextField, TextareaField } from '../../components/ui/FormControls.jsx';
import { LoadingState } from '../../components/ui/States.jsx';
import {
  changePassword,
  downloadBackup,
  getSettings,
  restoreBackup,
  updateProfile,
  updateSettings,
} from '../../services/settingsService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useToast } from '../../hooks/useToast.js';
import { downloadBlob } from '../../utils/documentFiles.js';
import { GST_RATES } from '../../constants/business.js';
import UserManagement from '../../components/settings/UserManagement.jsx';

const TABS = [
  { key: 'business', label: 'Business & Documents' },
  { key: 'account', label: 'Profile & Password' },
  { key: 'users', label: 'Users' },
  { key: 'backup', label: 'Backup & Restore' },
];

function SaveButton({ isSaving, label = 'Save changes' }) {
  return (
    <button type="submit" className="btn-primary" disabled={isSaving}>
      {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------

function BusinessSettings() {
  const toast = useToast();
  const { setSettings } = useSettings();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getSettings(controller.signal)
      .then(({ settings }) => setForm({ ...settings, defaultGstRate: String(settings.defaultGstRate), quotationValidityDays: String(settings.quotationValidityDays) }))
      .catch((error) => error.name !== 'AbortError' && toast.error(error.message));
    return () => controller.abort();
  }, [toast]);

  if (!form) return <LoadingState label="Loading settings..." />;

  const set = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const { settings } = await updateSettings({
        ...form,
        gstin: form.gstin.trim().toUpperCase(),
        defaultGstRate: Number(form.defaultGstRate),
        quotationValidityDays: Number(form.quotationValidityDays),
      });
      setSettings(settings);
      setForm({ ...settings, defaultGstRate: String(settings.defaultGstRate), quotationValidityDays: String(settings.quotationValidityDays) });
      setErrors({});
      toast.success('Settings saved. New PDFs will use these details.');
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <SectionCard title="Business details" subtitle="Printed on quotations, invoices and service certificates">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Business name" name="businessName" value={form.businessName} onChange={set} error={errors.businessName} required maxLength={120} />
          <TextField label="Tagline" name="tagline" value={form.tagline} onChange={set} error={errors.tagline} maxLength={120} />
          <TextField label="Primary phone" name="phone1" value={form.phone1} onChange={set} error={errors.phone1} required maxLength={30} />
          <TextField label="Second phone" name="phone2" value={form.phone2} onChange={set} error={errors.phone2} maxLength={30} />
          <TextField label="Email" name="email" type="email" value={form.email} onChange={set} error={errors.email} maxLength={150} className="sm:col-span-2" />
          <TextareaField label="Address" name="address" rows={2} value={form.address} onChange={set} error={errors.address} required maxLength={400} className="sm:col-span-2" />
        </div>
      </SectionCard>

      <SectionCard title="GST" subtitle="Used for tax invoices and CGST/SGST vs IGST">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="GSTIN"
            name="gstin"
            value={form.gstin}
            onChange={set}
            error={errors.gstin}
            maxLength={15}
            hint="Leave empty if not GST-registered."
            style={{ textTransform: 'uppercase' }}
          />
          <TextField label="State code" name="stateCode" value={form.stateCode} onChange={set} error={errors.stateCode} required maxLength={2} inputMode="numeric" hint="24 = Gujarat" />
          <TextField label="State name" name="stateName" value={form.stateName} onChange={set} error={errors.stateName} required maxLength={60} />
          <div>
            <label htmlFor="field-defaultGstRate" className="mb-1.5 block text-sm font-medium text-slate-700">Default GST rate</label>
            <select id="field-defaultGstRate" name="defaultGstRate" value={form.defaultGstRate} onChange={set} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100">
              {GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">For new products and custom items.</p>
          </div>
        </div>
        {!form.gstin && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            No GSTIN set. GST tax invoices should show your GSTIN; issue Non-GST invoices until it is added.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Quotation & invoice defaults" subtitle="Pre-filled on new documents (can be changed per document)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="Quotation validity (days)" name="quotationValidityDays" type="number" min="1" max="365" value={form.quotationValidityDays} onChange={set} error={errors.quotationValidityDays} required />
          <TextareaField label="Default quotation terms" name="defaultQuotationTerms" rows={5} value={form.defaultQuotationTerms} onChange={set} error={errors.defaultQuotationTerms} maxLength={3000} className="sm:col-span-3" />
          <TextareaField
            label="Default invoice notes"
            name="defaultInvoiceNotes"
            rows={3}
            value={form.defaultInvoiceNotes}
            onChange={set}
            error={errors.defaultInvoiceNotes}
            maxLength={1000}
            hint="e.g. bank account / UPI details. Printed on new invoices."
            className="sm:col-span-3"
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <SaveButton isSaving={isSaving} label="Save settings" />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function AccountSettings() {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const { user: updated } = await updateProfile({ name: profile.name.trim(), email: profile.email.trim() });
      updateUser(updated);
      setProfileErrors({});
      toast.success('Profile updated.');
    } catch (error) {
      setProfileErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!passwords.currentPassword) errors.currentPassword = 'Current password is required.';
    if (passwords.newPassword.length < 8) errors.newPassword = 'At least 8 characters.';
    if (passwords.confirmPassword !== passwords.newPassword) errors.confirmPassword = 'Passwords do not match.';
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed. Other devices have been signed out.');
    } catch (error) {
      setPasswordErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const setP = (setter, clear) => (event) => {
    const { name, value } = event.target;
    setter((prev) => ({ ...prev, [name]: value }));
    clear((prev) => ({ ...prev, [name]: undefined }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionCard title="Owner profile" subtitle="Your name and login email">
        <form onSubmit={saveProfile} noValidate className="space-y-4">
          <TextField label="Name" name="name" value={profile.name} onChange={setP(setProfile, setProfileErrors)} error={profileErrors.name} required maxLength={100} />
          <TextField label="Login email" name="email" type="email" value={profile.email} onChange={setP(setProfile, setProfileErrors)} error={profileErrors.email} required maxLength={150} />
          <div className="flex justify-end"><SaveButton isSaving={savingProfile} label="Save profile" /></div>
        </form>
      </SectionCard>
      <SectionCard title="Change password" subtitle="At least 8 characters">
        <form onSubmit={savePassword} noValidate className="space-y-4">
          <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={setP(setPasswords, setPasswordErrors)} error={passwordErrors.currentPassword} required />
          <TextField label="New password" name="newPassword" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={setP(setPasswords, setPasswordErrors)} error={passwordErrors.newPassword} required />
          <TextField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={setP(setPasswords, setPasswordErrors)} error={passwordErrors.confirmPassword} required />
          <div className="flex justify-end"><SaveButton isSaving={savingPassword} label="Change password" /></div>
        </form>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BackupSettings() {
  const toast = useToast();
  const { reload } = useSettings();
  const fileInput = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [file, setFile] = useState(null);
  const [includeCustomers, setIncludeCustomers] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [result, setResult] = useState(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadBackup();
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      downloadBlob(blob, `AgniDesk-backup-${stamp}.xlsx`);
      toast.success('Backup downloaded. Keep it somewhere safe (e.g. Google Drive).');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      // Safety copy of the CURRENT data to this computer before anything is replaced.
      const current = await downloadBackup();
      downloadBlob(current, `AgniDesk-before-restore-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.xlsx`);
      const data = await restoreBackup(file, { includeCustomers });
      setResult(data);
      setIsConfirmOpen(false);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      reload();
      toast.success('Backup restored.');
    } catch (error) {
      setIsConfirmOpen(false);
      toast.error(error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionCard title="Download backup" subtitle="Everything in one Excel file">
        <p className="text-sm text-slate-600">
          Includes customers, products, stock, quotations, invoices, payments, expenses, services and settings from Google Sheets.
          Login details are not included.
        </p>
        <button type="button" className="btn-primary mt-4" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          Download backup
        </button>
        <p className="mt-3 text-xs text-slate-500">Tip: download a backup every week and store it outside this computer.</p>
      </SectionCard>

      <SectionCard title="Restore from backup" subtitle="Replace current data with a backup file">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Restoring replaces current records in Google Sheets with the ones in the file. A backup of the current data is downloaded to this computer first.
          </div>
          <div>
            <label htmlFor="backup-file" className="mb-1.5 block text-sm font-medium text-slate-700">Backup file (.xlsx)</label>
            <input
              id="backup-file"
              ref={fileInput}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={includeCustomers} onChange={(e) => setIncludeCustomers(e.target.checked)} className="mt-0.5 h-4 w-4 accent-flame-500" />
            <span>
              Also restore customers
              <span className="block text-xs text-slate-500">Replaces all rows in the Google Sheets "Customers" tab.</span>
            </span>
          </label>
          <button type="button" className="btn-danger" disabled={!file} onClick={() => setIsConfirmOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Restore backup
          </button>

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900" role="status">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Restore complete</p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {result.restored.map((r) => <li key={r.entity}>{r.entity}: {r.records} record{r.records === 1 ? '' : 's'}</li>)}
                {result.skipped.map((s) => <li key={s.entity} className="text-emerald-700">{s.entity}: skipped ({s.reason})</li>)}
              </ul>
              <p className="mt-2 text-xs">Your data from before the restore was downloaded to this computer{result.snapshotFile ? ` and saved on the server as ${result.snapshotFile}` : ''}.</p>
            </div>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Restore this backup?"
        message={
          <>
            Current data will be replaced with <strong className="text-slate-800">{file?.name}</strong>
            {includeCustomers ? ', including the Customers tab in Google Sheets' : ' (customers in Google Sheets are kept)'}. A copy of the current
            data is downloaded to this computer first.
          </>
        }
        confirmLabel="Restore"
        isProcessing={isRestoring}
        onConfirm={handleRestore}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'business';
  const tabClass = (active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-200/60'}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Business details, document defaults, users and backups" />
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tabClass(tab === t.key)} onClick={() => setSearchParams(t.key === 'business' ? {} : { tab: t.key })}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'business' && <BusinessSettings />}
      {tab === 'account' && <AccountSettings />}
      {tab === 'users' && <UserManagement />}
      {tab === 'backup' && <BackupSettings />}
    </div>
  );
}
