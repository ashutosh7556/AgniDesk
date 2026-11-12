import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/ui/BrandLogo.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { validateLogin } from '../utils/validation.js';
import { BUSINESS } from '../constants/business.js';
import InstallAppButton from '../pwa/InstallAppButton.jsx';

function FormField({ id, label, icon: Icon, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fire-600">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputClasses = (hasError) =>
  `block w-full rounded-lg border bg-white py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 ${
    hasError ? 'border-fire-500 focus:ring-fire-100' : 'border-slate-300 focus:border-flame-500 focus:ring-flame-100'
  }`;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(form);
      const redirectTo = location.state?.from?.pathname ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Login failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel (hidden on small screens) */}
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-linear-to-br from-navy-900 via-navy-950 to-charcoal-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-linear-to-tr from-fire-600/30 via-flame-500/20 to-gold-400/10 blur-3xl" aria-hidden="true" />
        <BrandLogo variant="dark" />

        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">{BUSINESS.tagline}</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">{BUSINESS.name}</h1>
          <p className="mt-4 max-w-md text-slate-300">
            Manage customers, inventory, quotations, invoices and fire safety services from one place.
          </p>
          <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm text-slate-300">
            {BUSINESS.categories.map((category) => (
              <li key={category} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-flame-400" aria-hidden="true" />
                {category}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-2 text-sm text-slate-400">
          <p className="flex items-center gap-2"><Phone className="h-4 w-4" aria-hidden="true" />{BUSINESS.phones.join('  |  ')}</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden="true" />{BUSINESS.email}</p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{BUSINESS.address}</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo variant="light" showTagline />
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-navy-900">Owner Login</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to access your AgniDesk dashboard.</p>

            {submitError && (
              <div role="alert" className="mt-5 flex items-center gap-2 rounded-lg border border-fire-200 bg-fire-50 px-3 py-2.5 text-sm text-fire-700">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <FormField id="email" label="Email address" icon={Mail} error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`${inputClasses(errors.email)} pr-3`}
                />
              </FormField>

              <FormField id="password" label="Password" icon={Lock} error={errors.password}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`${inputClasses(errors.password)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </FormField>

              <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <div className="mt-4 flex justify-center">
            <InstallAppButton variant="link" />
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {BUSINESS.name}
          </p>
        </div>
      </main>
    </div>
  );
}
