import { useCallback } from 'react'
import { Clock, Scale } from 'lucide-react'
import hearingApi from '../../../api/hearingApi.js'
import HearingChat from '../../../components/HearingChat/HearingChat.jsx'
import { HEARING_PARTY_LABELS } from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { HEARING_CASE_LABELS } from '../../../utils/hearingLabels.js'
import { formatTimeLeft } from '../../../utils/hearingState.js'

/**
 * One hearing seen by a party: what was reported (by the shipper or the customer), who takes part, the deadline
 * and the chat.
 * @param {object} hearing - GET /api/hearings/:caseType/:id
 * @param {'open' | 'closed'} hearingState - recomputed with the current time
 * @param {number} now
 * @param {() => void} onReload
 */
export default function HearingCaseDetail({ hearing, hearingState, now, onReload }) {
  const isOpen = hearingState === 'open'
  const labels = HEARING_CASE_LABELS[hearing.caseType]
  const { caseType } = hearing
  // Stable per case, so the chat does not reload on every render
  const fetchMessages = useCallback((caseId) => hearingApi.getMessages(caseType, caseId), [caseType])
  const sendMessage = useCallback((caseId, message) => hearingApi.sendMessage(caseType, caseId, message), [caseType])
  const parties = ['shipper', 'customer', 'restaurant'].filter((party) => hearing.parties[party] !== null)

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Scale className="h-4 w-4" aria-hidden="true" />
          Đối chất {labels.noun.toLowerCase()} {hearing.code} · Đơn #{hearing.orderCode}
        </p>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{labels.kindLabels[hearing.kind]}</h2>
        <p className={`flex items-center gap-1.5 text-sm ${isOpen ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500'}`}>
          <Clock className="h-4 w-4" aria-hidden="true" />
          {isOpen
            ? `Đang trao đổi đến ${formatDateTime(hearing.hearing.deadline)} (${formatTimeLeft(hearing.hearing.deadline, now)})`
            : `Phiên đối chất đã kết thúc. ${labels.outcomes[hearing.status]}.`}
        </p>
      </header>

      <section aria-label="Nội dung được báo cáo" className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {labels.reportTitle} {formatDateTime(hearing.createdAt)}
        </p>
        <p className="whitespace-pre-line rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-800 dark:text-slate-200">
          {hearing.description || 'Không có mô tả bổ sung.'}
        </p>
        {hearing.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hearing.images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt="Ảnh minh chứng" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
              </a>
            ))}
          </div>
        )}
      </section>

      <dl className={`grid gap-2 text-sm ${parties.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {parties.map((party) => (
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
        <HearingChat
          caseId={hearing._id}
          canSend={isOpen}
          fetchMessages={fetchMessages}
          sendMessage={sendMessage}
          onHearingUpdated={onReload}
          closedHint="Phiên đối chất đã kết thúc, bạn chỉ xem lại được nội dung."
        />
      </div>
    </article>
  )
}
