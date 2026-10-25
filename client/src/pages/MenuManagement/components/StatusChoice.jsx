import { Check } from 'lucide-react'

// Two-button choice used in section 11, e.g. [Còn món] [Hết món]
export default function StatusChoice({ title, description, value, onChange, onLabel, offLabel }) {
  const buttonClass = (isActive) =>
    `inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-bold transition-colors ${
      isActive ? 'bg-brand text-white' : 'border border-brand-soft bg-white text-slate-600 hover:bg-brand-light'
    }`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-soft bg-brand-light/40 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onChange(true)} className={buttonClass(value)}>
          {value && <Check className="h-3.5 w-3.5" />}
          {onLabel}
        </button>
        <button type="button" onClick={() => onChange(false)} className={buttonClass(!value)}>
          {!value && <Check className="h-3.5 w-3.5" />}
          {offLabel}
        </button>
      </div>
    </div>
  )
}
