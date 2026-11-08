import { useState } from 'react'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import restaurantVoucherApi from '../../../api/restaurantVoucherApi.js'
import { formatCurrency, formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'
import { toDateTimeLocalValue } from '../../../utils/formatDate.js'
import { DISCOUNT_TYPES, PER_CUSTOMER_MAX } from '../constants.js'

const inputClass =
  'w-full rounded-md border border-brand-soft bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15'
const SAMPLE_SUBTOTAL = 200000 // example order shown under the form
const DAY_MS = 24 * 60 * 60 * 1000

// Number inputs are kept as digit strings ('' = empty)
function toFormState(voucher) {
  const now = Date.now()
  return {
    code: voucher?.code || '',
    title: voucher?.title || '',
    discountType: voucher?.discountType || 'fixed',
    discountValue: voucher ? String(voucher.discountValue) : '',
    maxDiscount: voucher?.maxDiscount ? String(voucher.maxDiscount) : '',
    minOrderValue: voucher ? String(voucher.minOrderValue || '') : '',
    startAt: toDateTimeLocalValue(voucher?.startAt || now),
    endAt: toDateTimeLocalValue(voucher?.endAt || now + 7 * DAY_MS),
    usageLimit: voucher?.usageLimit ? String(voucher.usageLimit) : '',
    perCustomerLimit: String(voucher?.perCustomerLimit || 1),
  }
}

function toPayload(form) {
  const isPercentage = form.discountType === 'percentage'
  return {
    code: form.code.trim(),
    title: form.title.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    ...(isPercentage && { maxDiscount: Number(form.maxDiscount) || 0 }),
    minOrderValue: Number(form.minOrderValue) || 0,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    perCustomerLimit: Number(form.perCustomerLimit) || 1,
  }
}

// Example of what a 200.000đ order would get (same rule as the server)
function sampleDiscount(payload) {
  if (SAMPLE_SUBTOTAL < payload.minOrderValue || !payload.discountValue) return 0
  const raw =
    payload.discountType === 'percentage'
      ? Math.round((SAMPLE_SUBTOTAL * payload.discountValue) / 100)
      : payload.discountValue
  const capped = payload.discountType === 'percentage' && payload.maxDiscount ? Math.min(raw, payload.maxDiscount) : raw
  return Math.min(capped, SAMPLE_SUBTOTAL)
}

/**
 * Create or edit a restaurant voucher. The server checks every rule again.
 * @param {object|null} voucher - null = new voucher
 */
export default function VoucherFormModal({ voucher, onClose, onSaved }) {
  const [form, setForm] = useState(() => toFormState(voucher))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const isPercentage = form.discountType === 'percentage'
  const payload = toPayload(form)
  const example = sampleDiscount(payload)

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '', form: '' }))
  }
  const changeNumber = (field) => (event) => change(field, parseNumberInput(event.target.value))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = voucher
        ? await restaurantVoucherApi.updateVoucher(voucher._id, payload)
        : await restaurantVoucherApi.createVoucher(payload)
      toast.success(response.message)
      onSaved()
    } catch (error) {
      const data = error.response?.data
      const fieldErrors = Object.fromEntries(
        (data?.errors || []).map(({ field, message }) => [field || 'form', message]),
      )
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: data?.message || 'Không lưu được mã giảm giá' })
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (field) => errors[field] && <p className="mt-1 text-xs text-red-600">{errors[field]}</p>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="voucher-form-title">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl" noValidate>
        <div className="sticky top-0 flex items-center justify-between border-b border-brand-soft/60 bg-white px-5 py-4">
          <h2 id="voucher-form-title" className="font-serif text-xl font-semibold text-slate-900">
            {voucher ? `Sửa mã ${voucher.code}` : 'Tạo mã giảm giá của quán'}
          </h2>
          <button type="button" onClick={onClose} disabled={saving} className="rounded p-1 text-slate-500 hover:bg-brand-light" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="voucher-code" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Mã giảm giá <span className="text-brand">*</span>
              </label>
              <input
                id="voucher-code"
                className={`${inputClass} mt-1 font-mono uppercase`}
                value={form.code}
                maxLength={20}
                placeholder="VD: GIAM20K"
                onChange={(event) => change('code', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
              <p className="mt-1 text-[11px] text-slate-500">4–20 chữ cái/chữ số, khách chọn mã này ở bước thanh toán</p>
              {fieldError('code')}
            </div>
            <div>
              <label htmlFor="voucher-title" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Tên chương trình <span className="text-brand">*</span>
              </label>
              <input
                id="voucher-title"
                className={`${inputClass} mt-1`}
                value={form.title}
                maxLength={60}
                placeholder="VD: Mừng khai trương"
                onChange={(event) => change('title', event.target.value)}
              />
              {fieldError('title')}
            </div>
          </div>

          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wide text-slate-800">Kiểu giảm giá</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {DISCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  aria-pressed={form.discountType === type.value}
                  onClick={() => change('discountType', type.value)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    form.discountType === type.value ? 'border-brand bg-brand-light font-bold text-brand' : 'border-brand-soft text-slate-700'
                  }`}
                >
                  {type.label}
                  <span className="block text-[11px] font-normal text-slate-500">{type.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="voucher-value" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                {isPercentage ? 'Phần trăm giảm' : 'Số tiền giảm'} <span className="text-brand">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  id="voucher-value"
                  inputMode="numeric"
                  className={`${inputClass} pr-8`}
                  value={isPercentage ? form.discountValue : formatNumber(form.discountValue)}
                  placeholder={isPercentage ? '1–100' : '20.000'}
                  onChange={changeNumber('discountValue')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{isPercentage ? '%' : 'đ'}</span>
              </div>
              {fieldError('discountValue')}
            </div>
            {isPercentage && (
              <div>
                <label htmlFor="voucher-max" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  Giảm tối đa <span className="text-brand">*</span>
                </label>
                <div className="relative mt-1">
                  <input id="voucher-max" inputMode="numeric" className={`${inputClass} pr-8`} value={formatNumber(form.maxDiscount)} placeholder="30.000" onChange={changeNumber('maxDiscount')} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">đ</span>
                </div>
                {fieldError('maxDiscount')}
              </div>
            )}
            <div>
              <label htmlFor="voucher-min" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Đơn tối thiểu
              </label>
              <div className="relative mt-1">
                <input id="voucher-min" inputMode="numeric" className={`${inputClass} pr-8`} value={formatNumber(form.minOrderValue)} placeholder="0" onChange={changeNumber('minOrderValue')} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">đ</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Tính trên tiền món</p>
              {fieldError('minOrderValue')}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="voucher-start" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Bắt đầu <span className="text-brand">*</span>
              </label>
              <input id="voucher-start" type="datetime-local" className={`${inputClass} mt-1`} value={form.startAt} onChange={(event) => change('startAt', event.target.value)} />
              {fieldError('startAt')}
            </div>
            <div>
              <label htmlFor="voucher-end" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Kết thúc <span className="text-brand">*</span>
              </label>
              <input id="voucher-end" type="datetime-local" className={`${inputClass} mt-1`} value={form.endAt} onChange={(event) => change('endAt', event.target.value)} />
              {fieldError('endAt')}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="voucher-limit" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Tổng lượt dùng
              </label>
              <input id="voucher-limit" inputMode="numeric" className={`${inputClass} mt-1`} value={form.usageLimit} placeholder="Để trống = không giới hạn" onChange={changeNumber('usageLimit')} />
              <p className="mt-1 text-[11px] text-slate-500">Giới hạn ngân sách khuyến mãi của quán</p>
              {fieldError('usageLimit')}
            </div>
            <div>
              <label htmlFor="voucher-per-customer" className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Lượt dùng mỗi khách
              </label>
              <input
                id="voucher-per-customer"
                type="number"
                min={1}
                max={PER_CUSTOMER_MAX}
                className={`${inputClass} mt-1`}
                value={form.perCustomerLimit}
                onChange={(event) => change('perCustomerLimit', event.target.value)}
              />
              {fieldError('perCustomerLimit')}
            </div>
          </div>

          <p className="rounded-lg bg-brand-light/70 px-3 py-2 text-sm text-slate-700">
            Ví dụ đơn {formatCurrency(SAMPLE_SUBTOTAL)} tiền món:{' '}
            {example > 0 ? (
              <>
                khách được giảm <b className="text-brand">{formatCurrency(example)}</b>, quán chịu khoản này (trừ vào thực nhận, không tính
                hoa hồng trên phần giảm).
              </>
            ) : (
              'chưa đủ điều kiện áp dụng.'
            )}
          </p>
          {errors.form && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-brand-soft/60 bg-white px-5 py-3">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md bg-brand-light px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-soft">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60">
            {saving ? 'Đang lưu…' : voucher ? 'Lưu thay đổi' : 'Tạo mã'}
          </button>
        </div>
      </form>
    </div>
  )
}
