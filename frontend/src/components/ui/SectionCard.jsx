/** Card with a title row and optional action (e.g. "View all" link). */
export default function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`card flex min-w-0 flex-col ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}
