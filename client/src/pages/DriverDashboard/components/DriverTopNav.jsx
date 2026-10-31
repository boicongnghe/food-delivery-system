const NAV_TABS = [
  { id: 'dashboard', label: 'Bảng điều khiển & Thu nhập', icon: '📊' },
  { id: 'orders', label: 'Đơn giao hàng', icon: '📦' },
  { id: 'history', label: 'Lịch sử chuyến xe', icon: '🗂️' },
  { id: 'wallet', label: 'Ví tài xế & Rút tiền', icon: '💳' },
  { id: 'ranking', label: 'Xếp hạng & Thưởng', icon: '🏆' },
  { id: 'support', label: 'Hỗ trợ', icon: '🎧' },
  { id: 'settings', label: 'Cài đặt', icon: '⚙️' },
]

function DriverTopNav({
  activeTab,
  setActiveTab,
  isOnline,
  onToggleOnline,
  statusUpdating,
}) {
  return (
    <nav className="driver-topnav" role="navigation" aria-label="Driver portal navigation">
      <div className="driver-topnav-inner">
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

        <div className="nav-driver-panel">
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
        </div>
      </div>
    </nav>
  )
}

export default DriverTopNav
