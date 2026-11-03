import { useState } from 'react'
import toast from 'react-hot-toast'
import { Info } from 'lucide-react'
import commissionRuleApi from '../../../api/commissionRuleApi.js'
import AdminFieldError from '../../../components/AdminFieldError/AdminFieldError.jsx'
import AdminModal from '../../../components/AdminModal/AdminModal.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { TARGETS } from '../constants.js'
import RestaurantPicker from './RestaurantPicker.jsx'

const FORM_ID = 'commission-rule-form'

const toFormState = (rule, today) => ({
  name: rule?.name || '',
  target: rule?.target || 'restaurant',
  scope: rule?.restaurant ? 'one' : 'all',
  restaurant: rule?.restaurant?._id || '',
  rate: rule ? String(rule.rate) : '',
  effectiveFrom: rule?.effectiveFrom || today,
  hasEnd: Boolean(rule?.effectiveTo),
  effectiveTo: rule?.effectiveTo || '',
  note: rule?.note || '',
})

const radioClass = (checked, disabled) =>
  `flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
    checked ? 'border-primary bg-primary/10 text-primary-dark dark:text-orange-200' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
  } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/60'}`

/**
 * UC40 - create / edit a commission rule. `today` is the server's Vietnam day ("YYYY-MM-DD").
 * A rule that already started only allows name, note and end date (the server enforces the same).
 */
