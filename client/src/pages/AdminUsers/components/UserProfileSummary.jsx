import { Star } from 'lucide-react'
import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import AdminInfoRow from '../../../components/AdminInfoRow/AdminInfoRow.jsx'
import AdminSection from '../../../components/AdminSection/AdminSection.jsx'
import { formatDateTime } from '../../../utils/formatDate.js'
import { ROLES } from '../constants.js'
import PartnerStatusBadge from './PartnerStatusBadge.jsx'

// Account info + the restaurant / shipper profile attached to it
export default function UserProfileSummary({ detail }) {
  const { user, restaurant, shipperProfile } = detail
  const role = ROLES[user.role] || { label: user.role, tone: 'slate' }

  return (
    <>
      <div className="flex items-center gap-4">
        <img src={user.avatar} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-purple-500/30" />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{user.fullName}</p>
          <p className="truncate text-sm text-slate-400">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <AdminBadge tone={role.tone}>{role.label}</AdminBadge>
            {user.isActive ? (
              <AdminBadge tone="emerald">Hoạt động</AdminBadge>
            ) : (
              <AdminBadge tone="red">Đã khóa</AdminBadge>
            )}
          </div>
        </div>
      </div>

      <AdminSection title="Thông tin liên hệ">
        <AdminInfoRow label="Số điện thoại">{user.phone || '—'}</AdminInfoRow>
        <AdminInfoRow label="Ngày tham gia">{formatDateTime(user.createdAt)}</AdminInfoRow>
        <AdminInfoRow label="Địa chỉ đã lưu">{user.addresses?.length || 0}</AdminInfoRow>
      </AdminSection>

      {restaurant && (
        <AdminSection title="Nhà hàng sở hữu" aside={<PartnerStatusBadge status={restaurant.status} />}>
          <AdminInfoRow label="Tên quán">{restaurant.name}</AdminInfoRow>
          <AdminInfoRow label="Đánh giá">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {restaurant.rating} ({restaurant.ratingCount} lượt)
            </span>
          </AdminInfoRow>
          <AdminInfoRow label="Địa chỉ">{restaurant.address}</AdminInfoRow>
        </AdminSection>
      )}

      {user.role === 'shipper' && (
        <AdminSection
          title="Hồ sơ tài xế"
          aside={shipperProfile && <PartnerStatusBadge status={shipperProfile.status} />}
        >
          {shipperProfile ? (
            <>
              <AdminInfoRow label="Phương tiện">{shipperProfile.vehicleInfo || '—'}</AdminInfoRow>
              <AdminInfoRow label="Điểm đánh giá">{shipperProfile.rating}</AdminInfoRow>
            </>
          ) : (
            <p className="text-sm text-slate-500">Tài khoản chưa có hồ sơ tài xế (chưa khai báo giấy tờ xe).</p>
          )}
        </AdminSection>
      )}
    </>
  )
}
