import { UtensilsCrossed } from 'lucide-react'
import { formatCurrency } from '../../../utils/formatCurrency.js'

// Best sellers of the period by portions sold (completed orders only)
export default function TopDishes({ dishes }) {
  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
        <UtensilsCrossed className="h-5 w-5 text-brand" aria-hidden="true" />
        Món bán chạy
      </h2>

      {dishes.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Chưa có món nào được bán trong kỳ.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {dishes.map((dish, index) => (
            <li key={String(dish._id)} className="flex items-center gap-3">
              <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-400">{index + 1}</span>
              {dish.image ? (
                <img src={dish.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{dish.name}</p>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.max(2, dish.share)}%` }} />
                </div>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold tabular-nums text-slate-900">{dish.quantity} phần</p>
                <p className="tabular-nums text-slate-500">{formatCurrency(dish.revenue)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
