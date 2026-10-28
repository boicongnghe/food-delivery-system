import StarRating from '../../../components/StarRating/StarRating.jsx'
import { RATING_BAR_COLOR } from '../constants.js'

/**
 * Average + 5..1 star distribution of the visible reviews written in the period.
 * The overall rating (all time, the one customers see) is shown next to it.
 */
export default function RatingSummary({ reviews, onShowAll }) {
  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Đánh giá khách hàng</h2>
        {onShowAll && (
          <button type="button" onClick={onShowAll} className="text-sm font-semibold text-brand hover:underline">
            Xem nhận xét
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold tabular-nums text-slate-900">{reviews.total ? reviews.average.toFixed(1) : '–'}</p>
          <StarRating value={reviews.average} size="sm" />
          <p className="mt-1 text-xs text-slate-500">{reviews.total} đánh giá trong kỳ</p>
        </div>

        <ul className="min-w-48 flex-1 space-y-1.5">
          {reviews.distribution.map((row) => (
            <li key={row.stars} className="flex items-center gap-2 text-xs">
              <span className="w-8 tabular-nums text-slate-600">{row.stars} ★</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className="h-2 rounded-full" style={{ width: `${row.share}%`, backgroundColor: RATING_BAR_COLOR }} />
              </div>
              <span className="w-14 text-right tabular-nums text-slate-600">
                {row.count} <span className="text-slate-400">({row.share}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        Điểm hiển thị cho khách: <b className="text-slate-800">{reviews.overallRating.toFixed(1)} ★</b> ({reviews.overallCount} đánh
        giá)
        {reviews.hidden > 0 && ` · ${reviews.hidden} đánh giá trong kỳ đã bị ẩn do vi phạm, không tính điểm`}
      </p>
    </section>
  )
}
