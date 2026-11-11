import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import { ADMIN_INPUT } from '../../../utils/adminClassNames.js'

/**
 * One numeric setting: label, default value, input with its unit.
 * @param {{ key: string, label: string, min: number, max: number, hint?: string }} field
 * @param {string} unit - "phút", "lần"...
 */
export default function SettingRow({ field, unit, value, defaultValue, error, onChange }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <label htmlFor={`setting-${field.key}`} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {field.label}
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Mặc định {defaultValue} {unit}
          {field.hint && ` · ${field.hint}`}
        </p>
        <AdminFieldError message={error} />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`setting-${field.key}`}
          type="number"
          min={field.min}
          max={field.max}
          step={1}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value === '' ? '' : Number(event.target.value))}
          className={`${ADMIN_INPUT} w-24 text-right tabular-nums`}
        />
        <span className="w-8 text-xs text-slate-500">{unit}</span>
      </div>
    </div>
  )
}
