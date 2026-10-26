import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import complaintApi from '../../../api/complaintApi.js'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminOrderSnapshot from '../../../components/AdminOrderSnapshot/AdminOrderSnapshot.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { ADMIN_BUTTON } from '../../../utils/adminClassNames.js'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../../utils/feedbackLabels.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { COMPLAINT_STATUS_TONES } from '../constants.js'
import ComplaintResolveForm from './ComplaintResolveForm.jsx'

const FORM_ID = 'complaint-resolve-form'
const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * UC42 - complaint detail (View complaint detail) + answer it (Resolve complaint). Mount with key={complaintId}.
 * @param {() => void} onResolved - the list behind should reload
 */
export default function ComplaintDetailDrawer({ complaintId, onClose, onResolved }) {
  const [complaint, setComplaint] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ decision: 'resolved', refundAmount: '', note: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (form.note.trim().length < 5) {
      setErrors({ note: 'Nội dung phản hồi ít nhất 5 ký tự' })
      return
    }

    setSaving(true)
    try {
      const response = await complaintApi.resolveComplaint(complaintId, {
        decision: form.decision,
        note: form.note.trim(),
        ...(form.decision === 'resolved' && { refundAmount: Number(form.refundAmount || 0) }),
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
    }
  }

  const isOpen = complaint?.status === 'open'

  return (
    <AdminDrawer
      title={complaint ? `Khiếu nại ${complaint.code}` : 'Khiếu nại'}
      subtitle={complaint && `Gửi lúc ${formatDateTime(complaint.createdAt)}`}
      badge={
        complaint && (
          <AdminBadge tone={COMPLAINT_STATUS_TONES[complaint.status]}>{COMPLAINT_STATUS_LABELS[complaint.status]}</AdminBadge>
        )
      }
      closeDisabled={saving}
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
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{loadError}</p>
      )}
      {!complaint && !loadError && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      )}

      {complaint && (
        <>
          <AdminSection title="Nội dung khiếu nại" aside={<AdminBadge tone="purple">{COMPLAINT_CATEGORY_LABELS[complaint.category]}</AdminBadge>}>
            <p className="whitespace-pre-line rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
              {complaint.description}
            </p>
            {complaint.images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {complaint.images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Ảnh minh chứng" className="h-24 w-24 rounded-xl border border-slate-700 object-cover" />
                  </a>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection title="Các bên liên quan">
            <AdminInfoRow label="Khách hàng">
              {complaint.customer?.fullName} · {complaint.customer?.phone}
              {complaint.customer && !complaint.customer.isActive && ' (đã khóa)'}
            </AdminInfoRow>
            <AdminInfoRow label="Nhà hàng">
              {complaint.restaurant?.name} · {complaint.restaurant?.phone}
            </AdminInfoRow>
            <AdminInfoRow label="Shipper">
              {complaint.shipper ? `${complaint.shipper.fullName} · ${complaint.shipper.phone}` : 'Chưa có'}
            </AdminInfoRow>
          </AdminSection>

          <AdminSection title="Đơn hàng">
            <AdminOrderSnapshot order={complaint.order} />
          </AdminSection>

          <AdminSection title="Kết quả xử lý">
            {isOpen ? (
              <ComplaintResolveForm
                formId={FORM_ID}
                form={form}
                errors={errors}
                maxRefund={complaint.maxRefund}
                disabled={saving}
                onChange={updateForm}
                onSubmit={handleSubmit}
              />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-200">{complaint.resolution.note}</p>
                {complaint.resolution.refundAmount > 0 && (
                  <p className="mt-2 text-sm font-bold text-emerald-300">
                    Đã hoàn {formatCurrency(complaint.resolution.refundAmount)} cho khách
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {complaint.resolution.by?.fullName} · {formatDateTime(complaint.resolution.at)}
                </p>
              </div>
            )}
          </AdminSection>
        </>
      )}
    </AdminDrawer>
  )
}
