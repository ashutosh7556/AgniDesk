import { Link } from 'react-router';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <SearchX className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-navy-900">Page not found</h2>
      <p className="mt-2 text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="btn-ghost mt-6">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>
    </div>
  );
}
