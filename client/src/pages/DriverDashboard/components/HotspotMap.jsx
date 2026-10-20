const HOTSPOT_STREETS = [
  {
    id: 'hotspot-fpt-gate',
    name: 'Cổng chính FPT Hòa Lạc',
    district: 'Khu CNC Hòa Lạc',
    level: 'hot',
    demand: 96,
    orders: '38 đơn đang chờ',
    pin: { top: '30%', left: '55%' },
    zone: { top: '12%', left: '42%', width: 90, height: 90 },
  },
  {
    id: 'hotspot-lien-quan',
    name: 'Thị trấn Liên Quan',
    district: 'Thạch Thất',
    level: 'hot',
    demand: 84,
    orders: '29 đơn đang chờ',
    pin: { top: '55%', left: '26%' },
    zone: { top: '40%', left: '14%', width: 75, height: 75 },
  },
  {
    id: 'hotspot-km29',
    name: 'Km29 Đại lộ Thăng Long',
    district: 'Thạch Thất',
    level: 'hot',
    demand: 79,
    orders: '22 đơn đang chờ',
    pin: { top: '42%', left: '72%' },
    zone: { top: '28%', left: '62%', width: 68, height: 68 },
  },
  {
    id: 'hotspot-dong-lo',
    name: 'Khu nhà trọ Đông Lỗ',
    district: 'Thạch Thất',
    level: 'med',
    demand: 67,
    orders: '17 đơn đang chờ',
    pin: null,
    zone: { top: '60%', left: '48%', width: 58, height: 58 },
  },
  {
    id: 'hotspot-knc',
    name: 'Khu CNC Hòa Lạc (Alpha/Beta)',
    district: 'Hòa Lạc',
    level: 'med',
    demand: 60,
    orders: '14 đơn đang chờ',
    pin: null,
    zone: { top: '20%', left: '65%', width: 52, height: 52 },
  },
  {
    id: 'hotspot-dhqg',
    name: 'Làng ĐH Quốc gia HN',
    district: 'Hòa Lạc',
    level: 'low',
    demand: 45,
    orders: '9 đơn đang chờ',
    pin: null,
    zone: { top: '65%', left: '20%', width: 45, height: 45 },
  },
]

const LEVEL_CONFIG = {
  hot: { barColor: '#d93025', label: 'Cực cao', labelClass: 'hot', dotColor: '#d93025' },
  med: { barColor: '#d97706', label: 'Trung bình', labelClass: 'med', dotColor: '#d97706' },
  low: { barColor: '#1d4ed8', label: 'Thấp',    labelClass: 'low', dotColor: '#1d4ed8' },
}

const ZONE_COLORS = { hot: 'red', med: 'orange', low: 'yellow' }

function HotspotMap() {
  const pins = HOTSPOT_STREETS.filter(s => s.pin)

  return (
    <div className="section-card" id="hotspot-map-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">🗺️</span>
          Bản đồ Khu vực Bếp Đỏ
        </div>
        <span className="section-card-badge">📍 Thạch Thất – Hòa Lạc</span>
      </div>

      {/* Mini Map */}
      <div className="hotspot-map" role="img" aria-label="Thạch Thất – Hòa Lạc delivery hotspot map">
        <div className="hotspot-map-grid" aria-hidden="true" />

        {/* Road overlay — Đại lộ Thăng Long */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: '45%', left: 0, right: 0,
          height: 4,
          background: 'rgba(100,100,120,0.25)',
          transform: 'rotate(-4deg)',
          transformOrigin: 'left center',
        }} />

        <div className="hotspot-map-canvas" aria-hidden="true">
          {/* Heat zones */}
          {HOTSPOT_STREETS.map(s => (
            <div
              key={`zone-${s.id}`}
              className={`hotspot-zone ${ZONE_COLORS[s.level]}`}
              style={{
                top: s.zone.top, left: s.zone.left,
                width: s.zone.width, height: s.zone.height,
              }}
            />
          ))}

          {/* Pins */}
          {pins.map(s => (
            <div
              key={`pin-${s.id}`}
              className="hotspot-pin"
              style={{ top: s.pin.top, left: s.pin.left }}
              title={`${s.name}: ${s.orders}`}
            >
              <div className="hotspot-pin-bubble">{s.name}</div>
              <div className="hotspot-pin-dot" />
            </div>
          ))}

          {/* Road label */}
          <div style={{
            position: 'absolute',
            top: '42%', left: '8px',
            fontSize: 9, fontWeight: 700,
            color: 'rgba(60,60,80,0.55)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transform: 'rotate(-4deg)',
            transformOrigin: 'left center',
          }}>
            Đại lộ Thăng Long →
          </div>

          <div style={{
            position: 'absolute',
            bottom: 8, left: 12,
            fontSize: 9, fontWeight: 700,
            color: 'rgba(29,78,216,0.5)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            📍 Thạch Thất · Hòa Lạc · Hà Nội
          </div>
        </div>
      </div>

      {/* Street list */}
      <div className="hotspot-list" role="list" aria-label="High demand areas">
        {HOTSPOT_STREETS.map(s => {
          const cfg = LEVEL_CONFIG[s.level]
          return (
            <div key={s.id} id={s.id} className="hotspot-street" role="listitem">
              <div className="hotspot-street-name">
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg.dotColor, display: 'inline-block', flexShrink: 0,
                }} aria-hidden="true" />
                <div>
                  <div>{s.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {s.district}</span></div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{s.orders}</div>
                </div>
              </div>
              <div className="hotspot-level">
                <div
                  className="hotspot-bar"
                  style={{ width: `${s.demand * 0.55}px`, background: cfg.barColor }}
                  aria-hidden="true"
                />
                <span className={`hotspot-label ${s.level}`}>{cfg.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hotspot-alert" role="alert">
        <strong>💡 Gợi ý:</strong> Về <strong>Cổng FPT Hòa Lạc</strong> ngay — sinh viên tan học buổi trưa, nhu cầu giao đồ ăn cực cao! Khu nhà trọ Đông Lỗ &amp; Liên Quan cũng đang tăng.
      </div>
    </div>
  )
}

export default HotspotMap
