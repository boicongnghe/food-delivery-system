import { useState } from 'react'

const MAX_BAR_H = 120

function EarningsChart({ earningsByHour, forecast, periodLabel }) {
  const [hovered, setHovered] = useState(null)
  const maxTotal = Math.max(
    1,
    ...earningsByHour.map(item => item.base + item.bonus + item.tip),
  )

  return (
    <div className="section-card" id="earnings-chart-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">📊</span>
          Biểu đồ thu nhập theo khung giờ
        </div>
        <span className="section-card-badge">{periodLabel}</span>
      </div>

      <div className="chart-container">
        {/* Legend */}
        <div className="chart-legend">
          <div className="chart-legend-item">
            <div className="legend-dot" style={{ background: '#6b7280' }} />
            Cước gốc (Surge x1.4)
          </div>
          <div className="chart-legend-item">
            <div className="legend-dot" style={{ background: '#d93025' }} />
            Thưởng surge
          </div>
          <div className="chart-legend-item">
            <div className="legend-dot" style={{ background: '#d97706' }} />
            Tiền tip
          </div>
          <div className="chart-legend-item">
            <div className="legend-dot" style={{ background: '#bfdbfe', border: '1px dashed #1d4ed8' }} />
            Dự báo ca tối
          </div>
        </div>

        {/* Bars */}
        <div className="chart-bars-wrap" role="img" aria-label="Hourly earnings chart" style={{ position: 'relative' }}>
          <div className="chart-gridlines" aria-hidden="true">
            {[0,1,2,3].map(i => <div key={i} className="chart-gridline" />)}
          </div>

          {/* Actual data */}
          {earningsByHour.map((d, i) => {
            const total  = d.base + d.bonus + d.tip
            const baseH  = (d.base  / maxTotal) * MAX_BAR_H
            const bonusH = (d.bonus / maxTotal) * MAX_BAR_H
            const tipH   = (d.tip   / maxTotal) * MAX_BAR_H
            const totalH = baseH + bonusH + tipH

            return (
              <div
                key={i}
                className={`chart-bar-group ${d.surge ? 'surge' : ''}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${d.hour}: ${total.toLocaleString('vi-VN')}đ`}
              >
                {hovered === i && (
                  <div style={{
                    position: 'absolute',
                    bottom: `${totalH + 30}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '7px 10px',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {d.hour} — {total.toLocaleString('vi-VN')}đ
                    </div>
                    <div>Cước: {d.base.toLocaleString('vi-VN')}đ</div>
                    {d.bonus > 0 && <div style={{ color: 'var(--brand)' }}>Thưởng: +{d.bonus.toLocaleString('vi-VN')}đ</div>}
                    {d.tip > 0   && <div style={{ color: 'var(--amber)' }}>Tip: +{d.tip.toLocaleString('vi-VN')}đ</div>}
                    {d.surge && <div style={{ color: 'var(--brand)', fontWeight: 700, marginTop: 3 }}>🔥 Surge x1.4</div>}
                  </div>
                )}

                <div className="chart-bars-inner">
                  {tipH   > 0 && <div className="chart-bar tip"   style={{ height: `${tipH}px` }} />}
                  {bonusH > 0 && <div className="chart-bar bonus" style={{ height: `${bonusH}px` }} />}
                  {baseH  > 0 && <div className="chart-bar base"  style={{ height: `${baseH}px` }} />}
                </div>
                <span className="chart-x-label">{d.hour}</span>
              </div>
            )
          })}

          {/* Forecast bars */}
          {forecast.map((f, i) => (
            <div key={`f-${i}`} className="chart-bar-group" style={{ opacity: 0.5 }} aria-label={`${f.hour} dự báo`}>
              <div className="chart-bars-inner">
                <div style={{
                  width: '100%',
                  height: `${(f.demand / 100) * MAX_BAR_H}px`,
                  background: '#bfdbfe',
                  border: '1px dashed #1d4ed8',
                  borderRadius: '3px 3px 0 0',
                }} />
              </div>
              <span className="chart-x-label">{f.hour}</span>
            </div>
          ))}
          {earningsByHour.length === 0 && forecast.length === 0 && (
            <div className="chart-empty">Chưa có dữ liệu thu nhập theo giờ.</div>
          )}
        </div>

        {/* Footer stats */}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{earningsByHour.length} khung giờ có dữ liệu thu nhập</span>
        </div>

        {/* Forecast note */}
        {forecast.length > 0 && (
          <div className="chart-forecast" role="note">
            <span>🌆</span>
            <span><strong>Dự báo nhu cầu</strong> được đồng bộ từ dữ liệu dashboard.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default EarningsChart
