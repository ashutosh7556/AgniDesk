import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import Sidebar from '../components/layout/Sidebar.jsx';
import Header from '../components/layout/Header.jsx';

/** App shell: fixed sidebar on desktop, slide-in drawer on mobile/tablet. */
export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer after navigating.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
