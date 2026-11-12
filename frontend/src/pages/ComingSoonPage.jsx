import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

/** Placeholder for modules scheduled in later phases, so navigation never dead-ends. */
export default function ComingSoonPage({ title, icon: Icon, phase }) {
  return (
    <div className="card mx-auto max-w-lg p-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-flame-50 text-flame-600">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-navy-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">
        This module is planned for <span className="font-semibold text-slate-700">Phase {phase}</span> of development.
      </p>
      <Link to="/dashboard" className="btn-ghost mt-6">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </Link>
    </div>
  );
}
