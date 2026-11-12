import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import { FullPageLoader } from '../components/ui/States.jsx';

/** Keeps logged-in users away from the login page. */
export default function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === 'checking') return <FullPageLoader />;
  return status === 'authenticated' ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
