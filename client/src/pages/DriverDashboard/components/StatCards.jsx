function formatVND(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`
}

function StatCards({ summary, onWithdraw }) {
  const tripProgress = summary.tripGoal
    ? Math.min(100, Math.round((summary.completedTrips / summary.tripGoal) * 100))
    : 0

  return (
    <div className="stat-cards-grid" role="list" aria-label="Driver performance summary">
      <div className="stat-card earnings" role="listitem" id="stat-card-earnings">
        <div className="stat-card-header">
          <span className="stat-card-label">Tổng thu nhập kỳ này</span>
          <div className="stat-card-icon" aria-hidden="true">💰</div>
        </div>
        <div className="stat-card-value">{formatVND(summary.totalEarnings)}</div>
        <div className="stat-card-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-row-label">Cước gốc</span>
            <span className="breakdown-row-value">{formatVND(summary.baseFare)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Tiền thưởng</span>
            <span className="breakdown-row-value bonus">+{formatVND(summary.bonus)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Tiền tip</span>
            <span className="breakdown-row-value tip">+{formatVND(summary.tips)}</span>
          </div>
        </div>
      </div>

      <div className="stat-card trips" role="listitem" id="stat-card-trips">
        <div className="stat-card-header">
          <span className="stat-card-label">Chuyến xe hoàn tất</span>
          <div className="stat-card-icon" aria-hidden="true">🛵</div>
        </div>
        <div className="stat-card-value">
          {summary.completedTrips}
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)' }}>
            {' '}/ {summary.tripGoal} cuốc
          </span>
        </div>
        <div className="trip-progress">
          <div className="trip-progress-bar-wrap">
            <div
              className="trip-progress-bar"
              style={{ width: `${tripProgress}%` }}
              role="progressbar"
              aria-valuenow={tripProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
          <div className="trip-progress-stats">
            <span>Tiến độ: {tripProgress}%</span>
            <span>Còn {Math.max(0, summary.tripGoal - summary.completedTrips)} chuyến</span>
          </div>
        </div>
        <div className="stat-card-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-row-label">Đánh giá trung bình</span>
            <span className="breakdown-row-value bonus">{Number(summary.rating || 0).toFixed(2)} ★</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Số lượt đánh giá</span>
            <span className="breakdown-row-value">{summary.ratingCount}</span>
          </div>
        </div>
      </div>

      <div className="stat-card wallet" role="listitem" id="stat-card-wallet">
        <div className="stat-card-header">
          <span className="stat-card-label">Số dư ví khả dụng</span>
          <div className="stat-card-icon" aria-hidden="true">🏦</div>
        </div>
        <div className="stat-card-value">{formatVND(summary.walletBalance)}</div>
        <div className="wallet-cta">
          <button className="wallet-cta-btn" id="btn-withdraw-wallet" type="button" onClick={onWithdraw}>
            <span aria-hidden="true">⚡</span>
            Rút tiền về ngân hàng
          </button>
        </div>
        <div className="stat-card-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-row-label">Đang chờ xử lý</span>
            <span className="breakdown-row-value">{formatVND(summary.pendingBalance)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Tổng thu nhập tuần</span>
            <span className="breakdown-row-value bonus">{formatVND(summary.weeklyEarnings)}</span>
          </div>
        </div>
      </div>

      <div className="stat-card rating" role="listitem" id="stat-card-rating">
        <div className="stat-card-header">
          <span className="stat-card-label">Hạng đối tác &amp; Đánh giá</span>
          <div className="stat-card-icon" aria-hidden="true">⭐</div>
        </div>
        <div className="stat-card-value">{Number(summary.rating || 0).toFixed(2)} ★</div>
        <div className="rating-tier">
          <div className="rating-tier-badge">💎 {summary.tier || 'Chưa xếp hạng'}</div>
          <div className="stat-card-breakdown">
            <div className="breakdown-row">
              <span className="breakdown-row-label">Tổng đánh giá</span>
              <span className="breakdown-row-value">{summary.ratingCount}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-row-label">5 sao liên tiếp</span>
              <span className="breakdown-row-value bonus">{summary.consecutiveFiveStarTrips} cuốc</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatCards
