import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageSquareText } from 'lucide-react'
import reportApi from '../../../api/reportApi.js'
import Pagination from '../../../components/Pagination/Pagination.jsx'
import StarRating from '../../../components/StarRating/StarRating.jsx'
import { formatDateTime } from '../../../utils/formatDate.js'
import { REVIEW_PAGE_SIZE } from '../constants.js'
import RatingSummary from './RatingSummary.jsx'

const RATING_FILTERS = [null, 5, 4, 3, 2, 1]

// "Đánh giá khách hàng" tab: visible reviews of the period (names shortened, hidden reviews never shown)
export default function ReviewsTab({ range }) {
  const [rating, setRating] = useState(null)
  const [page, setPage] = useState(1)
  const requestKey = `${range.from}_${range.to}_${rating}_${page}`
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const result = loaded.data
  const loading = loaded.key !== requestKey

  useEffect(() => {
    let ignore = false
    reportApi
      .getReviews({ ...range, rating: rating || undefined, page, limit: REVIEW_PAGE_SIZE })
      .then((response) => {
        if (!ignore) setLoaded({ key: requestKey, data: response.data })
      })
      .catch((error) => {
        if (ignore) return
        toast.error(error.response?.data?.message || 'Không tải được đánh giá')
        setLoaded((prev) => ({ ...prev, key: requestKey }))
      })
    return () => {
      ignore = true
    }
  }, [range, rating, page, requestKey])

  const changeRating = (value) => {
    setRating(value)
    setPage(1)
  }

  if (!result) {
    return <p className="py-16 text-center text-sm text-slate-500">Đang tải…</p>
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <RatingSummary reviews={result.summary} />

      <section className="rounded-xl border border-brand-soft/70 bg-white shadow-sm lg:col-span-2">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 p-4" role="group" aria-label="Lọc theo số sao">
          {RATING_FILTERS.map((value) => (
            <button
              key={value ?? 'all'}
              type="button"
              aria-pressed={rating === value}
              onClick={() => changeRating(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                rating === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-brand-light'
              }`}
            >
              {value ? `${value} ★` : 'Tất cả'}
            </button>
          ))}
        </div>

        <ul className={`divide-y divide-slate-100 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {result.items.map((review) => (
            <li key={review._id} className="flex gap-3 p-4">
              {review.customerAvatar ? (
                <img src={review.customerAvatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand">
                  {review.customerName.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-900">{review.customerName}</span>
                  <StarRating value={review.rating} size="sm" />
                  <span className="text-xs text-slate-500">
                    {formatDateTime(review.createdAt)} · đơn #{review.orderCode}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-1 text-sm text-slate-700">{review.comment}</p>
                ) : (
                  <p className="mt-1 text-sm italic text-slate-400">Không để lại nhận xét</p>
                )}
                {review.items.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Đã gọi: {review.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {result.items.length === 0 && (
          <p className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-slate-500">
            <MessageSquareText className="h-8 w-8 text-slate-300" aria-hidden="true" />
            Chưa có đánh giá nào khớp bộ lọc trong kỳ.
          </p>
        )}
        <div className="overflow-x-auto">
          <Pagination pagination={result.pagination} onPageChange={setPage} unit="đánh giá" />
        </div>
      </section>
    </div>
  )
}
