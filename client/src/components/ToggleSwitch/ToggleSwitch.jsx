/**
 * On/off switch with an optional text label.
 *
 * @param {boolean} checked
 * @param {(checked: boolean) => void} onChange
 * @param {string} onLabel / offLabel - text shown next to the switch
 */
export default function ToggleSwitch({ checked, onChange, onLabel, offLabel, disabled = false, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-emerald-700' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-all ${
            checked ? 'left-[18px] bg-white' : 'left-0.5 bg-slate-500'
          }`}
        />
      </span>
      {(onLabel || offLabel) && (
        <span className={`text-xs font-semibold ${checked ? 'text-emerald-800' : 'text-amber-700'}`}>
          {checked ? onLabel : offLabel}
        </span>
      )}
    </button>
  )
}
