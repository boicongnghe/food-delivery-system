import { useEffect, useState } from 'react'
import { Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import driverApi from '../../../api/driverApi'

const EMPTY_SETTINGS = {
  fullName: '',
  email: '',
  phone: '',
  avatarUrl: '',
  citizenIdMasked: '',
  vehicleInfo: '',
  shipperStatus: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể lưu cài đặt.'
}

function DriverSettings({
  onProfileUpdated,
  theme,
  onThemeChange,
  mobilePreview,
  onMobilePreviewChange,
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
      const {
        fullName,
        phone,
        avatarUrl,
        bankName,
        bankAccountName,
        bankAccountNumber,
      } = settings
      const updated = await driverApi.updateSettings({
        fullName,
        phone,
        avatarUrl,
        bankName,
        bankAccountName,
        bankAccountNumber,
      })
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
      <section className="section-card settings-card settings-appearance-card">
        <div className="section-card-header">
          <h1 className="section-card-title">
            <span className="section-card-title-icon" aria-hidden="true">🎨</span>
            Giao diện ứng dụng
          </h1>
          <span className="section-card-badge">Tùy chỉnh hiển thị</span>
        </div>
        <div className="settings-form">
          <div className="settings-appearance-row">
            <div className="settings-appearance-copy">
              <h2>Chế độ màu</h2>
              <p>Chọn giao diện sáng hoặc tối cho trang tài xế.</p>
            </div>
            <div className="settings-choice-group" role="group" aria-label="Chế độ màu">
              <button
                type="button"
                className={`settings-choice-button ${theme === 'light' ? 'active' : ''}`}
                aria-pressed={theme === 'light'}
                onClick={() => onThemeChange('light')}
              >
                <Sun size={16} /> Sáng
              </button>
              <button
                type="button"
                className={`settings-choice-button ${theme === 'dark' ? 'active' : ''}`}
                aria-pressed={theme === 'dark'}
                onClick={() => onThemeChange('dark')}
              >
                <Moon size={16} /> Tối
              </button>
            </div>
          </div>
          <div className="settings-appearance-row">
            <div className="settings-appearance-copy">
              <h2>Xem trước trên điện thoại</h2>
              <p>Thu giao diện vào khung điện thoại để xem cách bố trí trên màn hình nhỏ.</p>
            </div>
            <button
              type="button"
              className={`settings-choice-button ${mobilePreview ? 'active' : ''}`}
              aria-pressed={mobilePreview}
              onClick={() => onMobilePreviewChange(!mobilePreview)}
            >
              {mobilePreview ? <Monitor size={16} /> : <Smartphone size={16} />}
              {mobilePreview ? 'Tắt xem trước' : 'Xem trên mobile'}
            </button>
          </div>
        </div>
      </section>

      <section className="section-card settings-card">
        <div className="section-card-header">
          <h1 className="section-card-title">
            <span className="section-card-title-icon" aria-hidden="true">⚙️</span>
            Hồ sơ tài xế
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
          </div>

          <div className="settings-section-heading">
            <h2>Thông tin đã khai báo để xác minh</h2>
            <p>CCCD và phương tiện được cố định sau khi gửi đăng ký. Muốn thay đổi, vui lòng liên hệ quản trị viên.</p>
            {settings.shipperStatus && (
              <p>
                Trạng thái hồ sơ:{' '}
                <strong>
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
          <div className="settings-fields-grid">
            <label className="settings-field">
              <span>Số CCCD (đã che)</span>
              <input aria-readonly="true" readOnly value={settings.citizenIdMasked || 'Chưa có thông tin'} />
            </label>
            <label className="settings-field">
              <span>Phương tiện / biển số đã khai báo</span>
              <input aria-readonly="true" readOnly value={settings.vehicleInfo || 'Chưa có thông tin'} />
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
