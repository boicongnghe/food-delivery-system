import { useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Bike, Store, Utensils, X } from 'lucide-react'
import reviewApi from '../../api/reviewApi.js'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js'
import OrderBrief from '../OrderBrief/OrderBrief.jsx'
import StarRating from '../StarRating/StarRating.jsx'
import RatingField from './RatingField.jsx'

const COMMENT_MAX_LENGTH = 500
const SHIPPER_COMMENT_MAX_LENGTH = 300

const textareaClass =
  'w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15'

/**
 * UC17 - rate the restaurant and the shipper of a delivered order (one review per order).
 * The order history page (UC16) can open it the same way as the feedback page.
 * @param {object} order - { _id, orderCode, restaurant, shipper: { fullName } | null, items }
 * @param {(review: object) => void} onSubmitted - called after the review is saved (close the modal there)
 */
export default function ReviewOrderModal({ order, onClose, onSubmitted }) {
  const [form, setForm] = useState({ restaurantRating: 0, comment: '', shipperRating: 0, shipperComment: '' })
  const [dishReviews, setDishReviews] = useState(() =>
    (order.items || []).map((it) => ({
      menuItem: it.menuItem || it._id,
      dishName: it.name,
      dishImage: it.image || '',
      optionsSummary: (it.options || []).map((o) => o.name).join(', '),
      rating: 5,
      comment: '',
    })),
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const close = () => {
    if (!saving) onClose()
  }
  useKeyboardShortcuts({ Escape: close })

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const updateDishReview = (index, field, value) => {
    setDishReviews((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.restaurantRating) nextErrors.restaurantRating = 'Vui lòng chấm sao cho nhà hàng'
    if (order.shipper && !form.shipperRating) nextErrors.shipperRating = 'Vui lòng chấm sao cho shipper'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const response = await reviewApi.createReview(order._id, {
        restaurantRating: form.restaurantRating,
        comment: form.comment.trim(),
        shipperRating: order.shipper ? form.shipperRating : null,
        shipperComment: order.shipper ? form.shipperComment.trim() : '',
        dishReviews: dishReviews.map((d) => ({
          menuItem: d.menuItem,
          dishName: d.dishName,
          dishImage: d.dishImage,
          optionsSummary: d.optionsSummary,
          rating: d.rating,
          comment: d.comment.trim(),
        })),
      })
      toast.success(response.message)
      onSubmitted(response.data)
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field, message])))
      toast.error(error.response?.data?.message || 'Không gửi được đánh giá')
      setSaving(false)
    }
  }

  // In document.body so a parent's space-y-* margin cannot shift the overlay
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={close}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Đánh giá đơn hàng"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">Đánh giá đơn hàng</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <OrderBrief order={order} />
          </div>

          {dishReviews.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Utensils className="h-4 w-4 text-primary" />
                Đánh giá chất lượng món ăn
              </p>
              <div className="space-y-3">
                {dishReviews.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.dishImage ? (
                          <img
                            src={item.dishImage}
                            alt={item.dishName}
                            className="h-10 w-10 shrink-0 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            🍽️
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.dishName}</p>
                          {item.optionsSummary && (
                            <p className="text-[11px] text-slate-400 truncate">{item.optionsSummary}</p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StarRating
                          value={item.rating}
                          onChange={(val) => updateDishReview(idx, 'rating', val)}
                          size="md"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      maxLength={COMMENT_MAX_LENGTH}
                      value={item.comment}
                      onChange={(e) => updateDishReview(idx, 'comment', e.target.value)}
                      placeholder="Cảm nhận về món này (vị đậm đà, độ giòn/mềm...)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <RatingField
            icon={Store}
            title="Nhà hàng & dịch vụ quán"
            value={form.restaurantRating}
            error={errors.restaurantRating}
            onChange={(value) => updateField('restaurantRating', value)}
          />
          <div>
            <textarea
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              value={form.comment}
              onChange={(event) => updateField('comment', event.target.value)}
              placeholder="Món ăn có ngon không? Đóng gói thế nào? (không bắt buộc)"
              aria-label="Nhận xét về nhà hàng"
              className={textareaClass}
            />
            <p className="text-right text-xs text-slate-400">
              {form.comment.length}/{COMMENT_MAX_LENGTH}
            </p>
          </div>

          {order.shipper && (
            <>
              <RatingField
                icon={Bike}
                title={`Shipper ${order.shipper.fullName}`}
                value={form.shipperRating}
                error={errors.shipperRating}
                onChange={(value) => updateField('shipperRating', value)}
              />
              <div>
                <textarea
                  rows={2}
                  maxLength={SHIPPER_COMMENT_MAX_LENGTH}
                  value={form.shipperComment}
                  onChange={(event) => updateField('shipperComment', event.target.value)}
                  placeholder="Shipper giao hàng có đúng hẹn, lịch sự không? (không bắt buộc)"
                  aria-label="Nhận xét về shipper"
                  className={textareaClass}
                />
                <p className="text-right text-xs text-slate-400">
                  {form.shipperComment.length}/{SHIPPER_COMMENT_MAX_LENGTH}
                </p>
              </div>
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Để sau
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  )
}
