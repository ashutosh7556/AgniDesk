import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import CustomersPage from '../pages/customers/CustomersPage.jsx';
import CustomerDetailPage from '../pages/customers/CustomerDetailPage.jsx';
import ProductsPage from '../pages/products/ProductsPage.jsx';
import QuotationsPage from '../pages/quotations/QuotationsPage.jsx';
import QuotationFormPage from '../pages/quotations/QuotationFormPage.jsx';
import QuotationDetailPage from '../pages/quotations/QuotationDetailPage.jsx';
import InvoicesPage from '../pages/invoices/InvoicesPage.jsx';
import InvoiceFormPage from '../pages/invoices/InvoiceFormPage.jsx';
import InvoiceDetailPage from '../pages/invoices/InvoiceDetailPage.jsx';
import PaymentsPage from '../pages/payments/PaymentsPage.jsx';
import ExpensesPage from '../pages/expenses/ExpensesPage.jsx';
import ServicesPage from '../pages/services/ServicesPage.jsx';
import ServiceFormPage from '../pages/services/ServiceFormPage.jsx';
import ServiceDetailPage from '../pages/services/ServiceDetailPage.jsx';
import ReportsPage from '../pages/reports/ReportsPage.jsx';
import SettingsPage from '../pages/settings/SettingsPage.jsx';
import ComingSoonPage from '../pages/ComingSoonPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import { NAV_ITEMS } from '../constants/navigation.js';

/** Modules not built yet (later phases) render a placeholder so navigation never dead-ends. */
const CURRENT_PHASE = 6;
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
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/quotations/new" element={<QuotationFormPage />} />
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/new" element={<ServiceFormPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route path="/services/:id/edit" element={<ServiceFormPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
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
