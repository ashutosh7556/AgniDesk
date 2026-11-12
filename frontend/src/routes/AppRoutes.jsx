import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import ComingSoonPage from '../pages/ComingSoonPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import { NAV_ITEMS } from '../constants/navigation.js';

const upcomingModules = NAV_ITEMS.filter((item) => item.phase > 1);

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {upcomingModules.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={<ComingSoonPage title={item.label} icon={item.icon} phase={item.phase} />}
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
