import { formatCurrency } from '../../../utils/formatCurrency.js'

// Dish list of the ticket: big quantity, options and per-dish notes
export default function TicketItems({ items }) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Danh sách món ăn &amp; topping</p>
        <span className="text-xs text-slate-500">{itemCount} món</span>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex gap-3 rounded-lg border border-brand-soft/60 bg-white p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-light text-base font-extrabold text-brand">
            {item.quantity}x
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="font-bold text-slate-900">{formatCurrency(item.lineTotal)}</p>
            </div>
            {item.options.map((option) => (
              <p key={`${option.groupName}-${option.name}`} className="text-xs text-slate-500">
                • {option.groupName}: {option.name}
                {option.price > 0 && ` (+${formatCurrency(option.price)})`}
              </p>
            ))}
            {item.note && <p className="text-xs font-semibold text-red-700">• Yêu cầu: {item.note}</p>}
            <p className="text-right font-mono text-[11px] text-slate-400">{formatCurrency(item.unitPrice)} / suất</p>
          </div>
        </div>
      ))}
    </section>
  )
}
