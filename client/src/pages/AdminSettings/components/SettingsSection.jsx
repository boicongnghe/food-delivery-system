import { RotateCcw, Save } from 'lucide-react'
import { ADMIN_BUTTON, ADMIN_CARD } from '../../../utils/adminClassNames.js'
import { formatDateTime } from '../../../utils/formatDate.js'

/**
 * One group of settings saved on its own: title, reset / save buttons, rows, last change.
 * Rendered as a form so Enter in a field saves this group only.
 * @param {{ values, defaults, updatedAt, updatedBy } | null} settings - null while loading
 * @param {boolean} isDirty - the form differs from the saved values
 * @param {() => void} onReset - fill the form with the defaults (saved on "Lưu")
 */
export default function SettingsSection({
  icon: Icon,
  title,
  description,
  settings,
  isDirty,
  saving,
  onReset,
  onSubmit,
  children,
}) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className={`${ADMIN_CARD} p-5`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            {title}
          </h2>
          {description && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</div>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" disabled={!settings || saving} onClick={onReset} className={ADMIN_BUTTON.secondary}>
            <RotateCcw className="h-4 w-4" />
            Về mặc định
          </button>
          <button type="submit" disabled={!isDirty || saving} className={ADMIN_BUTTON.primary}>
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      {!settings ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="pt-1">{children}</div>
          {settings.updatedAt && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
              Cập nhật lần cuối {formatDateTime(settings.updatedAt)}
              {settings.updatedBy && ` bởi ${settings.updatedBy}`}
            </p>
          )}
        </>
      )}
    </form>
  )
}
