import { useState } from 'react'

const HOURLY_DATA = [
  { hour: '6h',  base: 25, bonus: 0,  tip: 5,  surge: false },
  { hour: '7h',  base: 45, bonus: 5,  tip: 10, surge: false },
  { hour: '8h',  base: 60, bonus: 10, tip: 8,  surge: false },
  { hour: '9h',  base: 30, bonus: 0,  tip: 5,  surge: false },
  { hour: '10h', base: 35, bonus: 0,  tip: 8,  surge: false },
  { hour: '11h', base: 80, bonus: 35, tip: 20, surge: true  },
  { hour: '12h', base: 95, bonus: 45, tip: 28, surge: true  },
  { hour: '13h', base: 75, bonus: 30, tip: 15, surge: true  },
  { hour: '14h', base: 40, bonus: 5,  tip: 8,  surge: false },
  { hour: '15h', base: 28, bonus: 0,  tip: 5,  surge: false },
]

const FORECAST = [
  { hour: '18h', demand: 85 },
  { hour: '19h', demand: 92 },
  { hour: '20h', demand: 78 },
]

const MAX_TOTAL = Math.max(...HOURLY_DATA.map(d => d.base + d.bonus + d.tip)) + 10
const MAX_BAR_H = 120

function EarningsChart() {
  const [hovered, setHovered] = useState(null)

  return (
    <div className="section-card" id="earnings-chart-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">📊</span>
          Biểu đồ thu nhập theo khung giờ
        </div>
        <span className="section-card-badge">Hôm nay, 20/10</span>
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
          {HOURLY_DATA.map((d, i) => {
            const total  = d.base + d.bonus + d.tip
            const baseH  = (d.base  / MAX_TOTAL) * MAX_BAR_H
            const bonusH = (d.bonus / MAX_TOTAL) * MAX_BAR_H
            const tipH   = (d.tip   / MAX_TOTAL) * MAX_BAR_H
            const totalH = baseH + bonusH + tipH

            return (
              <div
                key={i}
                className={`chart-bar-group ${d.surge ? 'surge' : ''}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                aria-label={`${d.hour}: ${(total * 1000).toLocaleString('vi-VN')}đ`}
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
                      {d.hour} — {(total * 1000).toLocaleString('vi-VN')}đ
                    </div>
                    <div>Cước: {(d.base * 1000).toLocaleString('vi-VN')}đ</div>
                    {d.bonus > 0 && <div style={{ color: 'var(--brand)' }}>Thưởng: +{(d.bonus * 1000).toLocaleString('vi-VN')}đ</div>}
                    {d.tip > 0   && <div style={{ color: 'var(--amber)' }}>Tip: +{(d.tip * 1000).toLocaleString('vi-VN')}đ</div>}
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
          {FORECAST.map((f, i) => (
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
        </div>

        {/* Footer stats */}
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Độ dài chuyến trung bình: <strong style={{ color: 'var(--text-primary)' }}>2.4 km/đơn</strong></span>
          <span>Thời gian trả đơn chuẩn: <strong style={{ color: 'var(--text-primary)' }}>4.5 phút/bếp</strong></span>
        </div>

        {/* Forecast note */}
        <div className="chart-forecast" role="note">
          <span>🌆</span>
          <span>
            <strong>Dự báo ca tối (18h–21h):</strong> Nhu cầu tăng cao khu vực Hoàn Kiếm &amp; Hai Bà Trưng —{' '}
            <strong>Surge x1.6</strong> dự kiến. Di chuyển sớm để đón cuốc đầu tiên!
          </span>
        </div>
      </div>
    </div>
  )
}

export default EarningsChart
