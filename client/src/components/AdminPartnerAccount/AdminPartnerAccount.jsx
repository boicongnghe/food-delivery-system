import { useState } from 'react'
import toast from 'react-hot-toast'
import { Lock, LockOpen } from 'lucide-react'
import adminUserApi from '../../api/adminUserApi.js'
import { ADMIN_BUTTON } from '../../utils/adminClassNames.js'
import { formatDateTime } from '../../utils/formatDate.js'
import AdminBadge from '../AdminBadge/AdminBadge.jsx'
import AdminInfoRow from '../AdminInfoRow/AdminInfoRow.jsx'
import AdminSection from '../AdminSection/AdminSection.jsx'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog.jsx'

const PROVIDER_LABELS = { local: 'Email & mật khẩu', google: 'Google', facebook: 'Facebook' }

/**
 * Login account behind a restaurant / shipper profile. Locking it is separate from the partner status:
 * a locked account cannot log in at all (UC37, also used by delivery issue penalties).
 * @param {() => void} onChanged - the account was locked / unlocked
 */
export default function AdminPartnerAccount({ title, account, onChanged }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!account) {
    return (
      <AdminSection title={title}>
        <p className="text-sm text-red-600 dark:text-red-400">Tài khoản đăng nhập không còn tồn tại.</p>
      </AdminSection>
    )
  }

  const toggleLock = async () => {
    setBusy(true)
    try {
      const response = await adminUserApi.updateStatus(account._id, !account.isActive)
      toast.success(response.message)
      onChanged()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác không thành công')
    } finally {
      setBusy(false)
      setIsConfirming(false)
    }
  }

  return (
    <AdminSection
      title={title}
      aside={
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          disabled={busy}
          className={account.isActive ? ADMIN_BUTTON.secondary : ADMIN_BUTTON.success}
        >
          {account.isActive ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          {account.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        </button>
      }
    >
      <AdminInfoRow label="Họ và tên">{account.fullName}</AdminInfoRow>
      <AdminInfoRow label="Email">
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
          {account.email}
          {account.isVerified ? (
            <AdminBadge tone="emerald">Đã xác thực</AdminBadge>
          ) : (
            <AdminBadge tone="red">Chưa xác thực</AdminBadge>
          )}
        </span>
      </AdminInfoRow>
      <AdminInfoRow label="Số điện thoại">{account.phone || '—'}</AdminInfoRow>
      <AdminInfoRow label="Đăng nhập bằng">{PROVIDER_LABELS[account.authProvider] || PROVIDER_LABELS.local}</AdminInfoRow>
      <AdminInfoRow label="Ngày đăng ký">{formatDateTime(account.createdAt)}</AdminInfoRow>
      <AdminInfoRow label="Tài khoản">
        {account.isActive ? <AdminBadge tone="emerald">Hoạt động</AdminBadge> : <AdminBadge tone="red">Đã khóa</AdminBadge>}
      </AdminInfoRow>

      <ConfirmDialog
        open={isConfirming}
        title={account.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        message={
          account.isActive
            ? `${account.fullName} sẽ không thể đăng nhập cho đến khi được mở khóa.`
            : `${account.fullName} có thể đăng nhập trở lại.`
        }
        confirmLabel={account.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        loading={busy}
        onConfirm={toggleLock}
        onCancel={() => setIsConfirming(false)}
      />
    </AdminSection>
  )
}
