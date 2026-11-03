import { formatDateTime } from '../../utils/formatDate.js'

const TITLES = {
  approved: 'Ghi chú khi duyệt',
  rejected: 'Lý do từ chối',
  suspended: 'Lý do đình chỉ',
}

// Last admin decision on a restaurant / shipper profile (statusChange)
export default function AdminPartnerDecision({ status, statusChange }) {
  if (!statusChange?.at || !TITLES[status] || (status === 'approved' && !statusChange.note)) return null
  const isWarning = status !== 'approved'

  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${
        isWarning
          ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-200'
          : 'border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 text-slate-700 dark:text-slate-300'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider">{TITLES[status]}</p>
      {statusChange.note && <p className="mt-1 whitespace-pre-line">{statusChange.note}</p>}
      <p className="mt-2 text-xs opacity-80">
        {statusChange.by?.fullName || 'Quản trị viên'} · {formatDateTime(statusChange.at)}
      </p>
    </div>
  )
}
