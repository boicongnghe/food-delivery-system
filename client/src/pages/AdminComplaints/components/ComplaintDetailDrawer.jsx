import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import complaintApi from '../../../api/complaintApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminHearingSection from '../../../components/AdminHearingSection/AdminHearingSection.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminOrderSnapshot from '../../../components/AdminOrderSnapshot/AdminOrderSnapshot.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog.jsx'
import useNow from '../../../hooks/useNow.js'
import { ADMIN_BUTTON } from '../../../utils/adminClassNames.js'
import { willAutoSuspend, willSuspend } from '../../../utils/autoSuspend.js'
import {
  PENALTY_ACTION_LABELS,
  PENALTY_TARGET_LABELS,
} from '../../../utils/deliveryIssueLabels.js'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../../utils/feedbackLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { getHearingState } from '../../../utils/hearingState.js'
import { EMPTY_PENALTY_FIELDS, toPenalty, validatePenalty } from '../../../utils/penaltyForm.js'
import { COMPLAINT_STATUS_TONES } from '../constants.js'
import ComplaintResolveForm from './ComplaintResolveForm.jsx'

const FORM_ID = 'complaint-resolve-form'
const EMPTY_FORM = { decision: 'resolved', refundAmount: '', note: '', ...EMPTY_PENALTY_FIELDS }
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// Complaint endpoints of the shared hearing block
const HEARING_API = {
  openHearing: complaintApi.openHearing,
  closeHearing: complaintApi.closeHearing,
  getAdminHearingMessages: complaintApi.getAdminHearingMessages,
  sendAdminHearingMessage: complaintApi.sendAdminHearingMessage,
}

const getConfirmMessage = (penalty, autoSuspend) =>
  willAutoSuspend(penalty, autoSuspend)
    ? `${PENALTY_TARGET_LABELS[penalty.target]} đạt ${autoSuspend.threshold} lần vi phạm và sẽ bị tự động đình chỉ ngay sau khi lưu. Bạn chắc chắn chứ?`
    : `${PENALTY_TARGET_LABELS[penalty?.target] || ''} sẽ bị đình chỉ ngay sau khi lưu. Bạn chắc chắn chứ?`

/**
 * UC42 - complaint detail and its answer. Like a delivery issue: hear the parties of the order (customer,
 * restaurant, shipper if any) in a free chat before penalizing one of them. Mount with key={complaintId}.
 * @param {() => void} onResolved - the list behind should reload
 */
