import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';

/** Keeps logged-in users away from the login page. */
export default function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