export default function CommissionRuleFormModal({ rule, today, onClose, onSaved }) {
  const [form, setForm] = useState(() => toFormState(rule, today))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const isStarted = Boolean(rule) && rule.state !== 'upcoming'

  const update = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }))
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(changes).map((key) => [key, ''])) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (form.target === 'restaurant' && form.scope === 'one' && !form.restaurant) {
      nextErrors.restaurant = 'Vui lòng chọn nhà hàng'
    }
    if (form.rate === '') nextErrors.rate = 'Vui lòng nhập tỷ lệ hoa hồng'
    if (form.hasEnd && !form.effectiveTo) nextErrors.effectiveTo = 'Vui lòng chọn ngày kết thúc'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      name: form.name.trim(),
      target: form.target,
      restaurant: form.target === 'restaurant' && form.scope === 'one' ? form.restaurant : null,
      rate: Number(form.rate),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.hasEnd ? form.effectiveTo : null,
      note: form.note.trim(),
    }

    setSaving(true)
    try {
      const response = rule
        ? await commissionRuleApi.updateRule(rule._id, payload)
        : await commissionRuleApi.createRule(payload)
      toast.success(response.message)
      onSaved()
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field, message])))
      toast.error(error.response?.data?.message || 'Không lưu được quy tắc hoa hồng')
      setSaving(false)
    }
  }

  return (
    <AdminModal
      title={rule ? 'Sửa quy tắc hoa hồng' : 'Thêm quy tắc hoa hồng'}
      subtitle="Tỷ lệ phần trăm nền tảng thu trên mỗi đơn giao thành công"
      closeDisabled={saving}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={ADMIN_BUTTON.secondary}>
            Hủy
          </button>
          <button type="submit" form={FORM_ID} disabled={saving} className={ADMIN_BUTTON.primary}>
            {saving ? 'Đang lưu...' : 'Lưu quy tắc'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        {isStarted && (
          <p className="flex gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-200">
            <Info className="h-4 w-4 shrink-0" />
            Quy tắc đã được áp dụng nên chỉ sửa được tên, ghi chú và ngày kết thúc. Muốn đổi tỷ lệ, hãy kết thúc quy
            tắc này và tạo quy tắc mới từ ngày mai.
          </p>
        )}

        <div>
          <label htmlFor="rule-name" className={ADMIN_LABEL}>
            Tên quy tắc *
          </label>
          <input
            id="rule-name"
            value={form.name}
            onChange={(event) => update({ name: event.target.value })}
            maxLength={80}
            placeholder="VD: Hoa hồng mặc định nhà hàng 2027"
            className={ADMIN_INPUT}
          />
          <AdminFieldError message={errors.name} />
        </div>

        <fieldset disabled={isStarted} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className={ADMIN_LABEL}>Thu phí từ *</p>
            <div className="flex gap-2">
              {Object.entries(TARGETS).map(([value, target]) => (
                <label key={value} className={radioClass(form.target === value, isStarted)}>
                  <input
                    type="radio"
                    name="target"
                    value={value}
                    checked={form.target === value}
                    onChange={() => update({ target: value })}
                    className="accent-primary"
                  />
                  {target.label}
                </label>
              ))}
            </div>
            <AdminFieldError message={errors.target} />
          </div>

          <div>
            <label htmlFor="rule-rate" className={ADMIN_LABEL}>
              Tỷ lệ (% {TARGETS[form.target].base}) *
            </label>
            <input
              id="rule-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.rate}
              onChange={(event) => update({ rate: event.target.value })}
              placeholder="VD: 15"
              className={ADMIN_INPUT}
            />
            <AdminFieldError message={errors.rate} />
          </div>

          {form.target === 'restaurant' && (
            <div className="sm:col-span-2">
              <p className={ADMIN_LABEL}>Phạm vi áp dụng *</p>
              <div className="mb-2 flex flex-wrap gap-2">
                <label className={radioClass(form.scope === 'all', isStarted)}>
                  <input
                    type="radio"
                    name="scope"
                    checked={form.scope === 'all'}
                    onChange={() => update({ scope: 'all' })}
                    className="accent-primary"
                  />
                  Tất cả nhà hàng (mặc định)
                </label>
                <label className={radioClass(form.scope === 'one', isStarted)}>
                  <input
                    type="radio"
                    name="scope"
                    checked={form.scope === 'one'}
                    onChange={() => update({ scope: 'one' })}
                    className="accent-primary"
                  />
                  Riêng một nhà hàng
                </label>
              </div>
              {form.scope === 'one' && (
                <RestaurantPicker
                  value={form.restaurant}
                  initialRestaurant={rule?.restaurant || null}
                  disabled={isStarted}
                  onChange={(restaurant) => update({ restaurant })}
                />
              )}
              <AdminFieldError message={errors.restaurant} />
            </div>
          )}

          <div>
            <label htmlFor="rule-from" className={ADMIN_LABEL}>
              Áp dụng từ ngày *
            </label>
            <input
              id="rule-from"
              type="date"
              min={isStarted ? undefined : today}
              value={form.effectiveFrom}
              onChange={(event) => update({ effectiveFrom: event.target.value })}
              className={`${ADMIN_INPUT} [color-scheme:dark]`}
            />
            <AdminFieldError message={errors.effectiveFrom} />
          </div>
        </fieldset>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.hasEnd}
              onChange={(event) => update({ hasEnd: event.target.checked })}
              className="accent-primary"
            />
            Có ngày kết thúc (bỏ chọn = áp dụng không thời hạn)
          </label>
          {form.hasEnd && (
            <input
              type="date"
              aria-label="Ngày kết thúc"
              min={isStarted ? today : form.effectiveFrom}
              value={form.effectiveTo}
              onChange={(event) => update({ effectiveTo: event.target.value })}
              className={`${ADMIN_INPUT} [color-scheme:dark] sm:w-1/2`}
            />
          )}
          <AdminFieldError message={errors.effectiveTo} />
        </div>

        <div>
          <label htmlFor="rule-note" className={ADMIN_LABEL}>
            Ghi chú
          </label>
          <textarea
            id="rule-note"
            rows={2}
            maxLength={200}
            value={form.note}
            onChange={(event) => update({ note: event.target.value })}
            className={`${ADMIN_INPUT} resize-none`}
          />
        </div>
      </form>
    </AdminModal>
  )
}
