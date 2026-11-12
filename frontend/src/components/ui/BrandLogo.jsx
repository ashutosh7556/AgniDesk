import { Flame } from 'lucide-react';
import { BUSINESS } from '../../constants/business.js';

/**
 * Brand mark + wordmark. `variant="dark"` is for dark backgrounds.
 * Swap the icon for the official logo file (src/assets) once provided.
 */
export default function BrandLogo({ variant = 'dark', showTagline = false }) {
  const isDark = variant === 'dark';
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-fire-600 via-flame-500 to-gold-400 shadow-md shadow-fire-900/20">
        <Flame className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-navy-900'}`}>
          {BUSINESS.appName}
        </p>
        <p className={`truncate text-[11px] font-medium uppercase tracking-wider ${isDark ? 'text-gold-400' : 'text-flame-600'}`}>
          {showTagline ? BUSINESS.tagline : BUSINESS.shortName}
        </p>
      </div>
    </div>
  );
}
