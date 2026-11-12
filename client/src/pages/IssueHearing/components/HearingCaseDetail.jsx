import { Clock, Scale } from 'lucide-react'
import deliveryIssueApi from '../../../api/deliveryIssueApi.js'
import IssueHearingChat from '../../../components/IssueHearingChat/IssueHearingChat.jsx'
import { DELIVERY_ISSUE_TYPE_LABELS, HEARING_PARTY_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { formatTimeLeft } from '../../../utils/hearingState.js'

const OUTCOME_LABELS = {
  open: 'Quản trị viên chưa kết luận',
  resolved: 'Quản trị viên đã kết luận báo cáo',
  dismissed: 'Quản trị viên đã bác bỏ báo cáo',
}

/**
 * One hearing seen by a party: the shipper's report, who takes part, the deadline and the chat.
 * @param {object} hearing - GET /api/delivery-issues/:id
 * @param {'open' | 'closed'} hearingState - recomputed with the current time
 * @param {number} now
 * @param {() => void} onReload
 */
export default function HearingCaseDetail({ hearing, hearingState, now, onReload }) {
  const isOpen = hearingState === 'open'

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Scale className="h-4 w-4" aria-hidden="true" />
          Đối chất sự cố {hearing.code} · Đơn #{hearing.orderCode}
        </p>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{DELIVERY_ISSUE_TYPE_LABELS[hearing.type]}</h2>
        <p
          className={`flex items-center gap-1.5 text-sm ${
            isOpen ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500'
          }`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          {isOpen
            ? `Đang trao đổi đến ${formatDateTime(hearing.hearing.deadline)} (${formatTimeLeft(hearing.hearing.deadline, now)})`
            : `Phiên đối chất đã kết thúc. ${OUTCOME_LABELS[hearing.status]}.`}
        </p>
      </header>

      <section aria-label="Nội dung báo cáo của shipper" className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shipper báo cáo lúc {formatDateTime(hearing.createdAt)}</p>
        <p className="whitespace-pre-line rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-800 dark:text-slate-200">
          {hearing.description || 'Không có mô tả bổ sung.'}
        </p>
        {hearing.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hearing.images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="Ảnh hiện trường" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
              </a>
            ))}
          </div>
        )}
      </section>

      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        {['shipper', 'customer', 'restaurant'].map((party) => (
          <div key={party} className="rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2">
            <dt className="text-xs text-slate-500">
              {HEARING_PARTY_LABELS[party]}
              {party === hearing.myParty && ' (bạn)'}
            </dt>
            <dd className="font-semibold text-slate-800 dark:text-slate-200">{hearing.parties[party] || '—'}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Trao đổi giữa các bên</h3>
        <p className="text-xs text-slate-500">
          Trình bày sự việc từ phía bạn và trả lời ý kiến của các bên khác. Quản trị viên đọc toàn bộ nội dung trước khi kết luận;
          tin nhắn đã gửi không sửa hay xóa được.
        </p>
        <IssueHearingChat
          issueId={hearing._id}
          canSend={isOpen}
          fetchMessages={deliveryIssueApi.getHearingMessages}
          sendMessage={deliveryIssueApi.sendHearingMessage}
          onHearingUpdated={onReload}
          closedHint="Phiên đối chất đã kết thúc, bạn chỉ xem lại được nội dung."
        />
      </div>
    </article>
  )
}
