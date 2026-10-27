function formatVND(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`
}

function DailyMissions({ missions }) {
  const completedCount = missions.filter(mission => mission.status === 'completed').length
  const rewardsEarned = missions
    .filter(mission => mission.status === 'completed')
    .reduce((total, mission) => total + mission.reward, 0)

  return (
    <div className="section-card" id="daily-missions-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">🎯</span>
          Nhiệm vụ thưởng trong ngày
        </div>
        <span className="section-card-badge">{completedCount}/{missions.length} hoàn thành</span>
      </div>

      <div className="section-card-body">
        <div className="missions-list" role="list" aria-label="Daily bonus missions">
          {missions.map(mission => {
            const pct = mission.target
              ? Math.min(100, Math.round((mission.current / mission.target) * 100))
              : 0
            const completed = mission.status === 'completed'
            const progressColor = completed ? 'done' : 'going'

            return (
              <div
                key={mission.id}
                id={mission.id}
                className={`mission-item ${mission.status}`}
                role="listitem"
                aria-label={`${mission.title}: ${mission.current}/${mission.target}`}
              >
                {completed && (
                  <div className="mission-stamp" aria-label="Completed">
                    ĐÃ NHẬN<br />{formatVND(mission.reward)}
                  </div>
                )}

                <div className="mission-header">
                  <div>
                    <div className={`mission-status-label ${completed ? 'done' : ''}`}>
                      {completed ? '✅ Hoàn thành' : '⚡ Đang tiến hành'}
                    </div>
                    <div className="mission-title">{mission.title}</div>
                  </div>
                  <div className="mission-reward">+{formatVND(mission.reward)}</div>
                </div>

                <div className="mission-progress-bar-wrap" aria-hidden="true">
                  <div
                    className={`mission-progress-bar ${progressColor}`}
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
          {missions.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Chưa có nhiệm vụ thưởng được cập nhật.
            </p>
          )}
        </div>

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
              Tổng thưởng đã nhận
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {missions.length - completedCount} nhiệm vụ đang chờ
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
            {formatVND(rewardsEarned)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyMissions
