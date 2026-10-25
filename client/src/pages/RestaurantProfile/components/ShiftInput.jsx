const timeInputClass = 'bg-transparent text-xs font-semibold text-slate-700 focus:outline-none'

// One opening shift: open time - close time ("HH:mm")
export default function ShiftInput({ shift, onChange }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-brand-soft bg-white px-2.5 py-1.5">
      <input
        type="time"
        value={shift.open}
        onChange={(e) => onChange('open', e.target.value)}
        className={timeInputClass}
        aria-label="Giờ mở"
      />
      <span className="text-slate-400">-</span>
      <input
        type="time"
        value={shift.close}
        onChange={(e) => onChange('close', e.target.value)}
        className={timeInputClass}
        aria-label="Giờ đóng"
      />
    </div>
  )
}