export default function ComplaintDetailDrawer({ complaintId, onClose, onResolved }) {
  const [complaint, setComplaint] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const now = useNow(30 * 1000)

  const loadComplaint = useCallback(
    () =>
      complaintApi
        .getComplaint(complaintId)
        .then((response) => setComplaint(response.data))
        .catch((error) => setLoadError(getErrorMessage(error, 'Không tải được khiếu nại'))),
    [complaintId],
  )

  useEffect(() => {
    let ignore = false

    complaintApi
      .getComplaint(complaintId)
      .then((response) => {
        if (!ignore) setComplaint(response.data)
      })
      .catch((error) => {
        if (!ignore) setLoadError(getErrorMessage(error, 'Không tải được khiếu nại'))
      })

    return () => {
      ignore = true
    }
  }, [complaintId])

  const updateForm = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }))
    setErrors({})
  }

  // Hearing opened / closed: the list behind shows it too
  const handleComplaintChange = (nextComplaint) => {
    setComplaint(nextComplaint)
    onResolved()
  }

  const hearingState = complaint ? getHearingState(complaint, now) : 'none'
  const penalty = toPenalty(form)

  const submit = async () => {
    setSaving(true)
    try {
      const response = await complaintApi.resolveComplaint(complaintId, {
        decision: form.decision,
        note: form.note.trim(),
        ...(form.decision === 'resolved' && { refundAmount: Number(form.refundAmount || 0) }),
        penalty,
      })
      setComplaint(response.data)
      toast.success(response.message)
      onResolved()
    } catch (error) {
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field, message])))
      toast.error(getErrorMessage(error, 'Không lưu được kết quả xử lý'))
    } finally {
      setSaving(false)
      setConfirming(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validatePenalty(form, hearingState)
    if (form.note.trim().length < 5) nextErrors.note = 'Nội dung phản hồi ít nhất 5 ký tự'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    // Suspending (picked or automatic): ask once more
    if (willSuspend(penalty, complaint.autoSuspend)) {
      setConfirming(true)
      return
    }
    submit()
  }

  const isOpen = complaint?.status === 'open'
  const { penalty: savedPenalty } = complaint?.resolution || {}

  return (
    <AdminDrawer
      title={complaint ? `Khiếu nại ${complaint.code}` : 'Khiếu nại'}
      subtitle={complaint && `Gửi lúc ${formatDateTime(complaint.createdAt)}`}
      badge={
        complaint && (
          <AdminBadge tone={COMPLAINT_STATUS_TONES[complaint.status]}>{COMPLAINT_STATUS_LABELS[complaint.status]}</AdminBadge>
        )
      }
      closeDisabled={saving || confirming}
      onClose={onClose}
      footer={
        isOpen && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className={ADMIN_BUTTON.secondary}>
              Để sau
            </button>
            <button type="submit" form={FORM_ID} disabled={saving} className={ADMIN_BUTTON.primary}>
              {saving ? 'Đang lưu...' : 'Gửi kết quả xử lý'}
            </button>
          </div>
        )
      }
    >
      {loadError && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{loadError}</p>
      )}
      {!complaint && !loadError && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {complaint && (
        <>
          <AdminSection title="Nội dung khiếu nại" aside={<AdminBadge tone="brand">{COMPLAINT_CATEGORY_LABELS[complaint.category]}</AdminBadge>}>
            <p className="whitespace-pre-line rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4 text-sm text-slate-800 dark:text-slate-200">
              {complaint.description}
            </p>
            {complaint.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {complaint.images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Ảnh minh chứng" className="h-24 w-24 rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
                  </a>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection title="Các bên liên quan (số lần vi phạm trước)">
            <AdminInfoRow label="Khách hàng">
              {complaint.customer?.fullName} · {complaint.customer?.phone}
              {complaint.customer && !complaint.customer.isActive && ' (đã khóa)'} · {complaint.violationCounts.customer} lần
            </AdminInfoRow>
            <AdminInfoRow label="Nhà hàng">
              {complaint.restaurant?.name} · {complaint.restaurant?.phone}
              {complaint.restaurant?.status === 'suspended' && ' (đang đình chỉ)'} · {complaint.violationCounts.restaurant} lần
            </AdminInfoRow>
            <AdminInfoRow label="Shipper">
              {complaint.shipper
                ? `${complaint.shipper.fullName} · ${complaint.shipper.phone}${complaint.shipper.isActive === false ? ' (đã khóa)' : ''} · ${complaint.violationCounts.shipper} lần`
                : 'Chưa có'}
            </AdminInfoRow>
          </AdminSection>

          <AdminSection title="Đơn hàng">
            <AdminOrderSnapshot order={complaint.order} manageLink />
          </AdminSection>

          <AdminSection title="Đối chất giữa các bên">
            {complaint.hearing || isOpen ? (
              <AdminHearingSection
                caseDoc={complaint}
                hearingState={hearingState}
                now={now}
                api={HEARING_API}
                partiesLabel={complaint.shipper ? 'khách hàng, chủ quán và shipper' : 'khách hàng và chủ quán'}
                onCaseChange={handleComplaintChange}
                onReload={loadComplaint}
              />
            ) : (
              <p className="text-sm text-slate-500">Khiếu nại được xử lý mà không cần đối chất.</p>
            )}
          </AdminSection>

          <AdminSection title="Kết quả xử lý">
            {isOpen ? (
              <ComplaintResolveForm
                formId={FORM_ID}
                form={form}
                errors={errors}
                maxRefund={complaint.maxRefund}
                violationCounts={complaint.violationCounts}
                autoSuspend={complaint.autoSuspend}
                hearingState={hearingState}
                penaltyTargets={complaint.shipper ? ['customer', 'restaurant', 'shipper'] : ['customer', 'restaurant']}
                disabled={saving}
                onChange={updateForm}
                onSubmit={handleSubmit}
              />
            ) : (
              <div className="space-y-2 rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4">
                <p className="text-sm text-slate-800 dark:text-slate-200">{complaint.resolution.note}</p>
                {complaint.resolution.refundAmount > 0 && (
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
                    Đã hoàn {formatCurrency(complaint.resolution.refundAmount)} cho khách
                  </p>
                )}
                {savedPenalty ? (
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    Xử phạt {PENALTY_TARGET_LABELS[savedPenalty.target].toLowerCase()}:
                    <AdminBadge tone={savedPenalty.action === 'warning' ? 'amber' : 'red'}>
                      {PENALTY_ACTION_LABELS[savedPenalty.action]}
                      {savedPenalty.action === 'fine' && ` ${formatCurrency(savedPenalty.fineAmount)}`}
                    </AdminBadge>
                    {savedPenalty.autoSuspended && <AdminBadge tone="red">Tự động đình chỉ (đạt ngưỡng vi phạm)</AdminBadge>}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Không xử phạt.</p>
                )}
                <p className="text-xs text-slate-500">
                  {complaint.resolution.by?.fullName} · {formatDateTime(complaint.resolution.at)}
                </p>
              </div>
            )}
          </AdminSection>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Xác nhận kết quả xử lý"
        message={getConfirmMessage(penalty, complaint?.autoSuspend)}
        confirmLabel="Xác nhận"
        loading={saving}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </AdminDrawer>
  )
}
