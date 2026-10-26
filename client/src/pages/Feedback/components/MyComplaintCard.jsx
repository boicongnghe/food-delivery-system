import { ShieldCheck } from 'lucide-react'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../../utils/feedbackLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'

const STATUS_STYLES = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function MyComplaintCard({ complaint }) {
  const { resolution } = complaint

  return (
    <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900">
            {complaint.code} · {COMPLAINT_CATEGORY_LABELS[complaint.category]}
          </p>
          <p className="text-xs text-slate-400">
            {complaint.restaurant?.name} · Đơn <span className="font-mono">{complaint.orderCode}</span> ·{' '}
            {formatDateTime(complaint.createdAt)}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[complaint.status]}`}>
          {COMPLAINT_STATUS_LABELS[complaint.status]}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{complaint.description}</p>
      {complaint.images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {complaint.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="Ảnh minh chứng" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
            </a>
          ))}
        </div>
      )}

      {complaint.status === 'open' ? (
        <p className="mt-3 text-xs text-slate-500">Ban quản trị đang xem xét khiếu nại của bạn.</p>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Phản hồi từ ban quản trị · {formatDateTime(resolution.at)}
          </p>
          <p className="mt-1 text-slate-700">{resolution.note}</p>
          {resolution.refundAmount > 0 && (
            <p className="mt-1 font-semibold text-emerald-700">Hoàn tiền: {formatCurrency(resolution.refundAmount)}</p>
          )}
        </div>
      )}
    </article>
  )
}
