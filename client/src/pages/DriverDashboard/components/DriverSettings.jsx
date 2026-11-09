import { useEffect, useState } from 'react'
import { LockKeyhole, Monitor, Smartphone, UserRound } from 'lucide-react'
import driverApi from '../../../api/driverApi'
import SectionCard from './SectionCard.jsx'

const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-slate-700'
const inputClass =
  'w-full rounded-md border border-transparent bg-brand-light px-3 py-2.5 text-sm text-slate-800 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15'
const readOnlyClass = 'w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500'
const primaryButtonClass = 'rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60'

const EMPTY_SETTINGS = {
  fullName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  citizenIdMasked: '',
  vehicleInfo: '',
  shipperStatus: '',
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể lưu cài đặt.'
}

function DriverSettings({
  onProfileUpdated,
  mobilePreview,
  onMobilePreviewChange,
  onOpenWallet,
}) {
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    let isMounted = true

    driverApi.getSettings()
      .then(data => {
        if (isMounted) {
          setSettings({ ...EMPTY_SETTINGS, ...data })
          setLoadError('')
          setProfileError('')
        }
      })
      .catch(error => {
        if (isMounted) {
          setLoadError(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [reloadCount])

  const updateSetting = event => {
    const { name, value } = event.target
    setSettings(current => ({ ...current, [name]: value }))
  }

  const handleProfileSubmit = async event => {
    event.preventDefault()
    setIsSavingProfile(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const { fullName, phone, avatarUrl } = settings
      const updated = await driverApi.updateSettings({ fullName, phone, avatarUrl })
      onProfileUpdated(updated)
      setProfileSuccess('Đã lưu thông tin tài xế.')
    } catch (error) {
      setProfileError(getErrorMessage(error))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async event => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (passwords.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await driverApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      setPasswordSuccess(result.message || 'Đổi mật khẩu thành công.')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setPasswordError(getErrorMessage(error))
    } finally {
      setIsChangingPassword(false)
    }
  }


  if (isLoading) {
    return <p className="py-16 text-center text-sm text-slate-500" role="status">Đang tải cài đặt tài khoản…</p>
  }
  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-white px-6 py-12 text-center" role="alert">
        <p className="text-sm text-red-700">{loadError}</p>
        <button
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover"
          onClick={() => {
            setIsLoading(true)
            setReloadCount(count => count + 1)
          }}
          type="button"
        >
          Thử tải lại
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SectionCard title="Xem trước giao diện" icon={Smartphone} badge="Tùy chỉnh hiển thị" as="h1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Xem trước trên điện thoại</h2>
            <p className="text-sm text-slate-600">Thu giao diện vào khung điện thoại để xem cách bố trí trên màn hình nhỏ.</p>
          </div>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
              mobilePreview ? 'border-brand bg-brand text-white' : 'border-brand-soft bg-white text-slate-700 hover:bg-brand-light'
            }`}
            aria-pressed={mobilePreview}
            onClick={() => onMobilePreviewChange(!mobilePreview)}
          >
            {mobilePreview ? <Monitor size={16} /> : <Smartphone size={16} />}
            {mobilePreview ? 'Tắt xem trước' : 'Xem trên mobile'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Hồ sơ tài xế" icon={UserRound} badge="Thông tin tài khoản" as="h1">
        <form className="space-y-5" onSubmit={handleProfileSubmit}>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Hồ sơ cá nhân</h2>
            <p className="text-sm text-slate-600">Email đăng nhập: <strong>{settings.email}</strong></p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Họ và tên</span>
              <input
                autoComplete="name"
                className={inputClass}
                maxLength="100"
                name="fullName"
                onChange={updateSetting}
                required
                value={settings.fullName}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Số điện thoại</span>
              <input
                autoComplete="tel"
                className={inputClass}
                maxLength="20"
                name="phone"
                onChange={updateSetting}
                value={settings.phone}
              />
            </label>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h2 className="text-sm font-bold text-slate-900">Thông tin đã khai báo để xác minh</h2>
            <p className="text-sm text-slate-600">CCCD và phương tiện được cố định sau khi gửi đăng ký. Muốn thay đổi, vui lòng liên hệ quản trị viên.</p>
            {settings.shipperStatus && (
              <p className="mt-1 text-sm text-slate-600">
                Trạng thái hồ sơ:{' '}
                <strong className="text-slate-900">
                  {settings.shipperStatus === 'approved'
                    ? 'Đã xác minh'
                    : settings.shipperStatus === 'pending'
                      ? 'Đang chờ xác minh'
                      : settings.shipperStatus === 'rejected'
                        ? 'Không được duyệt'
                        : settings.shipperStatus}
                </strong>
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Số CCCD (đã che)</span>
              <input aria-readonly="true" className={readOnlyClass} readOnly value={settings.citizenIdMasked || 'Chưa có thông tin'} />
            </label>
            <label className="block">
              <span className={labelClass}>Phương tiện / biển số đã khai báo</span>
              <input aria-readonly="true" className={readOnlyClass} readOnly value={settings.vehicleInfo || 'Chưa có thông tin'} />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-light/60 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tài khoản nhận tiền</h2>
              <p className="text-sm text-slate-600">
                Tài khoản ngân hàng được quản lý trong tab Ví: lưu nhiều tài khoản và chọn tài khoản mặc định để rút tiền.
              </p>
            </div>
            <button
              className="shrink-0 rounded-md border border-brand-soft bg-white px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
              onClick={onOpenWallet}
              type="button"
            >
              Quản lý tài khoản trong Ví
            </button>
          </div>

          {profileError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{profileError}</p>}
          {profileSuccess && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{profileSuccess}</p>}

          <div className="flex justify-end">
            <button className={primaryButtonClass} disabled={isSavingProfile} type="submit">
              {isSavingProfile ? 'Đang lưu…' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Đổi mật khẩu" icon={LockKeyhole}>
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Mật khẩu hiện tại</span>
              <input
                autoComplete="current-password"
                className={inputClass}
                name="currentPassword"
                onChange={event => setPasswords(current => ({ ...current, currentPassword: event.target.value }))}
                required
                type="password"
                value={passwords.currentPassword}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Mật khẩu mới</span>
              <input
                autoComplete="new-password"
                className={inputClass}
                minLength="6"
                name="newPassword"
                onChange={event => setPasswords(current => ({ ...current, newPassword: event.target.value }))}
                required
                type="password"
                value={passwords.newPassword}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Xác nhận mật khẩu mới</span>
              <input
                autoComplete="new-password"
                className={inputClass}
                minLength="6"
                name="confirmPassword"
                onChange={event => setPasswords(current => ({ ...current, confirmPassword: event.target.value }))}
                required
                type="password"
                value={passwords.confirmPassword}
              />
            </label>
          </div>
          {passwordError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{passwordError}</p>}
          {passwordSuccess && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{passwordSuccess}</p>}
          <div className="flex justify-end">
            <button className={primaryButtonClass} disabled={isChangingPassword} type="submit">
              {isChangingPassword ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}

export default DriverSettings
