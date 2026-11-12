/**
 * Stores the JWT in localStorage so the owner stays signed in across tabs
 * and browser restarts until the token expires (JWT_EXPIRES_IN on the server).
 *
 * Trade-off: localStorage is readable by any script on the page, so XSS
 * would expose the token. React escapes rendered content and we render no
 * raw HTML, which keeps that risk low. An httpOnly cookie would be safer
 * against XSS but complicates cross-domain deployment and the planned
 * Android app, which will also use Bearer tokens.
 */
const TOKEN_KEY = 'agnidesk.token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
