import { Bike, EyeOff } from 'lucide-react'
import StarRating from '../../../components/StarRating/StarRating.jsx'
import { REVIEW_HIDE_REASON_LABELS } from '../../../utils/feedbackLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'

export default function MyReviewCard({ review }) {
  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900">{review.restaurant?.name || 'Nhà hàng'}</p>
          <p className="text-xs text-slate-400">
            Đơn <span className="font-mono">{review.orderCode}</span> · {formatDateTime(review.createdAt)}
          </p>
        </div>
        <StarRating value={review.restaurantRating} size="sm" />
      </div>
      {review.comment && <p className="mt-2 text-sm text-slate-700">{review.comment}</p>}

      {review.shipperRating && (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <Bike className="h-3.5 w-3.5" /> Shipper {review.shipper?.fullName}
            <StarRating value={review.shipperRating} size="sm" />
          </p>
          {review.shipperComment && <p className="mt-1 text-slate-700">{review.shipperComment}</p>}
        </div>
      )}

      {review.isHidden && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <EyeOff className="h-3.5 w-3.5 shrink-0" />
          Đánh giá đã bị ẩn do vi phạm tiêu chuẩn cộng đồng ({REVIEW_HIDE_REASON_LABELS[review.moderation?.reason]}) và
          không được tính vào điểm của quán.
        </p>
      )}
    </article>
  )
}
