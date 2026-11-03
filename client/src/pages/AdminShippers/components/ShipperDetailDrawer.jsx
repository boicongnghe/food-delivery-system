import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import adminPartnerApi from '../../../api/adminPartnerApi.js'
import AdminDocumentPreview from '../../../components/AdminDocumentPreview/AdminDocumentPreview.jsx'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminPartnerAccount from '../../../components/AdminPartnerAccount/AdminPartnerAccount.jsx'
import AdminPartnerActivity from '../../../components/AdminPartnerActivity/AdminPartnerActivity.jsx'
import AdminPartnerDecision from '../../../components/AdminPartnerDecision/AdminPartnerDecision.jsx'
import AdminPartnerStatusActions from '../../../components/AdminPartnerStatusActions/AdminPartnerStatusActions.jsx'
import AdminPartnerStatusBadge from '../../../components/AdminPartnerStatusBadge/AdminPartnerStatusBadge.jsx'
import AdminRegistrationChecklist from '../../../components/AdminRegistrationChecklist/AdminRegistrationChecklist.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { formatDateTime, formatDay } from '../../../utils/formatDate.js'

const STATUS_EFFECTS = {
  approved: 'Tài xế được xem và nhận các đơn đang chờ giao.',
  rejected: 'Tài xế không nhận được đơn. Có thể duyệt lại sau khi tài xế bổ sung hồ sơ.',
  suspended:
    'Tài xế không xem / nhận được đơn mới nhưng vẫn đăng nhập được. Muốn chặn đăng nhập, dùng "Khóa tài khoản".',
}

const getErrorMessage = (error) => {
  const data = error.response?.data
  const details = data?.errors?.map((item) => item.message).join('; ')
  return [data?.message || 'Thao tác không thành công', details].filter(Boolean).join(': ')
}

// "2004-05-20" -> 22 (full years today), null when unreadable
const getAge = (dateOfBirth) => {
  const birth = new Date(dateOfBirth)
  if (!dateOfBirth || Number.isNaN(birth.getTime())) return null
  const today = new Date()
  const hadBirthday =
    today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  return today.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1)
}

/**
 * Review a shipper registration and change its status. Mount with key={shipperId}.
 * @param {() => void} onChanged - something was saved: the list behind should reload
 */
export default function ShipperDetailDrawer({ shipperId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    adminPartnerApi
      .getShipper(shipperId)
      .then((response) => {
        if (!ignore) setDetail(response.data)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.response?.data?.message || 'Không tải được hồ sơ tài xế')
      })

    return () => {
      ignore = true
    }
  }, [shipperId, reloadKey])

  const changeStatus = async (data) => {
    setBusy(true)
    try {
      const response = await adminPartnerApi.changeShipperStatus(shipperId, data)
      setDetail(response.data)
      toast.success(response.message)
      onChanged()
      return true
    } catch (requestError) {
      toast.error(getErrorMessage(requestError))
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAccountChanged = () => {
    setReloadKey((key) => key + 1)
    onChanged()
  }

  const canApprove = detail?.registrationChecks.every((check) => !check.required || check.ok)
  const age = detail && getAge(detail.dateOfBirth)
  const insurance = detail?.vehicleInsurance

  return (
    <AdminDrawer
      title={detail ? detail.fullName || detail.user?.fullName : 'Hồ sơ tài xế'}
      subtitle={detail && `Đăng ký lúc ${formatDateTime(detail.createdAt)}`}
      badge={detail && <AdminPartnerStatusBadge status={detail.status} />}
      footer={
        detail && (
          <AdminPartnerStatusActions
            key={detail.status}
            status={detail.status}
            effects={STATUS_EFFECTS}
            canApprove={canApprove}
            busy={busy}
            onSubmit={changeStatus}
          />
        )
      }
      closeDisabled={busy}
      onClose={onClose}
    >
      {error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{error}</p>
      )}
      {!detail && !error && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {detail && (
        <>
          <AdminPartnerDecision status={detail.status} statusChange={detail.statusChange} />

          <AdminSection title="Đối chiếu hồ sơ đăng ký">
            <AdminRegistrationChecklist
              checks={detail.registrationChecks}
              isReviewing={['pending', 'rejected'].includes(detail.status)}
            />
          </AdminSection>

          {/* Same labels and order as the shipper step of the register form */}
          <AdminSection title="Thông tin tài xế đã khai báo">
            <AdminInfoRow label="Họ và tên">{detail.fullName || '—'}</AdminInfoRow>
            <AdminInfoRow label="Ngày tháng năm sinh">
              {detail.dateOfBirth ? `${formatDay(detail.dateOfBirth)}${age !== null ? ` (${age} tuổi)` : ''}` : '—'}
            </AdminInfoRow>
            <AdminInfoRow label="Số CCCD của tài xế">
              <span className="font-mono">{detail.citizenId || '—'}</span>
            </AdminInfoRow>
            <AdminInfoRow label="Thông tin loại xe & Biển số xe">{detail.vehicleInfo || '—'}</AdminInfoRow>
            <AdminInfoRow label="Bảo hiểm TNDS xe máy">
              {insurance?.hasInsurance
                ? `Đã có${insurance.insuranceInfo ? `: ${insurance.insuranceInfo}` : ''}`
                : 'Bổ sung sau khi kích hoạt'}
            </AdminInfoRow>
            <AdminInfoRow label="Số điện thoại">{detail.phone || '—'}</AdminInfoRow>
          </AdminSection>

          {/* Not asked by the register form today; shown when a file was added another way */}
          {detail.vehicleRegistration?.fileData && (
            <AdminSection title="Giấy đăng ký xe">
              <AdminDocumentPreview file={detail.vehicleRegistration} />
            </AdminSection>
          )}
          {insurance?.fileData && (
            <AdminSection title="Giấy bảo hiểm xe">
              <AdminDocumentPreview file={insurance} />
            </AdminSection>
          )}

          <AdminPartnerAccount title="Tài khoản tài xế" account={detail.user} onChanged={handleAccountChanged} />

          <AdminPartnerActivity
            title="Hoạt động giao hàng"
            orderStats={detail.orderStats}
            rating={detail.rating}
            ratingLabel="/ 5"
            violationCount={detail.violationCount}
          />
        </>
      )}
    </AdminDrawer>
  )
}
