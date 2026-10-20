const MISSIONS = [
  {
    id: 'mission-morning-shift',
    title: 'Hoàn thành 20 cuốc ca sáng',
    reward: '+120.000đ',
    current: 20,
    target: 20,
    status: 'completed',
    stampLine1: 'ĐÃ NHẬN',
    stampLine2: '120.000đ',
    progressColor: 'done',
  },
  {
    id: 'mission-evening-shift',
    title: 'Hoàn thành 15 cuốc ca tối (18h–22h)',
    reward: '+180.000đ',
    current: 0,
    target: 15,
    status: 'active',
    stampLine1: null,
    stampLine2: null,
    progressColor: 'going',
  },
  {
    id: 'mission-five-stars',
    title: 'Duy trì 5 sao toàn bộ cuốc trong ngày',
    reward: '+80.000đ',
    current: 18,
    target: 22,
    status: 'active',
    stampLine1: null,
    stampLine2: null,
    progressColor: 'cool',
  },
  {
    id: 'mission-hot-food',
    title: 'Giao 10 đơn đồ ăn nóng sốt dưới 20 phút',
    reward: '+60.000đ',
    current: 10,
    target: 10,
    status: 'completed',
    stampLine1: 'ĐÃ NHẬN',
    stampLine2: '60.000đ',
    progressColor: 'done',
  },
]

function DailyMissions() {
  return (
    <div className="section-card" id="daily-missions-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">🎯</span>
          Nhiệm vụ thưởng trong ngày
        </div>
        <span className="section-card-badge">2/4 hoàn thành</span>
      </div>

      <div className="section-card-body">
        <div className="missions-list" role="list" aria-label="Daily bonus missions">
          {MISSIONS.map(mission => {
            const pct = Math.round((mission.current / mission.target) * 100)
            return (
              <div
                key={mission.id}
                id={mission.id}
                className={`mission-item ${mission.status}`}
                role="listitem"
                aria-label={`${mission.title}: ${mission.current}/${mission.target}`}
              >
                {/* Red stamp overlay for completed */}
                {mission.stampLine1 && (
                  <div className="mission-stamp" aria-label="Completed">
                    {mission.stampLine1}<br/>{mission.stampLine2}
                  </div>
                )}

                <div className="mission-header">
                  <div>
                    <div className={`mission-status-label ${mission.status === 'completed' ? 'done' : ''}`}>
                      {mission.status === 'completed' ? '✅ Hoàn thành' : '⚡ Đang tiến hành'}
                    </div>
                    <div className="mission-title">{mission.title}</div>
                  </div>
                  <div className="mission-reward">{mission.reward}</div>
                </div>

                <div className="mission-progress-bar-wrap" aria-hidden="true">
                  <div
                    className={`mission-progress-bar ${mission.progressColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mission-progress-text">
                  <span>{mission.current}/{mission.target} cuốc</span>
                  <span>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          background: 'var(--green-bg)',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tổng thưởng hôm nay
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Còn 2 nhiệm vụ ca tối đang chờ
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
            460.000đ
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyMissions
