import { useEffect, useState } from 'react'
import driverApi from '../../../api/driverApi'

const EMPTY_SETTINGS = {
  fullName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  vehicle: '',
  licensePlate: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể lưu cài đặt.'
}

function DriverSettings({ onProfileUpdated }) {
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
      const updated = await driverApi.updateSettings(settings)
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

  const bankFields = ['bankName', 'bankAccountName', 'bankAccountNumber']
  const isBankDetailsIncomplete = bankFields.some(field => settings[field])
    && !bankFields.every(field => settings[field])

  if (isLoading) {
    return <div className="dashboard-message" role="status">Đang tải cài đặt tài khoản…</div>
  }
  if (loadError) {
    return (
      <div className="dashboard-message dashboard-message-error" role="alert">
        <p>{loadError}</p>
        <button className="date-tab" onClick={() => {
          setIsLoading(true)
          setReloadCount(count => count + 1)
        }} type="button">
          Thử tải lại
        </button>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <section className="section-card settings-card">
        <div className="section-card-header">
          <h1 className="section-card-title">
            <span className="section-card-title-icon" aria-hidden="true">⚙️</span>
            Cài đặt tài xế
          </h1>
          <span className="section-card-badge">Thông tin tài khoản</span>
        </div>

        <form className="settings-form" onSubmit={handleProfileSubmit}>
          <div className="settings-section-heading">
            <h2>Hồ sơ cá nhân</h2>
            <p>Email đăng nhập: <strong>{settings.email}</strong></p>
          </div>

          <div className="settings-fields-grid">
            <label className="settings-field">
              <span>Họ và tên</span>
              <input
                autoComplete="name"
                maxLength="100"
                name="fullName"
                onChange={updateSetting}
                required
                value={settings.fullName}
              />
            </label>
            <label className="settings-field">
              <span>Số điện thoại</span>
              <input
                autoComplete="tel"
                maxLength="20"
                name="phone"
                onChange={updateSetting}
                value={settings.phone}
              />
            </label>
            <label className="settings-field settings-field-wide">
              <span>Đường dẫn ảnh đại diện</span>
              <input
                autoComplete="url"
                maxLength="500"
                name="avatarUrl"
                onChange={updateSetting}
                placeholder="https://..."
                type="url"
                value={settings.avatarUrl}
              />
            </label>
          </div>

          <div className="settings-section-heading">
            <h2>Phương tiện giao hàng</h2>
          </div>
          <div className="settings-fields-grid">
            <label className="settings-field">
              <span>Loại xe</span>
              <input
                maxLength="100"
                name="vehicle"
                onChange={updateSetting}
                placeholder="Ví dụ: Honda Wave"
                value={settings.vehicle}
              />
            </label>
            <label className="settings-field">
              <span>Biển số xe</span>
              <input
                autoCapitalize="characters"
                maxLength="20"
                name="licensePlate"
                onChange={updateSetting}
                placeholder="Ví dụ: 29A1-123.45"
                value={settings.licensePlate}
              />
            </label>
          </div>

          <div className="settings-section-heading">
            <h2>Tài khoản nhận tiền</h2>
            <p>Thông tin chỉ được lưu để tham khảo; ứng dụng chưa hỗ trợ chuyển khoản.</p>
          </div>
          <div className="settings-fields-grid">
            <label className="settings-field">
              <span>Tên ngân hàng</span>
              <input
                autoComplete="off"
                maxLength="100"
                name="bankName"
                onChange={updateSetting}
                placeholder="Ví dụ: Vietcombank"
                value={settings.bankName}
              />
            </label>
            <label className="settings-field">
              <span>Chủ tài khoản</span>
              <input
                autoComplete="off"
                maxLength="100"
                name="bankAccountName"
                onChange={updateSetting}
                value={settings.bankAccountName}
              />
            </label>
            <label className="settings-field">
              <span>Số tài khoản</span>
              <input
                autoComplete="off"
                inputMode="numeric"
                maxLength="20"
                name="bankAccountNumber"
                onChange={updateSetting}
                pattern="[0-9]{6,20}"
                value={settings.bankAccountNumber}
              />
            </label>
          </div>

          {isBankDetailsIncomplete && (
            <p className="settings-error" role="alert">
              Vui lòng điền đủ tên ngân hàng, chủ tài khoản và số tài khoản.
            </p>
          )}
          {profileError && <p className="settings-error" role="alert">{profileError}</p>}
          {profileSuccess && <p className="settings-success" role="status">{profileSuccess}</p>}

          <div className="settings-actions">
            <button className="cta-btn" disabled={isSavingProfile || isBankDetailsIncomplete} type="submit">
              {isSavingProfile ? 'Đang lưu…' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </section>

      <section className="section-card settings-card">
        <div className="section-card-header">
          <h2 className="section-card-title">
            <span className="section-card-title-icon" aria-hidden="true">🔒</span>
            Đổi mật khẩu
          </h2>
        </div>
        <form className="settings-form" onSubmit={handlePasswordSubmit}>
          <div className="settings-fields-grid">
            <label className="settings-field settings-field-wide">
              <span>Mật khẩu hiện tại</span>
              <input
                autoComplete="current-password"
                name="currentPassword"
                onChange={event => setPasswords(current => ({ ...current, currentPassword: event.target.value }))}
                required
                type="password"
                value={passwords.currentPassword}
              />
            </label>
            <label className="settings-field">
              <span>Mật khẩu mới</span>
              <input
                autoComplete="new-password"
                minLength="6"
                name="newPassword"
                onChange={event => setPasswords(current => ({ ...current, newPassword: event.target.value }))}
                required
                type="password"
                value={passwords.newPassword}
              />
            </label>
            <label className="settings-field">
              <span>Xác nhận mật khẩu mới</span>
              <input
                autoComplete="new-password"
                minLength="6"
                name="confirmPassword"
                onChange={event => setPasswords(current => ({ ...current, confirmPassword: event.target.value }))}
                required
                type="password"
                value={passwords.confirmPassword}
              />
            </label>
          </div>
          {passwordError && <p className="settings-error" role="alert">{passwordError}</p>}
          {passwordSuccess && <p className="settings-success" role="status">{passwordSuccess}</p>}
          <div className="settings-actions">
            <button className="cta-btn" disabled={isChangingPassword} type="submit">
              {isChangingPassword ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default DriverSettings
