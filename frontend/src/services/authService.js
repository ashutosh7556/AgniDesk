import { apiRequest } from './apiClient.js';
import { tokenStorage } from './tokenStorage.js';

/** POST /api/auth/login — stores the JWT and returns the user. */
export async function login({ email, password }) {
  const { token, user } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });
  tokenStorage.set(token);
  return user;
}

/** GET /api/auth/me — validates the stored token and returns the user. */
export async function getCurrentUser() {
  const { user } = await apiRequest('/auth/me');
  return user;
}

/** JWTs are stateless: logging out means discarding the token on this device. */
export function logout() {
  tokenStorage.clear();
}

export const hasStoredToken = () => Boolean(tokenStorage.get());
