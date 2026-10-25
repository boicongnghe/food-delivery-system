// Numbered form label used in the menu item form: "2. TÊN MÓN ĂN *        21/80 ký tự"
export default function FormLabel({ number, htmlFor, label, required, hint }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wide text-slate-800">
        {number}. {label} {required && <span className="text-brand">*</span>}
      </label>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  )
}
