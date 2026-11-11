import { Bike, Coins, Landmark, Star, Zap } from 'lucide-react'

function formatVND(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`
}

const cardClass = 'flex flex-col gap-3 rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm'

function CardHeader({ label, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
    </div>
  )
}

function BreakdownRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}

function StatCards({ summary, onWithdraw }) {
  const completedTrips = Number(summary.completedTrips || 0)
  const tripGoal = Number(summary.tripGoal || 0)
  const hasTripGoal = tripGoal > 0
  const tripProgress = hasTripGoal
    ? Math.min(100, Math.round((completedTrips / tripGoal) * 100))
    : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" role="list" aria-label="Driver performance summary">
      <div className={cardClass} role="listitem" id="stat-card-earnings">
        <CardHeader label="Tổng thu nhập kỳ này" icon={Coins} />
        <div className="text-2xl font-bold tabular-nums text-slate-900">{formatVND(summary.baseFare)}</div>
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <BreakdownRow label="Phí giao đơn" value={formatVND(summary.baseFare)} />
          <BreakdownRow label="Thưởng" value={formatVND(summary.bonus)} highlight />
        </div>
      </div>

      <div className={cardClass} role="listitem" id="stat-card-trips">
        <CardHeader label="Chuyến xe hoàn tất" icon={Bike} />
        <div className="text-2xl font-bold tabular-nums text-slate-900">
          {completedTrips}
          {hasTripGoal && (
            <span className="text-base font-medium text-slate-500"> / {tripGoal} cuốc</span>
          )}
        </div>
        {hasTripGoal && (
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-brand-light">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${tripProgress}%` }}
                role="progressbar"
                aria-valuenow={tripProgress}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Tiến độ: {tripProgress}%</span>
              <span>Còn {Math.max(0, tripGoal - completedTrips)} chuyến</span>
            </div>
          </div>
        )}
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <BreakdownRow label="Đánh giá trung bình" value={`${Number(summary.rating || 0).toFixed(2)} ★`} highlight />
          <BreakdownRow label="Số lượt đánh giá" value={summary.ratingCount} />
        </div>
      </div>

      <div className={cardClass} role="listitem" id="stat-card-wallet">
        <CardHeader label="Số dư ví khả dụng" icon={Landmark} />
        <div className="text-2xl font-bold tabular-nums text-slate-900">{formatVND(summary.walletBalance)}</div>
        <button
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-hover"
          id="btn-withdraw-wallet"
          type="button"
          onClick={onWithdraw}
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
          Rút tiền về ngân hàng
        </button>
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <BreakdownRow label="Hạn mức rút còn hôm nay" value={formatVND(summary.withdrawalLimits?.dailyRemaining)} />
          <BreakdownRow label="Tổng thu nhập tuần" value={formatVND(summary.weeklyEarnings)} highlight />
        </div>
      </div>

      <div className={cardClass} role="listitem" id="stat-card-rating">
        <CardHeader label="Hạng đối tác & Đánh giá" icon={Star} />
        <div className="text-2xl font-bold tabular-nums text-slate-900">{Number(summary.rating || 0).toFixed(2)} ★</div>
        <span className="self-start rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
          {summary.tier || 'Chưa xếp hạng'}
        </span>
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <BreakdownRow label="Tổng đánh giá" value={summary.ratingCount} />
          <BreakdownRow label="5 sao liên tiếp" value={`${summary.consecutiveFiveStarTrips} cuốc`} highlight />
        </div>
      </div>
    </div>
  )
}

export default StatCards
