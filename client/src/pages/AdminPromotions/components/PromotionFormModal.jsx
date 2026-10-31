import { useState } from 'react'
import toast from 'react-hot-toast'
import promotionRuleApi from '../../../api/promotionRuleApi.js'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminModal from '../../../components/AdminModal/AdminModal.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'
import { toDateTimeLocalValue } from '../../../utils/formatDate.js'

const FORM_ID = 'promotion-form'
const DEFAULT_DURATION_MS = 30 * 24 * 60 * 60 * 1000

// Number fields are kept as digit strings ('' = empty)
const toFormState = (promotion) => {
  const startDate = promotion ? new Date(promotion.startDate) : new Date()
  return {
    code: promotion?.code || '',
    title: promotion?.title || '',
    description: promotion?.description || '',
    discountType: promotion?.discountType || 'percentage',
    discountValue: promotion ? String(promotion.discountValue) : '',
    maxDiscount: promotion?.maxDiscount ? String(promotion.maxDiscount) : '',
    minOrderValue: promotion ? String(promotion.minOrderValue) : '0',
    startDate: toDateTimeLocalValue(startDate),
    endDate: toDateTimeLocalValue(promotion ? promotion.endDate : startDate.getTime() + DEFAULT_DURATION_MS),
    hasLimit: promotion ? promotion.usageLimit !== null : true,
    usageLimit: promotion?.usageLimit ? String(promotion.usageLimit) : '100',
    isActive: promotion?.isActive ?? true,
  }
}

const toPayload = (form) => ({
  code: form.code.trim(),
  title: form.title.trim(),
  description: form.description.trim(),
  discountType: form.discountType,
  discountValue: Number(form.discountValue),
  maxDiscount: form.discountType === 'percentage' && form.maxDiscount ? Number(form.maxDiscount) : null,
  minOrderValue: Number(form.minOrderValue || 0),
  startDate: new Date(form.startDate).toISOString(),
  endDate: new Date(form.endDate).toISOString(),
  usageLimit: form.hasLimit ? Number(form.usageLimit) : null,
  isActive: form.isActive,
})

/**
 * UC41 - create / edit a promotion code (same PromotionRule that checkout applies).
 * A code already used by customers keeps its name; it can be turned off instead of deleted.
 * Once it started (or was used) its discount terms are locked, like the server does.
 */
