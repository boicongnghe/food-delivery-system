import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Star } from 'lucide-react'
import reviewApi from '../../../api/reviewApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import StarRating from '../../../components/StarRating/StarRating.jsx'
import { ADMIN_BUTTON } from '../../../utils/adminClassNames.js'
import { REVIEW_HIDE_REASON_LABELS } from '../../../utils/feedbackLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import HideReviewForm from './HideReviewForm.jsx'

const FORM_ID = 'hide-review-form'
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * UC43 - review detail (View review detail) + hide a violating review or restore it. Mount with key={reviewId}.
 * Hiding / restoring recalculates the restaurant and shipper ratings on the server.
 */
export default function ReviewDetailDrawer({ reviewId, onClose, onChanged }) {
  const [review, setReview] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ reason: '', note: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false

    reviewApi
      .getReview(reviewId)
      .then((response) => {
        if (!ignore) setReview(response.data)
      })
      .catch((error) => {
        if (!ignore) setLoadError(getErrorMessage(error, 'Không tải được đánh giá'))
      })

    return () => {
      ignore = true
    }
  }, [reviewId])

  const changeVisibility = async (payload) => {
    setSaving(true)
    try {
      const response = await reviewApi.setVisibility(reviewId, payload)
      setReview(response.data)
      setForm({ reason: '', note: '' })
      toast.success(response.message)
      onChanged()
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field, message])))
      toast.error(getErrorMessage(error, 'Không cập nhật được đánh giá'))
    } finally {
      setSaving(false)
    }
  }

  const handleHide = (event) => {
    event.preventDefault()
    if (!form.reason) {
      setErrors({ reason: 'Vui lòng chọn lý do ẩn đánh giá' })
      return
    }
    if (form.reason === 'other' && form.note.trim().length < 3) {
      setErrors({ note: 'Vui lòng ghi rõ lý do (ít nhất 3 ký tự)' })
      return
    }
    changeVisibility({ isHidden: true, reason: form.reason, note: form.note.trim() })
  }

  const footer = review && (
    <div className="flex justify-end gap-2">
      {review.isHidden ? (
        <button
          type="button"
          onClick={() => changeVisibility({ isHidden: false })}
          disabled={saving}
          className={ADMIN_BUTTON.success}
        >
          <Eye className="h-3.5 w-3.5" /> {saving ? 'Đang lưu...' : 'Hiển thị lại'}
        </button>
      ) : (
        <button type="submit" form={FORM_ID} disabled={saving} className={ADMIN_BUTTON.danger}>
          <EyeOff className="h-3.5 w-3.5" /> {saving ? 'Đang lưu...' : 'Ẩn đánh giá vi phạm'}
        </button>
      )}
    </div>
  )

  return (
    <AdminDrawer
      title={review ? `Đánh giá đơn ${review.orderCode}` : 'Đánh giá'}
      subtitle={review && `Gửi lúc ${formatDateTime(review.createdAt)}`}
      badge={
        review &&
        (review.isHidden ? <AdminBadge tone="red">Đã ẩn</AdminBadge> : <AdminBadge tone="emerald">Đang hiển thị</AdminBadge>)
      }
      footer={footer}
      closeDisabled={saving}
      onClose={onClose}
    >
      {loadError && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{loadError}</p>
      )}
      {!review && !loadError && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {review && (
        <>
          <AdminSection title="Đánh giá nhà hàng" aside={<StarRating value={review.restaurantRating} emptyClassName="text-slate-300 dark:text-slate-700" />}>
            <p className="rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4 text-sm text-slate-800 dark:text-slate-200">
              {review.comment || <span className="italic text-slate-500">Không có nhận xét</span>}
            </p>
          </AdminSection>

          {review.shipperRating && (
            <AdminSection
              title={`Đánh giá shipper ${review.shipper?.fullName || ''}`}
              aside={<StarRating value={review.shipperRating} emptyClassName="text-slate-300 dark:text-slate-700" />}
            >
              <p className="rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4 text-sm text-slate-800 dark:text-slate-200">
                {review.shipperComment || <span className="italic text-slate-500">Không có nhận xét</span>}
              </p>
            </AdminSection>
          )}

          <AdminSection title="Thông tin liên quan">
            <AdminInfoRow label="Khách hàng">
              {review.customer?.fullName} · {review.customer?.email}
            </AdminInfoRow>
            <AdminInfoRow label="Nhà hàng">
              <span className="inline-flex items-center gap-1">
                {review.restaurant?.name} · <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-600 dark:text-amber-400" />
                {review.restaurant?.rating} ({review.restaurant?.ratingCount} lượt)
              </span>
            </AdminInfoRow>
            <AdminInfoRow label="Đơn hàng">
              {review.order?.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')} ·{' '}
              {formatCurrency(review.order?.total)}
            </AdminInfoRow>
          </AdminSection>

          <AdminSection title="Kiểm duyệt">
            {review.isHidden ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
                <p className="font-bold text-red-700 dark:text-red-200">{REVIEW_HIDE_REASON_LABELS[review.moderation.reason]}</p>
                {review.moderation.note && <p className="mt-1 text-slate-700 dark:text-slate-300">{review.moderation.note}</p>}
                <p className="mt-2 text-xs text-slate-500">
                  Ẩn bởi {review.moderation.by?.fullName || 'quản trị viên'} · {formatDateTime(review.moderation.at)}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Đánh giá đang ẩn không được tính vào điểm của quán và shipper.</p>
              </div>
            ) : (
              <HideReviewForm
                formId={FORM_ID}
                form={form}
                errors={errors}
                disabled={saving}
                onChange={(changes) => {
                  setForm((prev) => ({ ...prev, ...changes }))
                  setErrors({})
                }}
                onSubmit={handleHide}
              />
            )}
          </AdminSection>
        </>
      )}
    </AdminDrawer>
  )
}
