import { NavLink } from 'react-router';
import { LogOut, X } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo.jsx';
import { NAV_ITEMS } from '../../constants/navigation.js';
import { useAuth } from '../../hooks/useAuth.js';

const linkClasses = ({ isActive }) =>
  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-linear-to-r from-fire-600/90 to-flame-500/90 text-white shadow-sm'
      : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

export default function Sidebar({ isOpen, onClose }) {
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-navy-950/60 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-linear-to-b from-navy-900 to-charcoal-900 transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <BrandLogo variant="dark" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path} className={linkClasses}>
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
