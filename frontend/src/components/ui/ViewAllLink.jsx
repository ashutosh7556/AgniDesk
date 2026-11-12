import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

export default function ViewAllLink({ to, label = 'View all' }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-flame-600 hover:text-fire-600">
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}
