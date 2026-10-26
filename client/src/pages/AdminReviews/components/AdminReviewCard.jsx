import { Bike, EyeOff } from 'lucide-react'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import StarRating from '../../../components/StarRating/StarRating.jsx'
import { REVIEW_HIDE_REASON_LABELS } from '../../../utils/feedbackLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'

export default function AdminReviewCard({ review, onSelect }) {
  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${
        review.isHidden ? 'border-red-500/20 bg-red-500/5' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={review.customer?.avatar} alt="" className="h-9 w-9 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{review.customer?.fullName}</p>
            <p className="text-xs text-slate-500">
              {review.restaurant?.name} · <span className="font-mono">{review.orderCode}</span> ·{' '}
              {formatDateTime(review.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review.isHidden && (
            <AdminBadge tone="red">
              <EyeOff className="h-3 w-3" /> Đã ẩn · {REVIEW_HIDE_REASON_LABELS[review.moderation?.reason]}
            </AdminBadge>
          )}
          <StarRating value={review.restaurantRating} size="sm" emptyClassName="text-slate-700" />
        </div>
      </div>

      {review.comment ? (
        <p className="mt-3 text-sm text-slate-200">{review.comment}</p>
      ) : (
        <p className="mt-3 text-sm italic text-slate-600">Không có nhận xét</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {review.shipperRating ? (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Bike className="h-3.5 w-3.5" /> {review.shipper?.fullName}
            <StarRating value={review.shipperRating} size="sm" emptyClassName="text-slate-700" />
            {review.shipperComment && <span className="text-slate-500">“{review.shipperComment}”</span>}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onSelect(review._id)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/10"
        >
          Chi tiết & kiểm duyệt
        </button>
      </div>
    </article>
  )
}
