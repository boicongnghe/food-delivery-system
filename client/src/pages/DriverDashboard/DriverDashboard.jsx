import { useState } from 'react'
import DriverTopNav from './components/DriverTopNav'
import StatCards from './components/StatCards'
import EarningsChart from './components/EarningsChart'
import TripLedger from './components/TripLedger'
import DailyMissions from './components/DailyMissions'
import CustomerPraise from './components/CustomerPraise'
import HotspotMap from './components/HotspotMap'
import './DriverDashboard.css'

const DATE_TABS = [
  { id: 'today',  label: 'Hôm nay (20/10/2026)' },
  { id: 'week',   label: 'Tuần này (13 – 19/10)' },
  { id: 'month',  label: 'Tháng 10/2026' },
  { id: 'custom', label: '📅 Tùy chọn ngày...' },
]

function DriverDashboard() {
  const [activeTab, setActiveTab]   = useState('dashboard')
  const [isOnline, setIsOnline]     = useState(true)
  const [dateTab,  setDateTab]      = useState('today')

  return (
    <div className="driver-shell">
      <DriverTopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
      />

      {/* Driver Profile Strip */}
      <div className="driver-profile-strip">
        <div className="profile-strip-inner">
          <img
            src="/driver-avatar.png"
            alt="Nguyễn Văn Hùng"
            className="profile-avatar-lg"
            onError={e => { e.target.style.display = 'none' }}
          />
          <div className="profile-info">
            <div className="profile-badge-row">
              <span className="profile-badge-label">🏍️ Tài xế xuất sắc</span>
              <span style={{ fontSize: 10, color: '#8a8a8a' }}>Bếp Phố Bình Dân, Hà Nội</span>
            </div>
            <div className="profile-name">Xin chào, Bác tài Nguyễn Văn Hùng <span style={{ fontSize: 13, fontWeight: 500, color: '#8a8a8a' }}>(#TX-9281)</span></div>
            <div className="profile-meta">
              <span className="profile-meta-item">🕐 Ca hôm nay: 06:30 – Mở ca (trực tuyến)</span>
              <span className="profile-meta-item">🏍️ Xe Honda Wave RSX · 29B1-941-18</span>
            </div>
          </div>
          <div className="profile-strip-cta">
            <button className="cta-btn" id="btn-header-withdraw">
              ⚡ Rút tiền nhanh về ngân hàng
            </button>
          </div>
        </div>
      </div>

      <div className="driver-content">
        {/* Date filter */}
        <div className="date-filter-row" role="tablist" aria-label="Date range filter">
          {DATE_TABS.map(t => (
            <button
              key={t.id}
              id={`date-tab-${t.id}`}
              role="tab"
              aria-selected={dateTab === t.id}
              className={`date-tab ${dateTab === t.id ? 'active' : ''}`}
              onClick={() => setDateTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <span className="date-filter-note">Hệ thống đồng bộ dữ liệu mỗi 5 phút · Cập nhật lần cuối: 14:58</span>
        </div>

        {/* Stat Cards */}
        <StatCards />

        {/* Receipt banner (surge alert) */}
        <div className="receipt-banner">
          <div className="receipt-banner-left">
            <span className="receipt-banner-icon">🧾</span>
            <div>
              <p className="receipt-banner-label">Phiếu thu nhập ngày</p>
              <p className="receipt-banner-date">Thứ Ba, 20/10/2026 · Ca sáng &amp; trưa đã kết thúc</p>
            </div>
          </div>
          <span className="receipt-banner-badge">🔥 Giờ cao điểm bữa trưa đang kích hoạt</span>
        </div>

        {/* Main columns */}
        <div className="dashboard-columns">
          <div className="dashboard-main">
            <EarningsChart />
            <TripLedger />
          </div>
          <div className="dashboard-sidebar">
            <DailyMissions />
            <CustomerPraise />
            <HotspotMap />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard
