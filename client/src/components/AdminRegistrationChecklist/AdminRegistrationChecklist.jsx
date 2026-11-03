import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'

/**
 * What the register form asks for, as checked by the server before an approval.
 * @param {{ key: string, label: string, ok: boolean, required: boolean }[]} checks
 * @param {boolean} isReviewing - pending / rejected profile: missing items block the approval
 *   (a partner approved earlier can be suspended / reopened whatever its old profile lacks)
 */
export default function AdminRegistrationChecklist({ checks, isReviewing }) {
  const missingCount = checks.filter((check) => check.required && !check.ok).length

  return (
    <div className="space-y-3">
      <p
        className={`rounded-xl px-3 py-2 text-xs font-bold ${
          missingCount
            ? 'bg-red-500/10 text-red-600 dark:text-red-300'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
        }`}
      >
        {!missingCount
          ? 'Hồ sơ đã đủ các mục bắt buộc của form đăng ký'
          : isReviewing
            ? `Còn ${missingCount} mục bắt buộc chưa đạt: chưa thể duyệt hồ sơ`
            : `Hồ sơ còn thiếu ${missingCount} mục bắt buộc (đăng ký trước khi form yêu cầu)`}
      </p>
      <ul className="space-y-1.5">
        {checks.map((check) => {
          const Icon = check.ok ? CircleCheck : check.required ? CircleX : CircleAlert
          const color = check.ok
            ? 'text-emerald-600 dark:text-emerald-400'
            : check.required
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          return (
            <li key={check.key} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
              <span>
                {check.label}
                {!check.required && <span className="ml-1 text-xs text-slate-400">(không bắt buộc)</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
