import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { UNAUTHORIZED_EVENT } from '../services/apiClient.js';

export const AuthContext = createContext(null);

/**
 * Holds the current user and exposes login/logout.
 * status: 'checking' (validating a stored token) | 'authenticated' | 'anonymous'
 * `user.role` is kept for future role-based permissions.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (authService.hasStoredToken() ? 'checking' : 'anonymous'));

  // On load, confirm a stored token is still valid with the server.
  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Any API call that gets 401 (expired/invalid token) signs the user out.
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    setStatus('authenticated');
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  /** After the owner edits their profile in Settings. */
  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  const value = useMemo(
    () => ({ user, status, isAuthenticated: status === 'authenticated', login, logout, updateUser }),
    [user, status, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
