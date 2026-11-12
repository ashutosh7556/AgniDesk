import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { FullPageLoader } from '../components/ui/States.jsx';

/** Redirects unauthenticated users to /login, remembering where they were going. */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <FullPageLoader />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
