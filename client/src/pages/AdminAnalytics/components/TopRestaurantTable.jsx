import { Star } from 'lucide-react'
import { ADMIN_CARD, ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'

// Top restaurants by delivered order value in the selected period
export default function TopRestaurantTable({ restaurants }) {
  return (
    <section className={`${ADMIN_CARD} p-5`}>
      <h2 className="text-base font-bold text-slate-900 dark:text-white">Nhà hàng doanh thu cao nhất</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Theo giá trị đơn giao thành công trong kỳ</p>

      {restaurants.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">Chưa có đơn giao thành công trong kỳ.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b border-slate-100 dark:border-crave-border">
              <tr>
                <th className={ADMIN_TABLE_HEAD}>Nhà hàng</th>
                <th className={`${ADMIN_TABLE_HEAD} text-right`}>Đơn</th>
                <th className={`${ADMIN_TABLE_HEAD} text-right`}>Doanh thu</th>
                <th className={`${ADMIN_TABLE_HEAD} text-right`}>Hoa hồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-crave-border">
              {restaurants.map((restaurant, index) => (
                <tr key={restaurant._id}>
                  <td className="px-4 py-2.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      <span className="mr-2 text-slate-500">#{index + 1}</span>
                      {restaurant.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-600 dark:text-amber-400" />
                      {restaurant.rating} ({restaurant.ratingCount})
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">{restaurant.orders}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(restaurant.gmv)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(restaurant.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
