import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Lock, LockOpen } from 'lucide-react'
import adminUserApi from '../../../api/adminUserApi.js'
import AdminDrawer from '../../../components/AdminDrawer/AdminDrawer.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog.jsx'
import useAuth from '../../../hooks/useAuth.js'
import { ADMIN_BUTTON, ADMIN_INPUT, ADMIN_LABEL } from '../../../utils/adminClassNames.js'
import { ROLES } from '../constants.js'
import UserActivityStats from './UserActivityStats.jsx'
import UserProfileSummary from './UserProfileSummary.jsx'
import UserViolationList from './UserViolationList.jsx'

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

/**
 * UC37 - account detail with "modify role" and lock / unlock. Mount with key={userId}.
 * @param {() => void} onChanged - an action succeeded: the list behind should reload
 */
export default function UserDetailDrawer({ userId, onClose, onChanged }) {
  const { user: currentUser } = useAuth()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // { title, message, confirmLabel, request }
  const isSelf = currentUser?._id === userId

  useEffect(() => {
    let ignore = false

    adminUserApi
      .getUser(userId)
      .then((response) => {
        if (ignore) return
        setDetail(response.data)
        setRole(response.data.user.role)
      })
      .catch((requestError) => {
        if (!ignore) setError(getErrorMessage(requestError, 'Không tải được thông tin tài khoản'))
      })

    return () => {
      ignore = true
    }
  }, [userId])

  const runConfirmedAction = async () => {
    setBusy(true)
    try {
      const response = await confirm.request()
      setDetail(response.data)
      setRole(response.data.user.role)
      toast.success(response.message)
      onChanged()
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, 'Thao tác không thành công'))
      setRole(detail.user.role)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const askChangeRole = () => {
    setConfirm({
      title: 'Đổi vai trò tài khoản?',
      message: `${detail.user.fullName} sẽ chuyển từ "${ROLES[detail.user.role]?.label}" sang "${ROLES[role].label}". Quyền truy cập thay đổi ngay lập tức.`,
      confirmLabel: 'Đổi vai trò',
      request: () => adminUserApi.updateRole(userId, role),
    })
  }

  const askToggleLock = () => {
    const willLock = detail.user.isActive
    setConfirm({
      title: willLock ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
      message: willLock
        ? `${detail.user.fullName} sẽ không thể đăng nhập hay sử dụng hệ thống cho đến khi được mở khóa.`
        : `${detail.user.fullName} có thể đăng nhập và sử dụng hệ thống trở lại.`,
      confirmLabel: willLock ? 'Khóa tài khoản' : 'Mở khóa',
      request: () => adminUserApi.updateStatus(userId, !willLock),
    })
  }

  const footer =
    detail &&
    (isSelf ? (
      <p className="text-xs text-slate-400">Đây là tài khoản của bạn: không thể tự đổi vai trò hoặc tự khóa.</p>
    ) : (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label htmlFor="user-role" className={ADMIN_LABEL}>
            Vai trò
          </label>
          <div className="flex gap-2">
            <select
              id="user-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              disabled={busy}
              className={ADMIN_INPUT}
            >
              {Object.entries(ROLES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={askChangeRole}
              disabled={busy || role === detail.user.role}
              className={`${ADMIN_BUTTON.primary} shrink-0`}
            >
              Lưu vai trò
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={askToggleLock}
          disabled={busy}
          className={detail.user.isActive ? ADMIN_BUTTON.danger : ADMIN_BUTTON.success}
        >
          {detail.user.isActive ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
          {detail.user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        </button>
      </div>
    ))

  return (
    <AdminDrawer
      title="Chi tiết tài khoản"
      subtitle={detail?.user.email}
      footer={footer}
      closeDisabled={busy || Boolean(confirm)}
      onClose={onClose}
    >
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      {!detail && !error && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      )}
      {detail && (
        <>
          <UserProfileSummary detail={detail} />
          <UserActivityStats detail={detail} />
          <UserViolationList violations={detail.violations} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        loading={busy}
        onConfirm={runConfirmedAction}
        onCancel={() => setConfirm(null)}
      />
    </AdminDrawer>
  )
}
