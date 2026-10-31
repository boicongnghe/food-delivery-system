import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import deliveryIssueApi from '../../../api/deliveryIssueApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminOrderSnapshot from '../../../components/AdminOrderSnapshot/AdminOrderSnapshot.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog.jsx'
import { ADMIN_BUTTON } from '../../../utils/adminClassNames.js'
import {
  DELIVERY_ISSUE_STATUSES,
  DELIVERY_ISSUE_TYPE_LABELS,
  PENALTY_TARGET_LABELS,
} from '../../../utils/deliveryIssueLabels.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import IssueResolutionView from './IssueResolutionView.jsx'
import ResolveIssueForm from './ResolveIssueForm.jsx'

const FORM_ID = 'resolve-issue-form'
const EMPTY_FORM = { decision: 'resolved', hasPenalty: false, target: '', action: '', fineAmount: '', note: '' }
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

const validate = (form) => {
  const errors = {}
  if (form.note.trim().length < 5) errors.note = 'Kết luận xử lý ít nhất 5 ký tự'
  if (form.decision === 'resolved' && form.hasPenalty) {
    if (!form.target) errors['penalty.target'] = 'Vui lòng chọn bên vi phạm'
    if (!form.action) errors['penalty.action'] = 'Vui lòng chọn hình thức xử phạt'
    if (form.action === 'fine' && !form.fineAmount) errors['penalty.fineAmount'] = 'Vui lòng nhập số tiền phạt'
  }
  return errors
}

const toPayload = (form) => ({
  decision: form.decision,
  note: form.note.trim(),
  penalty:
    form.decision === 'resolved' && form.hasPenalty
      ? {
          target: form.target,
          action: form.action,
          ...(form.action === 'fine' && { fineAmount: Number(form.fineAmount) }),
        }
      : null,
})

/**
 * UC45 - delivery issue report from a shipper (UC34): review it, handle it or penalize the party at fault.
 * Mount with key={issueId}.
 */
export default function DeliveryIssueDetailDrawer({ issueId, onClose, onResolved }) {
  const [issue, setIssue] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState(false)

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
      setConfirmSuspend(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    // Suspending locks an account or stops a restaurant: ask once more
    if (form.decision === 'resolved' && form.hasPenalty && form.action === 'suspend') {
      setConfirmSuspend(true)
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
      closeDisabled={saving || confirmSuspend}
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
              {issue.description}
            </p>
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
            <AdminOrderSnapshot order={issue.order} />
          </AdminSection>

          <AdminSection title="Kết quả xử lý">
            {isOpen ? (
              <ResolveIssueForm
                formId={FORM_ID}
                form={form}
                errors={errors}
                violationCounts={issue.violationCounts}
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
        open={confirmSuspend}
        title="Đình chỉ hoạt động?"
        message={`${PENALTY_TARGET_LABELS[form.target] || ''} sẽ bị đình chỉ ngay sau khi lưu. Bạn chắc chắn chứ?`}
        confirmLabel="Đình chỉ"
        loading={saving}
        onConfirm={submit}
        onCancel={() => setConfirmSuspend(false)}
      />
    </AdminDrawer>
  )
}
