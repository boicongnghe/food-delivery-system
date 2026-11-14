import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import driverApi from '../../../api/driverApi'
import Pagination from '../../../components/Pagination/Pagination.jsx'
import {
  DELIVERY_ISSUE_STATUSES,
  DELIVERY_ISSUE_TYPE_LABELS,
  HEARING_STATES,
  ISSUE_ORDER_ACTION_LABELS,
  penaltyBadgeText,
} from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import SectionCard from './SectionCard.jsx'

const PAGE_SIZE = 10

const TONE_CLASSES = {
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  sky: 'bg-sky-50 text-sky-800 border-sky-200',
  brand: 'bg-brand-light text-brand border-brand-soft',
}

const Badge = ({ tone, children }) => (
  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${TONE_CLASSES[tone] || TONE_CLASSES.slate}`}>
    {children}
  </span>
)

/**
 * Delivery issue reports sent by the shipper: what the admin did with the order, the conclusion (and a penalty
 * when it targets this shipper), and the hearing when one was opened.
 */
export default function ShipperIssueReports() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    driverApi
      .getDeliveryIssues({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (active) {
          setData(result)
          setError('')
        }
      })
      .catch(() => active && setError('Không tải được danh sách báo cáo sự cố'))
    return () => {
      active = false
    }
  }, [page])

  return (
    <SectionCard title="Báo cáo sự cố của tôi" icon={TriangleAlert} as="h1" bodyClassName="">
      {error && <p className="px-5 py-6 text-sm text-red-700">{error}</p>}
      {!error && !data && <p className="px-5 py-6 text-sm text-slate-500">Đang tải…</p>}
      {!error && data && data.items.length === 0 && (
        <p className="px-5 py-6 text-sm text-slate-500">
          Bạn chưa gửi báo cáo sự cố nào. Khi gặp sự cố lúc giao, hãy báo cáo ngay trong thẻ đơn ở mục Đơn Giao.
        </p>
      )}
      {!error && data && data.items.length > 0 && (
        <>
          <ul className="divide-y divide-slate-100">
            {data.items.map((issue) => {
              const status = DELIVERY_ISSUE_STATUSES[issue.status] || DELIVERY_ISSUE_STATUSES.open
              const hearing = HEARING_STATES[issue.hearingState] || HEARING_STATES.none
              const { resolution } = issue
              return (
                <li key={issue._id} className="space-y-2 px-5 py-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      {issue.code} · Đơn #{issue.orderCode}
                      <span className="ml-2 font-normal text-slate-500">{formatDateTime(issue.createdAt)}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {issue.hearingState !== 'none' && <Badge tone={hearing.tone}>{hearing.label}</Badge>}
                    </div>
                  </div>
                  <p className="text-slate-700">
                    <span className="font-semibold">{DELIVERY_ISSUE_TYPE_LABELS[issue.type] || issue.type}</span>
                    {issue.description && ` – ${issue.description}`}
                  </p>
                  {resolution.orderAction !== 'none' && (
                    <p className="text-slate-600">
                      Xử lý đơn: <strong>{ISSUE_ORDER_ACTION_LABELS[resolution.orderAction]}</strong>
                      {resolution.orderActionAt && ` · ${formatDateTime(resolution.orderActionAt)}`}
                    </p>
                  )}
                  {issue.status !== 'open' ? (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-slate-800">Kết luận: {resolution.note}</p>
                      {resolution.penalty && (
                        <p className="mt-1 font-semibold text-red-700">Bạn bị xử phạt: {penaltyBadgeText(resolution.penalty)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500">Quản trị viên đang xem xét báo cáo này.</p>
                  )}
                  {issue.hearingState !== 'none' && (
                    <Link to="/shipper/hearings" className="inline-block text-sm font-semibold text-brand hover:underline">
                      Xem phiên đối chất
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          <Pagination pagination={data.pagination} onPageChange={setPage} unit="báo cáo" />
        </>
      )}
    </SectionCard>
  )
}
