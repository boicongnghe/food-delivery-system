export default function StatPill({ label, value, className }) {
  return (
    <span className="rounded-md border border-brand-soft bg-white px-3 py-1.5 text-sm text-slate-600">
      {label}: <strong className={className}>{value}</strong>
    </span>
  )
}
