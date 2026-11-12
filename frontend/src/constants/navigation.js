import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  Wallet,
  Wrench,
  BarChart3,
  Settings,
} from 'lucide-react';

/**
 * Single source of truth for sidebar items and module routes.
 * `phase` marks when the module is scheduled; unbuilt modules render a placeholder page.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, phase: 1 },
  { label: 'Customers', path: '/customers', icon: Users, phase: 2 },
  { label: 'Products & Inventory', path: '/products', icon: Package, phase: 2 },
  { label: 'Quotations', path: '/quotations', icon: FileText, phase: 3 },
  { label: 'Invoices', path: '/invoices', icon: Receipt, phase: 3 },
  { label: 'Expenses', path: '/expenses', icon: Wallet, phase: 4 },
  { label: 'Services', path: '/services', icon: Wrench, phase: 5 },
  { label: 'Reports', path: '/reports', icon: BarChart3, phase: 6 },
  { label: 'Settings', path: '/settings', icon: Settings, phase: 6 },
];
