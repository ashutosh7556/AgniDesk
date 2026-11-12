/**
 * PHASE 1 MOCK AUTH SERVICE - NOT SECURE, FOR UI DEVELOPMENT ONLY.
 *
 * Any well-formed email/password is accepted and a fake session is stored in
 * sessionStorage. There is no backend call and no real token.
 *
 * Phase 2 replaces `login` with POST /api/auth/login (bcrypt + JWT on the server)
 * and `logout` with token removal. Components only use AuthContext, so they
 * will not need to change when this file is swapped.
 */
const SESSION_KEY = 'agnidesk.session';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login({ email }) {
  await delay(500); // simulate network latency so loading states are visible
  const user = {
    id: 'owner-1',
    name: 'Business Owner',
    email: email.trim().toLowerCase(),
    role: 'owner',
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
