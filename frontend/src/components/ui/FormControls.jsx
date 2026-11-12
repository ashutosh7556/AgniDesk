import { AlertCircle } from 'lucide-react';

/**
 * Labelled form controls with consistent styling and accessible errors.
 * All accept standard input props (name, value, onChange, ...).
 */

const controlClasses = (hasError) =>
  `block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 disabled:bg-slate-50 ${
    hasError ? 'border-fire-500 focus:ring-fire-100' : 'border-slate-300 focus:border-flame-500 focus:ring-flame-100'
  }`;

function Field({ id, label, required, error, hint, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-fire-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fire-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

const a11yProps = (id, error) => ({
  id,
  'aria-invalid': Boolean(error),
  'aria-describedby': error ? `${id}-error` : undefined,
});

export function TextField({ label, name, error, hint, required, className, prefix, ...inputProps }) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{prefix}</span>
        )}
        <input name={name} {...a11yProps(id, error)} {...inputProps} className={`${controlClasses(error)} ${prefix ? 'pl-7' : ''}`} />
      </div>
    </Field>
  );
}

export function SelectField({ label, name, error, hint, required, className, options, placeholder, ...selectProps }) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <select name={name} {...a11yProps(id, error)} {...selectProps} className={controlClasses(error)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextareaField({ label, name, error, hint, required, className, ...textareaProps }) {
  const id = `field-${name}`;
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea name={name} rows={3} {...a11yProps(id, error)} {...textareaProps} className={controlClasses(error)} />
    </Field>
  );
}
