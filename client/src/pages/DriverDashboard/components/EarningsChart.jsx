import { useState } from 'react'

const MAX_BAR_H = 120

function EarningsChart({ earningsByHour, forecast, periodLabel }) {
  const [hovered, setHovered] = useState(null)
  const maxTotal = Math.max(
    1,
    ...earningsByHour.map(item => item.base + item.bonus + item.tip),
  )
  const activeEarning = Number.isInteger(hovered) ? earningsByHour[hovered] : null
  const activeTotal = activeEarning
    ? activeEarning.base + activeEarning.bonus + activeEarning.tip
    : 0

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
            Cước cơ bản
          </div>
          <div className="chart-legend-item">
            <div className="legend-dot" style={{ background: '#d93025' }} />
            Thưởng
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

        {activeEarning ? (
          <div className="chart-detail-panel" aria-live="polite">
            <div className="chart-detail-heading">
              <strong>{activeEarning.hour}</strong>
              <strong>{activeTotal.toLocaleString('vi-VN')}đ</strong>
            </div>
            <div className="chart-detail-values">
              <span>Cước {activeEarning.base.toLocaleString('vi-VN')}đ</span>
              {activeEarning.bonus > 0 && (
                <span className="bonus">Thưởng +{activeEarning.bonus.toLocaleString('vi-VN')}đ</span>
              )}
              {activeEarning.tip > 0 && (
                <span className="tip">Tip +{activeEarning.tip.toLocaleString('vi-VN')}đ</span>
              )}
            </div>
          </div>
        ) : (
          <p className="chart-interaction-hint">Chọn một cột để xem chi tiết thu nhập.</p>
        )}

        {/* Bars */}
        <div className="chart-bars-wrap" role="group" aria-label="Hourly earnings chart" style={{ position: 'relative' }}>
          <div className="chart-gridlines" aria-hidden="true">
            {[0,1,2,3].map(i => <div key={i} className="chart-gridline" />)}
          </div>

          {/* Actual data */}
          {earningsByHour.map((d, i) => {
            const total  = d.base + d.bonus + d.tip
            const baseH  = (d.base  / maxTotal) * MAX_BAR_H
            const bonusH = (d.bonus / maxTotal) * MAX_BAR_H
            const tipH   = (d.tip   / maxTotal) * MAX_BAR_H

            return (
              <div
                key={i}
                className="chart-bar-group"
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onClick={() => setHovered(i)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setHovered(i)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={hovered === i}
                aria-label={`${d.hour}: ${total.toLocaleString('vi-VN')}đ`}
              >
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
