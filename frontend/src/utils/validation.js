/**
 * Client-side validation for instant feedback.
 * The backend (zod schemas) is the source of truth and re-validates everything;
 * keep these rules in sync with backend/src/validators.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** "+91 98765-43210" -> "9876543210" (same rule as the backend). */
export const normaliseMobile = (value) =>
  value.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');

export const validateLogin = ({ email, password }) => {
  const errors = {};
  const trimmedEmail = email.trim();
  if (!trimmedEmail) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
};

export const validateCustomer = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Customer name is required.';
  if (!form.mobile.trim()) errors.mobile = 'Mobile number is required.';
  else if (!/^[6-9]\d{9}$/.test(normaliseMobile(form.mobile)))
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim()))
    errors.email = 'Enter a valid email address.';
  if (form.gstNumber.trim() && !GSTIN_PATTERN.test(form.gstNumber.trim().toUpperCase()))
    errors.gstNumber = 'Enter a valid 15-character GSTIN.';
  return errors;
};

const checkNumber = (raw, label, { integer = false } = {}) => {
  if (String(raw).trim() === '') return `${label} is required.`;
  const value = Number(raw);
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value < 0) return `${label} cannot be negative.`;
  if (integer && !Number.isInteger(value)) return `${label} must be a whole number.`;
  return null;
};

export const validateProduct = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Product name is required.';
  if (!form.category) errors.category = 'Select a category.';
  const checks = {
    purchasePrice: checkNumber(form.purchasePrice, 'Purchase price'),
    sellingPrice: checkNumber(form.sellingPrice, 'Selling price'),
    quantity: checkNumber(form.quantity, 'Quantity', { integer: true }),
    lowStockThreshold: checkNumber(form.lowStockThreshold, 'Low stock alert level', { integer: true }),
  };
  for (const [field, message] of Object.entries(checks)) {
    if (message) errors[field] = message;
  }
  return errors;
};
