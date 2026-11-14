import { useEffect, useState } from 'react'
import { Check, ClipboardCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import driverApi from '../../../api/driverApi'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'

const STATUS_VIEW = {
  pending: {
    title: 'Hồ sơ tài xế đang chờ duyệt',
    text: 'Bạn chưa thể nhận đơn cho đến khi quản trị viên duyệt hồ sơ. Bạn có thể sửa lại thông tin trong lúc chờ.',
    className: 'border-amber-200 bg-amber-50',
  },
  rejected: {
    title: 'Hồ sơ tài xế chưa được duyệt',
    text: 'Hãy sửa các thông tin chưa đạt rồi bấm "Gửi lại hồ sơ" để quản trị viên duyệt lại.',
    className: 'border-red-200 bg-red-50',
  },
  suspended: {
    title: 'Tài khoản tài xế đang bị đình chỉ',
    text: 'Bạn không thể nhận đơn mới. Vui lòng liên hệ ban quản trị để được mở lại.',
    className: 'border-red-200 bg-red-50',
  },
}

const toForm = (application) => ({
  dateOfBirth: application.dateOfBirth,
  citizenId: application.citizenId,
  vehicleInfo: application.vehicleInfo,
  hasInsurance: application.hasInsurance,
  insuranceInfo: application.insuranceInfo,
  depositConfirmed: false,
  depositNote: '',
})

const inputClass = 'mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none'

/**
 * Profile of a shipper who is not approved yet (or suspended): the admin's reason, the registration checklist and,
 * while it can still be edited, the form that saves it (a rejected profile then goes back for review).
 * Renders nothing for an approved shipper.
 */
export default function ShipperApplicationCard() {
  const [application, setApplication] = useState(null)
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    driverApi
      .getApplication()
      .then((data) => {
        if (!active) return
        setApplication(data)
        setForm(toForm(data))
        setEditing(data.status === 'rejected')
      })
      // No profile (or the request failed): the dashboard keeps working without this card
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (!application || application.status === 'approved') return null
  const view = STATUS_VIEW[application.status] || STATUS_VIEW.pending

  const change = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key]
      return next
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await driverApi.resubmitApplication(form)
      toast.success(response.message)
      setApplication(response.data)
      setForm(toForm(response.data))
      setEditing(false)
    } catch (error) {
      const data = error.response?.data
      const fieldErrors = Object.fromEntries((data?.errors || []).map((item) => [item.field, item.message]))
      setErrors(fieldErrors)
      toast.error(data?.message || 'Không lưu được hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`rounded-xl border p-5 shadow-sm ${view.className}`} aria-labelledby="shipper-application-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="shipper-application-title" className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
            <ClipboardCheck className="h-5 w-5 text-brand" aria-hidden="true" />
            {view.title}
          </h2>
          <p className="mt-1 text-sm text-slate-700">{view.text}</p>
          {application.statusNote && application.status !== 'pending' && (
            <p className="mt-2 text-sm font-semibold text-red-800">
              Lý do từ quản trị viên: {application.statusNote}
              {application.statusChangedAt && (
                <span className="font-normal text-slate-500"> · {formatDateTime(application.statusChangedAt)}</span>
              )}
            </p>
          )}
        </div>
        {application.canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-brand px-3 py-1.5 text-sm font-bold text-brand hover:bg-white"
          >
            Sửa hồ sơ
          </button>
        )}
      </div>

      <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
        {application.checklist.map((item) => (
          <li key={item.key} className="flex items-start gap-2">
            {item.ok ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Đạt" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Chưa đạt" />
            )}
            <span className={item.ok ? 'text-slate-700' : 'font-semibold text-slate-900'}>
              {item.label}
              {!item.required && <span className="font-normal text-slate-500"> (không bắt buộc)</span>}
            </span>
          </li>
        ))}
      </ul>

      {application.canEdit && editing && form && (
        <form onSubmit={submit} className="mt-5 grid gap-4 rounded-lg bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-800">
            Ngày sinh
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => change({ dateOfBirth: event.target.value })}
              className={inputClass}
              required
            />
            {errors.dateOfBirth && <span className="mt-1 block text-xs font-medium text-red-600">{errors.dateOfBirth}</span>}
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Số CCCD
            <input
              inputMode="numeric"
              value={form.citizenId}
              onChange={(event) => change({ citizenId: event.target.value.replace(/\D/g, '').slice(0, 12) })}
              placeholder="9-12 chữ số"
              className={inputClass}
              required
            />
            {errors.citizenId && <span className="mt-1 block text-xs font-medium text-red-600">{errors.citizenId}</span>}
          </label>
          <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
            Loại xe và biển số xe
            <input
              value={form.vehicleInfo}
              onChange={(event) => change({ vehicleInfo: event.target.value })}
              placeholder="Ví dụ: Honda Wave Alpha · 29B1-123.45"
              maxLength={200}
              className={inputClass}
              required
            />
            {errors.vehicleInfo && <span className="mt-1 block text-xs font-medium text-red-600">{errors.vehicleInfo}</span>}
          </label>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={form.hasInsurance}
                onChange={(event) => change({ hasInsurance: event.target.checked })}
                className="h-4 w-4 accent-brand"
              />
              Đã có bảo hiểm trách nhiệm dân sự xe máy
            </label>
            {form.hasInsurance && (
              <input
                value={form.insuranceInfo}
                onChange={(event) => change({ insuranceInfo: event.target.value })}
                placeholder="Số hợp đồng / nhà bảo hiểm"
                maxLength={200}
                className={inputClass}
              />
            )}
          </div>
          {!application.deposit.isPaid && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 sm:col-span-2">
              <label className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={form.depositConfirmed}
                  onChange={(event) => change({ depositConfirmed: event.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                Tôi đã chuyển khoản tiền ký quỹ {formatCurrency(application.deposit.amount)}
              </label>
              {form.depositConfirmed && (
                <input
                  value={form.depositNote}
                  onChange={(event) => change({ depositNote: event.target.value })}
                  placeholder="Nội dung / mã giao dịch chuyển khoản"
                  maxLength={200}
                  className={inputClass}
                />
              )}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            {application.status !== 'rejected' && (
              <button
                type="button"
                onClick={() => {
                  setForm(toForm(application))
                  setErrors({})
                  setEditing(false)
                }}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : application.status === 'rejected' ? 'Gửi lại hồ sơ' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
