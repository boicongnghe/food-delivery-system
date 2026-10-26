import { Star } from 'lucide-react'
import { ADMIN_CARD } from '../../../utils/adminClassNames.js'
import { RATING_BAR_COLOR } from '../constants.js'

/**
 * Visible reviews per star level (5 -> 1). Every bar carries its count at the tip,
 * so the values never depend on hovering.
 */
export default function RatingDistribution({ reviews }) {
  const maxCount = Math.max(1, ...reviews.distribution.map((row) => row.count))

  return (
    <section className={`${ADMIN_CARD} p-5`}>
      <h2 className="text-base font-bold text-white">Phân bố số sao (nhà hàng)</h2>
      <p className="mt-0.5 text-xs text-slate-400">
        {reviews.total} đánh giá · trung bình nhà hàng {reviews.restaurantAverage}★, shipper {reviews.shipperAverage}★
        {reviews.hidden > 0 && ` · ${reviews.hidden} đánh giá đã ẩn không được tính`}
      </p>

      <ul className="mt-4 space-y-2.5">
        {reviews.distribution.map((row) => (
          <li key={row.stars} className="flex items-center gap-3 text-xs">
            <span className="flex w-8 shrink-0 items-center gap-0.5 font-semibold text-slate-300">
              {row.stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </span>
            <div className="h-2.5 flex-1">
              <div
                className="h-full rounded-r"
                style={{ width: `${(row.count / maxCount) * 100}%`, backgroundColor: RATING_BAR_COLOR }}
              />
            </div>
            <span className="w-8 shrink-0 text-right tabular-nums text-slate-300">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
