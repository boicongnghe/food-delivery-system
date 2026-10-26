import { useEffect, useState } from 'react'
import { Camera, ChevronRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import driverApi from '../../api/driverApi'
import AvatarModal from '../../components/AvatarModal/AvatarModal.jsx'
import Navbar from '../../components/Navbar/Navbar.jsx'
import DriverTopNav from './components/DriverTopNav'
import StatCards from './components/StatCards'
import EarningsChart from './components/EarningsChart'
import TripLedger from './components/TripLedger'
import DailyMissions from './components/DailyMissions'
import CustomerPraise from './components/CustomerPraise'
import HotspotMap from './components/HotspotMap'
import DriverSettings from './components/DriverSettings'
import './DriverDashboard.css'

const DATE_TABS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần này' },
  { id: 'month', label: 'Tháng này' },
]

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể tải dữ liệu tài xế.'
}

const SUPPORT_TOPICS = [
  {
    question: 'Thu nhập được cập nhật khi nào?',
    answer: 'Số liệu trên trang được tải từ hồ sơ dashboard của tài xế. Tần suất cập nhật phụ thuộc vào hệ thống ghi nhận chuyến và thu nhập.',
  },
  {
    question: 'Tôi cần làm gì nếu số dư không đúng?',
    answer: 'Đối chiếu biên lai chuyến xe với số dư ví. Hệ thống hiện chưa có chức năng gửi phiếu hỗ trợ trực tiếp; vui lòng liên hệ quản trị viên dự án.',
  },
  {
    question: 'Tôi có thể rút tiền ngay trên trang này không?',
    answer: 'Chưa thể. Dự án chưa kết nối ngân hàng hoặc cổng thanh toán nên trang không thể tạo lệnh chuyển tiền.',
  },
]

function SupportCenter() {
  return (
    <section className="section-card support-center">
      <div className="section-card-header">
        <h1 className="section-card-title">
          <span className="section-card-title-icon" aria-hidden="true">🎧</span>
          Trung tâm hỗ trợ
        </h1>
        <span className="section-card-badge">Câu hỏi thường gặp</span>
      </div>
      <div className="section-card-body">
        <p className="support-intro">
          Tìm câu trả lời nhanh cho các vấn đề về thu nhập, số dư và tài khoản.
        </p>
        <div className="support-faq-list">
          {SUPPORT_TOPICS.map(topic => (
            <details className="support-faq-item" key={topic.question}>
              <summary>{topic.question}</summary>
              <p>{topic.answer}</p>
            </details>
          ))}
        </div>
        <p className="support-contact-note">
          Chưa có kênh chat hoặc gửi yêu cầu hỗ trợ được cấu hình cho dự án.
        </p>
      </div>
    </section>
  )
}

function DriverDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [period, setPeriod] = useState('today')
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadCount, setReloadCount] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showPayoutNotice, setShowPayoutNotice] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const fetchDashboard = async () => {
      try {
        const data = await driverApi.getDashboard(period, controller.signal)
        setDashboard(data)
        setLoadError('')
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }
    fetchDashboard()
    return () => controller.abort()
  }, [period, reloadCount])

  const handleOnlineToggle = async (isOnline) => {
    setStatusUpdating(true)
    setActionError('')

    try {
      const status = await driverApi.updateOnlineStatus(isOnline)
      setDashboard(current => current ? { ...current, isOnline: status.isOnline } : current)
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleProfileUpdated = (updated) => {
    setDashboard(current => current
      ? { ...current, profile: updated.profile, payoutBank: updated.payoutBank }
      : current)
  }

  const periodLabel = DATE_TABS.find(tab => tab.id === period)?.label || DATE_TABS[0].label
  const profile = dashboard?.profile
  const summary = dashboard || {}
  const latestUpdate = dashboard?.updatedAt
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dashboard.updatedAt))
    : ''

  return (
    <div className="driver-shell">
      <Navbar showSearch={false} />
      <div className="driver-home-banner">
        <div className="driver-home-banner-inner">
          <span className="driver-home-banner-message">
            <Sparkles size={18} aria-hidden="true" />
            <span>
              Bạn đang ở <strong>Bảng Quản Lý</strong> với tài khoản{' '}
              <strong className="driver-home-banner-role">Tài Xế Giao Hàng</strong>
            </span>
          </span>
          <Link to="/" className="driver-home-banner-link">
            Xem Trang Chủ Khách Hàng <ChevronRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <DriverTopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={Boolean(dashboard?.isOnline)}
        onToggleOnline={handleOnlineToggle}
        statusUpdating={statusUpdating || isLoading || !dashboard}
      />

      {profile && (
        <div className="driver-profile-strip">
          <div className="profile-strip-inner">
            <button
              type="button"
              className="profile-avatar-edit"
              onClick={() => setAvatarModalOpen(true)}
              aria-label="Đổi ảnh đại diện tài xế"
              title="Đổi ảnh đại diện"
            >
              <img
                src={profile.avatarUrl || '/driver-avatar.png'}
                alt={profile.name}
                className="profile-avatar-lg"
                onError={event => { event.currentTarget.style.display = 'none' }}
              />
              <span className="profile-avatar-edit-icon" aria-hidden="true">
                <Camera size={15} />
              </span>
            </button>
            <div className="profile-info">
              <div className="profile-badge-row">
                <span className="profile-badge-label">🏍️ {profile.tier || 'Đối tác tài xế'}</span>
                {profile.restaurant && (
                  <span style={{ fontSize: 10, color: '#8a8a8a' }}>{profile.restaurant}</span>
                )}
              </div>
              <div className="profile-name">
                Xin chào, {profile.name}
                <span style={{ fontSize: 13, fontWeight: 500, color: '#8a8a8a' }}>
                  {' '}({profile.driverCode})
                </span>
              </div>
              <div className="profile-meta">
                {profile.shiftStart && (
                  <span className="profile-meta-item">🕐 Ca bắt đầu: {profile.shiftStart}</span>
                )}
                {profile.vehicle && (
                  <span className="profile-meta-item">
                    🏍️ {profile.vehicle}{profile.licensePlate ? ` · ${profile.licensePlate}` : ''}
                  </span>
                )}
                {profile.phone && <span className="profile-meta-item">☎ {profile.phone}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="driver-content">
        {['dashboard', 'history', 'ranking'].includes(activeTab) && (
          <div className="date-filter-row" role="tablist" aria-label="Date range filter">
            {DATE_TABS.map(tab => (
              <button
                key={tab.id}
                id={`date-tab-${tab.id}`}
                role="tab"
                aria-selected={period === tab.id}
                className={`date-tab ${period === tab.id ? 'active' : ''}`}
                onClick={() => {
                  if (tab.id !== period) {
                    setIsLoading(true)
                    setLoadError('')
                    setPeriod(tab.id)
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
            <span className="date-filter-note">
              {latestUpdate ? `Cập nhật lần cuối: ${latestUpdate}` : 'Dữ liệu từ máy chủ'}
            </span>
          </div>
        )}

        {actionError && <p className="dashboard-error" role="alert">{actionError}</p>}

        {isLoading && (
          <div className="dashboard-message" role="status">Đang tải dữ liệu bảng điều khiển…</div>
        )}

        {!isLoading && loadError && (
          <div className="dashboard-message dashboard-message-error" role="alert">
            <p>{loadError}</p>
            <button className="date-tab" type="button" onClick={() => {
              setIsLoading(true)
              setLoadError('')
              setReloadCount(count => count + 1)
            }}>
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !loadError && dashboard && (
          <>
            {dashboard.isDemo && (
              <p className="dashboard-demo-notice" role="note">
                Đây là dữ liệu DEMO để minh họa dashboard, không phải dữ liệu vận hành thật.
              </p>
            )}
            {activeTab === 'dashboard' && (
              <>
                <StatCards
                  summary={{ ...summary, tier: profile?.tier }}
                  onWithdraw={() => setShowPayoutNotice(true)}
                />
                <div className="receipt-banner">
                  <div className="receipt-banner-left">
                    <span className="receipt-banner-icon" aria-hidden="true">🧾</span>
                    <div>
                      <p className="receipt-banner-label">Phiếu thu nhập · {periodLabel}</p>
                      <p className="receipt-banner-date">
                        {summary.completedTrips} chuyến hoàn tất · {Number(summary.totalEarnings || 0).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                  {summary.earningsByHour?.some(item => item.surge) && (
                    <span className="receipt-banner-badge">🔥 Có thu nhập giờ cao điểm trong kỳ</span>
                  )}
                </div>
                <div className="dashboard-columns">
                  <div className="dashboard-main">
                    <EarningsChart
                      earningsByHour={summary.earningsByHour || []}
                      forecast={summary.forecast || []}
                      periodLabel={periodLabel}
                    />
                    <TripLedger trips={summary.trips || []} periodLabel={periodLabel} />
                  </div>
                  <div className="dashboard-sidebar">
                    <DailyMissions missions={summary.missions || []} />
                    <CustomerPraise
                      reviews={summary.reviews || []}
                      badges={summary.badges || []}
                      rating={summary.rating}
                    />
                    <HotspotMap hotspots={summary.hotspots || []} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <TripLedger trips={summary.trips || []} periodLabel={periodLabel} />
            )}

            {activeTab === 'wallet' && (
              <section className="section-card wallet-overview">
                <div className="section-card-header">
                  <h1 className="section-card-title">
                    <span className="section-card-title-icon" aria-hidden="true">💳</span>
                    Ví tài xế
                  </h1>
                  <span className="section-card-badge">Số dư khả dụng</span>
                </div>
                <div className="section-card-body">
                  <p className="wallet-overview-balance">
                    {Number(summary.walletBalance || 0).toLocaleString('vi-VN')}đ
                  </p>
                  <div className="wallet-overview-row">
                    <span>Đang chờ xử lý</span>
                    <strong>{Number(summary.pendingBalance || 0).toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div className="wallet-overview-row">
                    <span>Thu nhập tuần này</span>
                    <strong>{Number(summary.weeklyEarnings || 0).toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div className="wallet-overview-row">
                    <span>Tài khoản nhận tiền</span>
                    <strong>{summary.payoutBank || 'Chưa thiết lập'}</strong>
                  </div>
                  <button
                    className="cta-btn wallet-overview-action"
                    onClick={() => setShowPayoutNotice(true)}
                    type="button"
                  >
                    Yêu cầu rút tiền
                  </button>
                  <p className="wallet-integration-note">
                    Chuyển khoản chưa khả dụng: chưa kết nối ngân hàng hoặc cổng thanh toán.
                  </p>
                </div>
              </section>
            )}

            {activeTab === 'ranking' && (
              <div className="dashboard-columns ranking-columns">
                <div className="dashboard-sidebar">
                  <DailyMissions missions={summary.missions || []} />
                  <CustomerPraise
                    reviews={summary.reviews || []}
                    badges={summary.badges || []}
                    rating={summary.rating}
                  />
                </div>
              </div>
            )}

            {activeTab === 'support' && <SupportCenter />}

            {activeTab === 'settings' && (
              <DriverSettings onProfileUpdated={handleProfileUpdated} />
            )}
          </>
        )}
      </main>

      {showPayoutNotice && (
        <div
          className="payout-dialog-backdrop"
          onClick={() => setShowPayoutNotice(false)}
          role="presentation"
        >
          <section
            aria-labelledby="payout-dialog-title"
            aria-modal="true"
            className="payout-dialog"
            onClick={event => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Đóng thông báo"
              className="payout-dialog-close"
              onClick={() => setShowPayoutNotice(false)}
              type="button"
            >
              ×
            </button>
            <span className="payout-dialog-icon" aria-hidden="true">🏦</span>
            <h2 id="payout-dialog-title">Rút tiền chưa khả dụng</h2>
            <p>
              Số dư ví hiện tại là{' '}
              <strong>{Number(summary.walletBalance || 0).toLocaleString('vi-VN')}đ</strong>.
              {' '}Ứng dụng chưa kết nối ngân hàng hoặc cổng thanh toán nên chưa thể gửi yêu cầu hay chuyển tiền.
            </p>
            <button
              className="cta-btn"
              onClick={() => setShowPayoutNotice(false)}
              type="button"
            >
              Đã hiểu
            </button>
          </section>
        </div>
      )}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => {
          setAvatarModalOpen(false)
          setReloadCount(count => count + 1)
        }}
      />
    </div>
  )
}

export default DriverDashboard
