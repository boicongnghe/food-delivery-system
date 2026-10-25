import { Flag } from 'lucide-react'

// Customer note shown as a highlighted alert + "Khách quen" badge for regular customers
export default function CustomerAlert({ note, insight }) {
  if (!note && !insight?.isRegular) return null

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-900">
          <Flag className="h-4 w-4" />
          Lưu ý quan trọng từ khách
        </p>
        {insight?.isRegular && (
          <span
            title={`${insight.completedOrders} đơn giao thành công tại quán trong 90 ngày`}
            className="rounded bg-amber-800 px-2 py-0.5 text-[11px] font-bold text-white"
          >
            Khách quen ({insight.completedOrders} đơn)
          </span>
        )}
      </div>
      <p className="mt-2 rounded-md bg-white px-3 py-2 text-sm italic text-slate-800">
        {note ? `“${note}”` : 'Khách không để lại ghi chú.'}
      </p>
    </section>
  )
}
