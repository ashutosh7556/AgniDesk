const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MIN_PASSWORD_LENGTH = 6;

/** Returns an errors object; empty object means the form is valid. */
export const validateLogin = ({ email, password }) => {
  const errors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email address.';

  if (!password) errors.password = 'Password is required.';
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

  return errors;
};
