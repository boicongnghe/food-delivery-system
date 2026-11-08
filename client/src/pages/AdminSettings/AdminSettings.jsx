import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Info, RotateCcw, Save, Timer } from 'lucide-react'
import settingApi from '../../api/settingApi.js'
import AdminFieldError from '../../components/AdminFieldError/AdminFieldError.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT } from '../../utils/adminClassNames.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { ACTIVE_FIELDS, PENDING_FIELDS } from './constants.js'

// API errors look like [{ field: 'acceptTimeout', message }]
const toFieldErrors = (apiErrors = []) => Object.fromEntries(apiErrors.map(({ field, message }) => [field, message]))

function SettingRow({ field, value, defaultValue, error, onChange }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <label htmlFor={`setting-${field.key}`} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800">
            {field.rule}
          </span>
          {field.label}
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Mặc định {defaultValue} {field.unit || 'phút'}
          {field.owner && ` · chờ module ${field.owner} áp dụng`}
        </p>
        <AdminFieldError message={error} />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`setting-${field.key}`}
          type="number"
          min={field.min}
          max={field.max}
          step={1}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value === '' ? '' : Number(event.target.value))}
          className={`${ADMIN_INPUT} w-24 text-right tabular-nums`}
        />
        <span className="w-8 text-xs text-slate-500">{field.unit || 'phút'}</span>
      </div>
    </div>
  )
}

// Order timeout rules: the admin tunes the BA assumptions without a new deployment
export default function AdminSettings() {
  const [settings, setSettings] = useState(null) // { values, defaults, updatedAt, updatedBy }
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false
    settingApi
      .getOrderTimeouts()
      .then((response) => {
        if (ignore) return
        setSettings(response.data)
        setForm(response.data.values)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được cấu hình')
      })
    return () => {
      ignore = true
    }
  }, [])

  const change = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await settingApi.updateOrderTimeouts(form)
      setSettings(response.data)
      setForm(response.data.values)
      setErrors({})
      toast.success(response.message)
    } catch (error) {
      const data = error.response?.data
      setErrors(toFieldErrors(data?.errors))
      toast.error(data?.message || 'Không lưu được cấu hình')
    } finally {
      setSaving(false)
    }
  }

  const isDirty = settings && form && JSON.stringify(form) !== JSON.stringify(settings.values)

  return (
    <form onSubmit={save} className="mx-auto flex max-w-4xl flex-col gap-6">
      <AdminPageHeader
        icon={Timer}
        title="Cấu hình vận hành"
        description="Thời hạn xử lý đơn: nhắc, tự hủy và chuyển cho quản trị viên"
        actions={
          <>
            <button
              type="button"
              disabled={!settings}
              onClick={() => setForm(settings.defaults)}
              className={ADMIN_BUTTON.secondary}
            >
              <RotateCcw className="h-4 w-4" />
              Về mặc định
            </button>
            <button type="submit" disabled={!isDirty || saving} className={ADMIN_BUTTON.primary}>
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </>
        }
      />

      <p className="flex items-start gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-800 dark:text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Hệ thống kiểm tra mỗi phút. Bước chưa ai tốn chi phí thì tự xử lý (nhắc, tự hủy). Bước món đã nấu thì chuyển cho quản trị viên
        (tab "Cần xử lý" ở Đơn hàng toàn sàn). Giá trị mới áp dụng từ lần kiểm tra kế tiếp.
      </p>

      {!form ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <section className={`${ADMIN_CARD} p-5`}>
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-500">Đang áp dụng</h2>
            {ACTIVE_FIELDS.map((field) => (
              <SettingRow
                key={field.key}
                field={field}
                value={form[field.key]}
                defaultValue={settings.defaults[field.key]}
                error={errors[field.key]}
                onChange={change}
              />
            ))}
          </section>

          <section className={`${ADMIN_CARD} p-5`}>
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-500">
              Lưu sẵn cho module thanh toán / shipper
            </h2>
            {PENDING_FIELDS.map((field) => (
              <SettingRow
                key={field.key}
                field={field}
                value={form[field.key]}
                defaultValue={settings.defaults[field.key]}
                error={errors[field.key]}
                onChange={change}
              />
            ))}
          </section>

          {settings.updatedAt && (
            <p className="text-xs text-slate-500">
              Cập nhật lần cuối {formatDateTime(settings.updatedAt)}
              {settings.updatedBy && ` bởi ${settings.updatedBy}`}
            </p>
          )}
        </>
      )}
    </form>
  )
}
