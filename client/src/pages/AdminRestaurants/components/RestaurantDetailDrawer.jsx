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
import { formatDateTime } from '../../../utils/formatDate.js'

const STATUS_EFFECTS = {
  approved: 'Quán được phép nhận đơn mới trên bảng bếp.',
  rejected: 'Quán không được nhận đơn. Có thể duyệt lại sau khi chủ quán bổ sung hồ sơ.',
  suspended:
    'Quán không nhận được đơn mới và không sửa được thực đơn, vẫn hoàn tất / hoàn tiền được các đơn đang có. Tài khoản chủ quán vẫn đăng nhập được.',
}

const getErrorMessage = (error) => {
  const data = error.response?.data
  const details = data?.errors?.map((item) => item.message).join('; ')
  return [data?.message || 'Thao tác không thành công', details].filter(Boolean).join(': ')
}

/**
 * Review a restaurant registration and change its status. Mount with key={restaurantId}.
 * @param {() => void} onChanged - something was saved: the list behind should reload
 */
export default function RestaurantDetailDrawer({ restaurantId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false

    adminPartnerApi
      .getRestaurant(restaurantId)
      .then((response) => {
        if (!ignore) setDetail(response.data)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.response?.data?.message || 'Không tải được hồ sơ nhà hàng')
      })

    return () => {
      ignore = true
    }
  }, [restaurantId, reloadKey])

  const changeStatus = async (data) => {
    setBusy(true)
    try {
      const response = await adminPartnerApi.changeRestaurantStatus(restaurantId, data)
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

  return (
    <AdminDrawer
      title={detail?.name || 'Hồ sơ nhà hàng'}
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

          {/* Same labels and order as the restaurant step of the register form */}
          <AdminSection title="Thông tin nhà hàng đã khai báo">
            <AdminInfoRow label="Tên thương hiệu quán ăn">{detail.name || '—'}</AdminInfoRow>
            <AdminInfoRow label="Địa chỉ cụ thể của quán">{detail.address || '—'}</AdminInfoRow>
            <AdminInfoRow label="Món ăn / Mặt hàng kinh doanh">{detail.description || '—'}</AdminInfoRow>
            <AdminInfoRow label="Số CCCD của chủ quán">
              <span className="font-mono">{detail.ownerCitizenId || '—'}</span>
            </AdminInfoRow>
            <AdminInfoRow label="Số điện thoại của quán">{detail.phone || '—'}</AdminInfoRow>
          </AdminSection>

          <AdminSection title="Giấy phép kinh doanh / Vệ sinh ATTP">
            <AdminDocumentPreview file={detail.businessLicense} emptyText="Chưa nộp giấy phép kinh doanh" />
          </AdminSection>

          <AdminPartnerAccount title="Tài khoản chủ quán" account={detail.owner} onChanged={handleAccountChanged} />

          <AdminPartnerActivity
            title="Hoạt động kinh doanh"
            orderStats={detail.orderStats}
            rating={detail.rating}
            ratingLabel={`(${detail.ratingCount || 0} lượt)`}
            violationCount={detail.violationCount}
          />
        </>
      )}
    </AdminDrawer>
  )
}