export default function PromotionFormModal({ promotion, onClose, onSaved }) {
  const [form, setForm] = useState(() => toFormState(promotion))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const isCodeLocked = promotion?.usedCount > 0
  // Read once when the form opens; the server checks again when saving
  const [isTermsLocked] = useState(
    () => Boolean(promotion) && (promotion.usedCount > 0 || new Date(promotion.startDate) <= new Date()),
  )

  const update = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }))
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(changes).map((key) => [key, ''])) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.discountValue) nextErrors.discountValue = 'Vui lòng nhập mức giảm'
    if (!form.startDate) nextErrors.startDate = 'Vui lòng chọn thời gian bắt đầu'
    if (!form.endDate) nextErrors.endDate = 'Vui lòng chọn thời gian kết thúc'
    if (form.hasLimit && !Number(form.usageLimit)) nextErrors.usageLimit = 'Vui lòng nhập số lượt sử dụng'
    if (!isTermsLocked && form.discountType === 'fixed' && Number(form.minOrderValue || 0) < Number(form.discountValue)) {
      nextErrors.minOrderValue = 'Với mã giảm số tiền cố định, giá trị đơn tối thiểu phải từ mức giảm trở lên'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const response = promotion
        ? await promotionRuleApi.updatePromotion(promotion._id, toPayload(form))
        : await promotionRuleApi.createPromotion(toPayload(form))
      toast.success(response.message)
      onSaved()
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field, message])))
      toast.error(error.response?.data?.message || 'Không lưu được mã khuyến mãi')
      setSaving(false)
    }
  }

  const isPercentage = form.discountType === 'percentage'

  return (
    <AdminModal
      title={promotion ? `Sửa mã ${promotion.code}` : 'Tạo mã khuyến mãi'}
      subtitle="Khách nhập mã ở bước thanh toán để được giảm giá"
      closeDisabled={saving}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={ADMIN_BUTTON.secondary}>
            Hủy
          </button>
          <button type="submit" form={FORM_ID} disabled={saving} className={ADMIN_BUTTON.primary}>
            {saving ? 'Đang lưu...' : 'Lưu mã khuyến mãi'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {isTermsLocked && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200 sm:col-span-2">
            Mã đã bắt đầu áp dụng nên giữ nguyên điều kiện giảm giá và thời gian bắt đầu. Vẫn sửa được tên, mô tả,
            thời gian kết thúc, số lượt và bật / tắt. Muốn đổi điều kiện, hãy tắt mã này và tạo mã mới.
          </p>
        )}
        <div>
          <label htmlFor="promotion-code" className={ADMIN_LABEL}>
            Mã khuyến mãi *
          </label>
          <input
            id="promotion-code"
            value={form.code}
            onChange={(event) => update({ code: event.target.value.toUpperCase() })}
            disabled={isCodeLocked}
            maxLength={20}
            placeholder="VD: CHAOBAN20"
            className={`${ADMIN_INPUT} font-mono uppercase`}
          />
          {isCodeLocked && (
            <p className="mt-1 text-xs text-slate-500">Mã đã được dùng {promotion.usedCount} lần nên không đổi được.</p>
          )}
          <AdminFieldError message={errors.code} />
        </div>

        <div>
          <label htmlFor="promotion-title" className={ADMIN_LABEL}>
            Tên chương trình *
          </label>
          <input
            id="promotion-title"
            value={form.title}
            onChange={(event) => update({ title: event.target.value })}
            maxLength={80}
            placeholder="VD: Giảm 20% cho khách mới"
            className={ADMIN_INPUT}
          />
          <AdminFieldError message={errors.title} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="promotion-description" className={ADMIN_LABEL}>
            Mô tả
          </label>
          <textarea
            id="promotion-description"
            rows={2}
            maxLength={300}
            value={form.description}
            onChange={(event) => update({ description: event.target.value })}
            className={`${ADMIN_INPUT} resize-none`}
          />
        </div>

        <div>
          <p className={ADMIN_LABEL}>Loại giảm giá *</p>
          <div className="flex gap-2">
            {[
              ['percentage', 'Theo %'],
              ['fixed', 'Số tiền cố định'],
            ].map(([value, label]) => (
              <label
                key={value}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  isTermsLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                  form.discountType === value
                    ? 'border-primary bg-primary/10 text-primary-dark dark:text-orange-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/60'
                }`}
              >
                <input
                  type="radio"
                  name="discountType"
                  checked={form.discountType === value}
                  onChange={() => update({ discountType: value, discountValue: '' })}
                  disabled={isTermsLocked}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="promotion-value" className={ADMIN_LABEL}>
            {isPercentage ? 'Phần trăm giảm (%) *' : 'Số tiền giảm (đ) *'}
          </label>
          <input
            id="promotion-value"
            inputMode="numeric"
            value={isPercentage ? form.discountValue : formatNumber(form.discountValue)}
            onChange={(event) => update({ discountValue: parseNumberInput(event.target.value) })}
            disabled={isTermsLocked}
            placeholder={isPercentage ? 'VD: 20' : 'VD: 30.000'}
            className={ADMIN_INPUT}
          />
          <AdminFieldError message={errors.discountValue} />
        </div>

        {isPercentage && (
          <div>
            <label htmlFor="promotion-max" className={ADMIN_LABEL}>
              Giảm tối đa (đ)
            </label>
            <input
              id="promotion-max"
              inputMode="numeric"
              value={formatNumber(form.maxDiscount)}
              onChange={(event) => update({ maxDiscount: parseNumberInput(event.target.value) })}
              disabled={isTermsLocked}
              placeholder="Để trống = không giới hạn"
              className={ADMIN_INPUT}
            />
            <AdminFieldError message={errors.maxDiscount} />
          </div>
        )}

        <div>
          <label htmlFor="promotion-min-order" className={ADMIN_LABEL}>
            Giá trị đơn tối thiểu (đ)
          </label>
          <input
            id="promotion-min-order"
            inputMode="numeric"
            value={formatNumber(form.minOrderValue)}
            onChange={(event) => update({ minOrderValue: parseNumberInput(event.target.value) })}
            disabled={isTermsLocked}
            placeholder="0"
            className={ADMIN_INPUT}
          />
          <AdminFieldError message={errors.minOrderValue} />
        </div>

        <div>
          <label htmlFor="promotion-start" className={ADMIN_LABEL}>
            Bắt đầu *
          </label>
          <input
            id="promotion-start"
            type="datetime-local"
            value={form.startDate}
            onChange={(event) => update({ startDate: event.target.value })}
            disabled={isTermsLocked}
            className={`${ADMIN_INPUT} dark:[color-scheme:dark]`}
          />
          <AdminFieldError message={errors.startDate} />
        </div>

        <div>
          <label htmlFor="promotion-end" className={ADMIN_LABEL}>
            Kết thúc *
          </label>
          <input
            id="promotion-end"
            type="datetime-local"
            min={form.startDate}
            value={form.endDate}
            onChange={(event) => update({ endDate: event.target.value })}
            className={`${ADMIN_INPUT} dark:[color-scheme:dark]`}
          />
          <AdminFieldError message={errors.endDate} />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.hasLimit}
              onChange={(event) => update({ hasLimit: event.target.checked })}
              className="accent-primary"
            />
            Giới hạn số lượt sử dụng
          </label>
          {form.hasLimit && (
            <input
              inputMode="numeric"
              aria-label="Số lượt sử dụng tối đa"
              value={formatNumber(form.usageLimit)}
              onChange={(event) => update({ usageLimit: parseNumberInput(event.target.value) })}
              className={ADMIN_INPUT}
            />
          )}
          {promotion && <p className="mt-1 text-xs text-slate-500">Đã dùng {promotion.usedCount} lượt.</p>}
          <AdminFieldError message={errors.usageLimit} />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => update({ isActive: event.target.checked })}
              className="accent-primary"
            />
            Đang bật (bỏ chọn để tạm ngưng mã)
          </label>
        </div>
      </form>
    </AdminModal>
  )
}
