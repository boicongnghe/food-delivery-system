import { Store } from 'lucide-react'

/**
 * Compact order summary for customers: restaurant, order code and dishes.
 * @param {object} order - { orderCode, restaurant: { name, logo }, items: [{ name, quantity }] }
 */
export default function OrderBrief({ order, children }) {
  const dishes = order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')

  return (
    <div className="flex items-start gap-3">
      {order.restaurant?.logo ? (
        <img src={order.restaurant.logo} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
          <Store className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{order.restaurant?.name || 'Nhà hàng'}</p>
        <p className="text-xs text-slate-500">
          Đơn <span className="font-mono font-semibold text-slate-700">{order.orderCode}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-600">{dishes}</p>
        {children}
      </div>
    </div>
  )
}
