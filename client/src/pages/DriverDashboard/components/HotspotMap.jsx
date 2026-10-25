const LEVEL_CONFIG = {
  hot: { barColor: '#d93025', label: 'Cực cao', labelClass: 'hot', dotColor: '#d93025' },
  med: { barColor: '#d97706', label: 'Trung bình', labelClass: 'med', dotColor: '#d97706' },
  low: { barColor: '#1d4ed8', label: 'Thấp',    labelClass: 'low', dotColor: '#1d4ed8' },
}

const ZONE_COLORS = { hot: 'red', med: 'orange', low: 'yellow' }

function HotspotMap({ hotspots }) {
  const pins = hotspots.filter(spot => spot.pin?.top && spot.pin?.left)
  const areaLabel = [...new Set(hotspots.map(spot => spot.district).filter(Boolean))].join(' · ')

  return (
    <div className="section-card" id="hotspot-map-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">🗺️</span>
          Bản đồ điểm nhu cầu
        </div>
        <span className="section-card-badge">{areaLabel || 'Khu vực hoạt động'}</span>
      </div>

      {/* Mini Map */}
      <div className="hotspot-map" role="img" aria-label={`Bản đồ điểm nhu cầu${areaLabel ? `: ${areaLabel}` : ''}`}>
        <div className="hotspot-map-grid" aria-hidden="true" />

        <div className="hotspot-map-canvas" aria-hidden="true">
          {/* Heat zones */}
          {hotspots.map(s => (
            <div
              key={`zone-${s.id}`}
              className={`hotspot-zone ${ZONE_COLORS[s.level]}`}
              style={{
                top: s.zone.top, left: s.zone.left,
                width: `${s.zone.width}px`, height: `${s.zone.height}px`,
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

        </div>
      </div>

      {/* Street list */}
      <div className="hotspot-list" role="list" aria-label="High demand areas">
        {hotspots.map(s => {
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
                  style={{ width: `${s.demand}%`, background: cfg.barColor }}
                  aria-hidden="true"
                />
                <span className={`hotspot-label ${s.level}`}>{cfg.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {hotspots.length === 0 && (
        <div className="hotspot-alert" role="status">
          Chưa có dữ liệu khu vực được cập nhật.
        </div>
      )}
    </div>
  )
}

export default HotspotMap
