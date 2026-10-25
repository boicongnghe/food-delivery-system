export default function FieldLabel({ htmlFor, label, required, hint }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-800">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  )
}
