import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApiHealth } from '../../hooks/useApiHealth.js';
import { NAV_ITEMS } from '../../constants/navigation.js';

const API_STATUS = {
  checking: { label: 'Checking server', dot: 'bg-slate-400' },
  online: { label: 'Server online', dot: 'bg-emerald-500' },
  offline: { label: 'Server offline', dot: 'bg-fire-500' },
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const apiStatus = API_STATUS[useApiHealth()];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const pageTitle = NAV_ITEMS.find((item) => pathname.startsWith(item.path))?.label ?? 'AgniDesk';

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKey = (event) => event.key === 'Escape' && setIsMenuOpen(false);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="truncate text-lg font-semibold text-navy-900">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <span className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:inline-flex" title="Backend health check (GET /api/health)">
          <span className={`h-2 w-2 rounded-full ${apiStatus.dot}`} aria-hidden="true" />
          {apiStatus.label}
        </span>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-400">
              {getInitials(user?.name)}
            </span>
            <span className="hidden text-left leading-tight md:block">
              <span className="block text-sm font-semibold text-slate-800">{user?.name}</span>
              <span className="block text-xs capitalize text-slate-500">{user?.role}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" aria-hidden="true" />
          </button>

          {isMenuOpen && (
            <div role="menu" className="card absolute right-0 mt-2 w-60 overflow-hidden py-1">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
