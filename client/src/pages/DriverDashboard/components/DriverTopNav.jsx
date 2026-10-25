const NAV_TABS = [
  { id: 'dashboard', label: 'Bảng điều khiển & Thu nhập', icon: '📊' },
  { id: 'history', label: 'Lịch sử chuyến xe', icon: '🗂️' },
  { id: 'wallet', label: 'Ví tài xế & Rút tiền', icon: '💳' },
  { id: 'ranking', label: 'Xếp hạng & Thưởng', icon: '🏆' },
  { id: 'support', label: 'Hỗ trợ 24/7', icon: '🎧' },
  { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
]

function DriverTopNav({
  activeTab,
  setActiveTab,
  isOnline,
  onToggleOnline,
  statusUpdating,
  driverName,
  driverCode,
  tier,
  avatarUrl,
}) {
  return (
    <nav className="driver-topnav" role="navigation" aria-label="Driver portal navigation">
      <div className="driver-topnav-inner">
        {/* Brand */}
        <a href="/" className="nav-brand" aria-label="GiaoNhanh Driver Portal">
          <div className="nav-brand-icon" aria-hidden="true">🛵</div>
          <div className="nav-brand-text">
            <span className="nav-brand-name">GiaoNhanh</span>
            <span className="nav-brand-sub">Đối tác tài xế</span>
          </div>
        </a>

        {/* Tabs */}
        <div className="nav-tabs" role="tablist">
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-tab-icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Driver Panel */}
        <div className="nav-driver-panel">
          {/* Online Toggle */}
          <div className="toggle-wrap">
            <span className={`toggle-label ${isOnline ? 'online' : ''}`}>
              {isOnline ? 'Đang trực' : 'Ngoại tuyến'}
            </span>
            <label className="toggle-switch" aria-label="Toggle online status">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={e => onToggleOnline(e.target.checked)}
                disabled={statusUpdating}
                id="driver-online-toggle"
                aria-label="Toggle online status"
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Driver Info */}
          <div className="driver-info">
            <div className="driver-avatar-wrap">
              <img
                src={avatarUrl || '/driver-avatar.png'}
                alt={driverName || 'Tài xế'}
                className="driver-avatar"
                onError={e => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div
                style={{
                  display: 'none',
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f4831f, #d93025)',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, border: '2px solid #f4831f'
                }}
              >👨‍🦱</div>
              <span className={`driver-status-dot ${isOnline ? '' : 'offline'}`} />
            </div>
            <div className="driver-details">
              <span className="driver-name">{driverName || 'Tài xế'}</span>
              <span className="driver-id">
                {driverCode || 'Đang tải hồ sơ…'}{tier ? ` · 💎 ${tier}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default DriverTopNav
