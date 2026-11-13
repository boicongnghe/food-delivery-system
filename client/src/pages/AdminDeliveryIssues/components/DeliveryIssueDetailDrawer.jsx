import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import deliveryIssueApi from '../../../api/deliveryIssueApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminHearingSection from '../../../components/AdminHearingSection/AdminHearingSection.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminOrderSnapshot from '../../../components/AdminOrderSnapshot/AdminOrderSnapshot.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog.jsx'
import useNow from '../../../hooks/useNow.js'
import { ADMIN_BUTTON } from '../../../utils/adminClassNames.js'
import {
  DELIVERY_ISSUE_STATUSES,
  DELIVERY_ISSUE_TYPE_LABELS,
  PENALTY_TARGET_LABELS,
} from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { willAutoSuspend, willSuspend } from '../../../utils/autoSuspend.js'
import { getHearingState } from '../../../utils/hearingState.js'
import { EMPTY_PENALTY_FIELDS, toPenalty, validatePenalty } from '../../../utils/penaltyForm.js'
import IssueResolutionView from './IssueResolutionView.jsx'
import OrderActionSection from './OrderActionSection.jsx'
import ResolveIssueForm from './ResolveIssueForm.jsx'

const FORM_ID = 'resolve-issue-form'
const EMPTY_FORM = { decision: 'resolved', ...EMPTY_PENALTY_FIELDS, note: '' }
const SHIPPER_ACTIVE_STATUSES = ['preparing', 'ready_for_pickup', 'delivering']

// Same rule as the server: the order can be cancelled / released only while the reporting shipper still holds it
const getHeldOrderStatus = (issue) => {
  const { order, shipper } = issue
  const held = order && SHIPPER_ACTIVE_STATUSES.includes(order.status) && String(order.shipper) === String(shipper?._id)
  return held ? order.status : null
}

// Only an upheld report penalizes someone
const getPenalty = (form) => (form.decision === 'resolved' ? toPenalty(form) : null)

const getConfirmMessage = (penalty, autoSuspend) => {
  if (willAutoSuspend(penalty, autoSuspend)) {
    return `${PENALTY_TARGET_LABELS[penalty.target]} đạt ${autoSuspend.threshold} lần vi phạm và sẽ bị tự động đình chỉ ngay sau khi lưu. Bạn chắc chắn chứ?`
  }
  return `${PENALTY_TARGET_LABELS[penalty?.target] || ''} sẽ bị đình chỉ ngay sau khi lưu. Bạn chắc chắn chứ?`
}
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

const validate = (form, { heldOrderStatus, autoSuspend, hearingState }) => {
  const errors = form.decision === 'resolved' ? validatePenalty(form, hearingState) : {}
  if (form.note.trim().length < 5) errors.note = 'Kết luận xử lý ít nhất 5 ký tự'
  const penalty = getPenalty(form)
  if (penalty?.target === 'shipper' && willSuspend(penalty, autoSuspend) && heldOrderStatus) {
    errors['penalty.action'] = 'Shipper đang giữ đơn: xử lý đơn hàng ở mục trên trước khi khóa tài khoản'
  }
  return errors
}

const toPayload = (form) => ({ decision: form.decision, note: form.note.trim(), penalty: getPenalty(form) })

// Delivery issue endpoints of the shared hearing block
const HEARING_API = {
  openHearing: deliveryIssueApi.openHearing,
  closeHearing: deliveryIssueApi.closeHearing,
  getAdminHearingMessages: deliveryIssueApi.getAdminHearingMessages,
  sendAdminHearingMessage: deliveryIssueApi.sendAdminHearingMessage,
}

/**
 * UC45 - delivery issue report from a shipper (UC34). Steps: handle the stuck order right away if needed,
 * hear shipper, customer and restaurant (free chat, at most 24h), then decide and maybe penalize one party.
 * Mount with key={issueId}.
 */
export default function DeliveryIssueDetailDrawer({ issueId, onClose, onResolved }) {
  const [issue, setIssue] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const now = useNow(30 * 1000)

  const loadIssue = useCallback(
    () =>
      deliveryIssueApi
        .getDeliveryIssue(issueId)
        .then((response) => setIssue(response.data))
        .catch((error) => setLoadError(getErrorMessage(error, 'Không tải được báo cáo sự cố'))),
    [issueId],
  )

  useEffect(() => {
    let ignore = false

    deliveryIssueApi
      .getDeliveryIssue(issueId)
      .then((response) => {
        if (!ignore) setIssue(response.data)
      })
      .catch((error) => {
        if (!ignore) setLoadError(getErrorMessage(error, 'Không tải được báo cáo sự cố'))
      })

    return () => {
      ignore = true
    }
  }, [issueId])

  // Changes of the order or the hearing also move the list (badges, tabs)
  const handleIssueChange = (nextIssue) => {
    setIssue(nextIssue)
    onResolved()
  }

  const heldOrderStatus = issue ? getHeldOrderStatus(issue) : null
  const hearingState = issue ? getHearingState(issue, now) : 'none'

  const submit = async () => {
    setSaving(true)
    try {
      const response = await deliveryIssueApi.resolveDeliveryIssue(issueId, toPayload(form))
      setIssue(response.data)
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
    const nextErrors = validate(form, { heldOrderStatus, autoSuspend: issue.autoSuspend, hearingState })
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    // Suspending (picked or automatic: locks an account / stops a restaurant): ask once more
    if (willSuspend(getPenalty(form), issue.autoSuspend)) {
      setConfirming(true)
      return
    }
    submit()
  }

  const isOpen = issue?.status === 'open'
  const status = issue && DELIVERY_ISSUE_STATUSES[issue.status]

  return (
    <AdminDrawer
      title={issue ? `Sự cố ${issue.code}` : 'Báo cáo sự cố'}
      subtitle={issue && `Shipper báo cáo lúc ${formatDateTime(issue.createdAt)}`}
      badge={status && <AdminBadge tone={status.tone}>{status.label}</AdminBadge>}
      closeDisabled={saving || confirming}
      onClose={onClose}
      footer={
        isOpen && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className={ADMIN_BUTTON.secondary}>
              Để sau
            </button>
            <button type="submit" form={FORM_ID} disabled={saving} className={ADMIN_BUTTON.primary}>
              {saving ? 'Đang lưu...' : 'Lưu kết quả xử lý'}
            </button>
          </div>
        )
      }
    >
      {loadError && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{loadError}</p>
      )}
      {!issue && !loadError && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {issue && (
        <>
          <AdminSection title="Nội dung báo cáo" aside={<AdminBadge tone="brand">{DELIVERY_ISSUE_TYPE_LABELS[issue.type]}</AdminBadge>}>
            <p className="whitespace-pre-line rounded-2xl border border-slate-100 dark:border-crave-border bg-slate-50 dark:bg-crave-dark/60 p-4 text-sm text-slate-800 dark:text-slate-200">
              {issue.description || 'Không có mô tả bổ sung.'}
            </p>
            {['customer_unreachable', 'customer_refused'].includes(issue.type) && (
              <div className="mt-3 space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <AdminInfoRow label="Thời gian chờ khách">{issue.waitedMinutes || 0} phút</AdminInfoRow>
                <AdminInfoRow label="Cuộc gọi không được trả lời">{issue.unansweredCalls || 0}</AdminInfoRow>
              </div>
            )}
            {issue.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {issue.images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Ảnh hiện trường" className="h-24 w-24 rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
                  </a>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection title="Các bên liên quan (số lần vi phạm trước)">
            <AdminInfoRow label={PENALTY_TARGET_LABELS.shipper}>
              {issue.shipper?.fullName} · {issue.shipper?.phone}
              {issue.shipper && !issue.shipper.isActive && ' (đã khóa)'} · {issue.violationCounts.shipper} lần
            </AdminInfoRow>
            <AdminInfoRow label={PENALTY_TARGET_LABELS.customer}>
              {issue.customer?.fullName} · {issue.customer?.phone}
              {issue.customer && !issue.customer.isActive && ' (đã khóa)'} · {issue.violationCounts.customer} lần
            </AdminInfoRow>
            <AdminInfoRow label={PENALTY_TARGET_LABELS.restaurant}>
              {issue.restaurant?.name} · {issue.restaurant?.phone}
              {issue.restaurant?.status === 'suspended' && ' (đang đình chỉ)'} · {issue.violationCounts.restaurant} lần
            </AdminInfoRow>
          </AdminSection>

          <AdminSection title="Đơn hàng">
            <AdminOrderSnapshot order={issue.order} manageLink />
          </AdminSection>

          <AdminSection title="Xử lý đơn hàng">
            <OrderActionSection issue={issue} heldOrderStatus={heldOrderStatus} onIssueChange={handleIssueChange} />
          </AdminSection>

          <AdminSection title="Đối chất giữa các bên">
            {issue.hearing || isOpen ? (
              <AdminHearingSection
                caseDoc={issue}
                hearingState={hearingState}
                now={now}
                api={HEARING_API}
                partiesLabel="shipper, khách hàng và chủ quán"
                onCaseChange={handleIssueChange}
                onReload={loadIssue}
              />
            ) : (
              <p className="text-sm text-slate-500">Báo cáo được xử lý mà không cần đối chất.</p>
            )}
          </AdminSection>

          <AdminSection title="Kết quả xử lý">
            {isOpen ? (
              <ResolveIssueForm
                formId={FORM_ID}
                form={form}
                errors={errors}
                violationCounts={issue.violationCounts}
                autoSuspend={issue.autoSuspend}
                hearingState={hearingState}
                disabled={saving}
                onChange={(changes) => {
                  setForm((prev) => ({ ...prev, ...changes }))
                  setErrors({})
                }}
                onSubmit={handleSubmit}
              />
            ) : (
              <IssueResolutionView resolution={issue.resolution} />
            )}
          </AdminSection>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Xác nhận kết quả xử lý"
        message={getConfirmMessage(getPenalty(form), issue?.autoSuspend)}
        confirmLabel="Xác nhận"
        loading={saving}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </AdminDrawer>
  )
}
