import { createContext, useCallback, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';

export const AuthContext = createContext(null);

/**
 * Holds the current user and exposes login/logout.
 * `role` is kept on the user object so role-based permissions can be added later.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getStoredUser());

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
