import { useState } from 'react'
import { Ban, CircleCheck, RotateCcw, XCircle } from 'lucide-react'
import AdminFieldError from '../AdminFieldError/AdminFieldError.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../utils/adminClassNames.js'

const NOTE_MIN_LENGTH = 5 // same rule as the server

// Actions offered for each current status (server: TRANSITIONS of adminPartnerService)
const ACTIONS = {
  pending: [
    { status: 'rejected', label: 'Từ chối hồ sơ', icon: XCircle, style: 'secondary' },
    { status: 'approved', label: 'Duyệt hồ sơ', icon: CircleCheck, style: 'success' },
  ],
  rejected: [{ status: 'approved', label: 'Duyệt lại hồ sơ', icon: CircleCheck, style: 'success' }],
  approved: [{ status: 'suspended', label: 'Đình chỉ hoạt động', icon: Ban, style: 'danger' }],
  suspended: [{ status: 'approved', label: 'Mở lại hoạt động', icon: RotateCcw, style: 'success' }],
}

/**
 * Drawer footer: pick an action, read what it does, give a reason (required to reject / suspend), confirm.
 * @param {{ approved: string, rejected: string, suspended: string }} effects - what each new status means
 * @param {boolean} canApprove - every required item of the registration is filled in
 * @param {({ status, note }) => Promise<boolean>} onSubmit - resolves true when the change was saved
 */
export default function AdminPartnerStatusActions({ status, effects, canApprove, busy, onSubmit }) {
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const actions = ACTIONS[status] || []
  const needsReason = selected && selected.status !== 'approved'
  // Reopening skips the profile check, like the server does
  const isApproveBlocked = (action) => action.status === 'approved' && status !== 'suspended' && !canApprove

  const cancel = () => {
    setSelected(null)
    setNote('')
    setNoteError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (needsReason && note.trim().length < NOTE_MIN_LENGTH) {
      setNoteError(`Vui lòng nhập lý do (ít nhất ${NOTE_MIN_LENGTH} ký tự)`)
      return
    }
    if (await onSubmit({ status: selected.status, note: note.trim() })) cancel()
  }

  if (selected) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-bold">{selected.label}:</span> {effects[selected.status]}
        </p>
        <div>
          <label htmlFor="partner-status-note" className={ADMIN_LABEL}>
            {needsReason ? 'Lý do (lưu vào hồ sơ) *' : 'Ghi chú (không bắt buộc)'}
          </label>
          <textarea
            id="partner-status-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setNoteError('')
            }}
            disabled={busy}
            placeholder={needsReason ? 'Ví dụ: Số CCCD không khớp với giấy tờ đã nộp' : ''}
            className={ADMIN_INPUT}
          />
          <AdminFieldError message={noteError} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={cancel} disabled={busy} className={ADMIN_BUTTON.secondary}>
            Quay lại
          </button>
          <button type="submit" disabled={busy} className={ADMIN_BUTTON[selected.style === 'secondary' ? 'danger' : selected.style]}>
            {busy ? 'Đang lưu...' : `Xác nhận ${selected.label.toLowerCase()}`}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      {actions.some(isApproveBlocked) && (
        <p className="text-xs text-red-600 dark:text-red-400 sm:mr-auto">Hồ sơ còn thiếu mục bắt buộc, chưa thể duyệt.</p>
      )}
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.status}
            type="button"
            onClick={() => setSelected(action)}
            disabled={busy || isApproveBlocked(action)}
            className={ADMIN_BUTTON[action.style]}
          >
            <Icon className="h-3.5 w-3.5" /> {action.label}
          </button>
        )
      })}
    </div>
  )
}
