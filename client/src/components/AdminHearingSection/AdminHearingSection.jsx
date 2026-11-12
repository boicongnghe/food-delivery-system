import { useState } from 'react'
import { Scale } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminBadge from '../AdminBadge/AdminBadge.jsx'
import HearingChat from '../HearingChat/HearingChat.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../utils/adminClassNames.js'
import { HEARING_MAX_HOURS, HEARING_STATES } from '../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { formatTimeLeft } from '../../utils/hearingState.js'

const HOUR_OPTIONS = Array.from({ length: HEARING_MAX_HOURS }, (_, index) => HEARING_MAX_HOURS - index)
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * Hearing of a case (delivery issue UC45, complaint UC42): the admin opens a free chat between the parties of
 * the order (at most 24 hours), takes part in it and may end it early. A penalty is possible once it has ended.
 *
 * @param {object} caseDoc - admin detail of the case (status, hearing)
 * @param {'none' | 'open' | 'closed'} hearingState
 * @param {number} now - current time (ms), refreshed by the parent
 * @param {{ openHearing, closeHearing, getAdminHearingMessages, sendAdminHearingMessage }} api - admin API of the case
 * @param {string} partiesLabel - who is invited, e.g. "shipper, khách hàng và chủ quán"
 * @param {(caseDoc: object) => void} onCaseChange - new detail after opening / closing
 * @param {() => void} onReload - reload the detail (socket: someone changed the hearing)
 */
export default function AdminHearingSection({ caseDoc, hearingState, now, api, partiesLabel, onCaseChange, onReload }) {
  const [deadlineHours, setDeadlineHours] = useState(HEARING_MAX_HOURS)
  const [busy, setBusy] = useState(false)
  const isOpenCase = caseDoc.status === 'open'
  const { hearing } = caseDoc

  const run = async (request, fallback) => {
    setBusy(true)
    try {
      const response = await request()
      onCaseChange(response.data)
      toast.success(response.message)
    } catch (error) {
      toast.error(getErrorMessage(error, fallback))
    } finally {
      setBusy(false)
    }
  }

  const openHearing = () =>
    run(() => api.openHearing(caseDoc._id, { deadlineHours: Number(deadlineHours) }), 'Không mở được phiên đối chất')
  const closeHearing = () => run(() => api.closeHearing(caseDoc._id), 'Không kết thúc được phiên đối chất')
  const state = HEARING_STATES[hearingState]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <AdminBadge tone={state.tone}>{state.label}</AdminBadge>
        {hearing && (
          <span>
            Mở bởi {hearing.openedBy?.fullName || 'quản trị viên'} lúc {formatDateTime(hearing.openedAt)} · hạn{' '}
            {formatDateTime(hearing.deadline)}
            {hearingState === 'open' && ` (${formatTimeLeft(hearing.deadline, now)})`}
            {hearing.closedAt && ` · kết thúc sớm lúc ${formatDateTime(hearing.closedAt)}`}
          </span>
        )}
      </div>

      {isOpenCase && hearingState !== 'open' && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
          <div>
            <label htmlFor={`hearing-hours-${caseDoc._id}`} className={ADMIN_LABEL}>
              Thời hạn đối chất
            </label>
            <select
              id={`hearing-hours-${caseDoc._id}`}
              value={deadlineHours}
              disabled={busy}
              onChange={(event) => setDeadlineHours(event.target.value)}
              className={`${ADMIN_INPUT} w-32`}
            >
              {HOUR_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} giờ
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={openHearing} disabled={busy} className={ADMIN_BUTTON.primary}>
            <Scale className="h-4 w-4" />
            {hearing ? 'Mở lại phiên đối chất' : 'Mời các bên đối chất'}
          </button>
          <p className="w-full text-xs text-slate-500">
            {partiesLabel.charAt(0).toUpperCase() + partiesLabel.slice(1)} nhận thông báo và trao đổi tự do với nhau đến hết hạn.
            Muốn xử phạt, hãy đối chất trước; kết luận không phạt thì không cần.
          </p>
        </div>
      )}

      {hearing && (
        <HearingChat
          caseId={caseDoc._id}
          canSend={hearingState === 'open'}
          fetchMessages={api.getAdminHearingMessages}
          sendMessage={api.sendAdminHearingMessage}
          onHearingUpdated={onReload}
          closedHint="Phiên đối chất đã kết thúc, chỉ xem lại được nội dung."
        />
      )}

      {hearingState === 'open' && (
        <div className="flex justify-end">
          <button type="button" onClick={closeHearing} disabled={busy} className={ADMIN_BUTTON.secondary}>
            Kết thúc đối chất sớm
          </button>
        </div>
      )}
    </div>
  )
}
