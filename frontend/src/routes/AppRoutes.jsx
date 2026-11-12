import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import CustomersPage from '../pages/customers/CustomersPage.jsx';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage.jsx';
import ProductsPage from '../pages/products/ProductsPage.jsx';
import ComingSoonPage from '../pages/ComingSoonPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import { NAV_ITEMS } from '../constants/navigation.js';

/** Modules not built yet (phase 3+) render a placeholder so navigation never dead-ends. */
const CURRENT_PHASE = 2;
const upcomingModules = NAV_ITEMS.filter((item) => item.phase > CURRENT_PHASE);

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
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
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
