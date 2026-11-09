import { CircleCheck, Target, Zap } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

function formatVND(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`
}

function DailyMissions({ missions }) {
  const completedCount = missions.filter(mission => mission.status === 'completed').length
  const rewardsEarned = missions
    .filter(mission => mission.status === 'completed')
    .reduce((total, mission) => total + mission.reward, 0)

  return (
    <SectionCard
      id="daily-missions-section"
      title="Nhiệm vụ thưởng trong ngày"
      icon={Target}
      badge={`${completedCount}/${missions.length} hoàn thành`}
    >
      <div className="space-y-3" role="list" aria-label="Daily bonus missions">
        {missions.map(mission => {
          const pct = mission.target
            ? Math.min(100, Math.round((mission.current / mission.target) * 100))
            : 0
          const completed = mission.status === 'completed'

          return (
            <div
              key={mission.id}
              id={mission.id}
              className={`relative rounded-lg border p-3 ${completed ? 'border-emerald-200 bg-emerald-50/60' : 'border-brand-soft/70 bg-white'}`}
              role="listitem"
              aria-label={`${mission.title}: ${mission.current}/${mission.target}`}
            >
              {completed && (
                <div
                  className="absolute right-3 top-2 -rotate-6 rounded border-2 border-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-extrabold uppercase leading-tight text-emerald-700"
                  aria-label="Completed"
                >
                  Đã nhận<br />{formatVND(mission.reward)}
                </div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`flex items-center gap-1 text-[11px] font-bold uppercase ${completed ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {completed ? <CircleCheck className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    {completed ? 'Hoàn thành' : 'Đang tiến hành'}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900">{mission.title}</div>
                </div>
                {!completed && <div className="text-sm font-bold text-emerald-700">+{formatVND(mission.reward)}</div>}
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${completed ? 'bg-emerald-600' : 'bg-brand'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{mission.current}/{mission.target} cuốc</span>
                <span>{pct}%</span>
              </div>
            </div>
          )
        })}
        {missions.length === 0 && (
          <p className="text-xs text-slate-500">Chưa có nhiệm vụ thưởng được cập nhật.</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Tổng thưởng đã nhận</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{missions.length - completedCount} nhiệm vụ đang chờ</div>
        </div>
        <div className="text-xl font-extrabold tabular-nums text-emerald-700">{formatVND(rewardsEarned)}</div>
      </div>
    </SectionCard>
  )
}

export default DailyMissions
