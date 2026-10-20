function StatCards() {
  return (
    <div className="stat-cards-grid" role="list" aria-label="Driver performance summary">

      {/* 1. Total Earnings */}
      <div className="stat-card earnings" role="listitem" id="stat-card-earnings">
        <div className="stat-card-header">
          <span className="stat-card-label">Tổng thu nhập hôm nay</span>
          <div className="stat-card-icon">💰</div>
        </div>
        <div className="stat-card-value">845.000đ</div>
        <div className="stat-card-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-row-label">Cước gốc (18 chuyến)</span>
            <span className="breakdown-row-value">620.000đ</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Thưởng nóng giờ trưa</span>
            <span className="breakdown-row-value bonus">+145.000đ</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Tiền tip từ thực khách</span>
            <span className="breakdown-row-value tip">+80.000đ</span>
          </div>
          <div className="breakdown-row" style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
            <span className="breakdown-row-label" style={{ fontWeight: 700 }}>Đã đổi soát</span>
            <span className="breakdown-row-value" style={{ color: 'var(--green)', fontWeight: 700 }}>Đà đổi soát ✓</span>
          </div>
        </div>
      </div>

      {/* 2. Completed Trips */}
      <div className="stat-card trips" role="listitem" id="stat-card-trips">
        <div className="stat-card-header">
          <span className="stat-card-label">Chuyến xe hoàn tất</span>
          <div className="stat-card-icon">🛵</div>
        </div>
        <div className="stat-card-value">
          18 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)' }}>/22 cuốc</span>
        </div>
        <div className="trip-progress">
          <div className="trip-progress-bar-wrap">
            <div className="trip-progress-bar" style={{ width: '82%' }} />
          </div>
          <div className="trip-progress-stats">
            <span>Tiến độ: 82%</span>
            <span>Còn 4 chuyến</span>
          </div>
        </div>
        <div className="stat-card-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-row-label">Tỉ lệ nhận cuốc</span>
            <span className="breakdown-row-value bonus">98.5%</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Hoàn thành</span>
            <span className="breakdown-row-value bonus">100%</span>
          </div>
        </div>
      </div>

      {/* 3. Wallet */}
      <div className="stat-card wallet" role="listitem" id="stat-card-wallet">
        <div className="stat-card-header">
          <span className="stat-card-label">Số dư ví khả dụng</span>
          <div className="stat-card-icon">🏦</div>
        </div>
        <div className="stat-card-value">3.420.000đ</div>
        <div className="wallet-cta">
          <button className="wallet-cta-btn" id="btn-withdraw-wallet">
            <span>⚡</span>
            Rút nhanh về Techcombank · Miễn phí
          </button>
        </div>
        <div className="stat-card-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-row-label">Đang chờ xử lý</span>
            <span className="breakdown-row-value">125.000đ</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label">Tổng tuần này</span>
            <span className="breakdown-row-value bonus">5.240.000đ</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-row-label" style={{ color: 'var(--green)', fontWeight: 700 }}>Không phí giao dịch</span>
            <span style={{ fontSize: 11, color: 'var(--green)' }}>Miễn phí</span>
          </div>
        </div>
      </div>

      {/* 4. Rating */}
      <div className="stat-card rating" role="listitem" id="stat-card-rating">
        <div className="stat-card-header">
          <span className="stat-card-label">Hạng đối tác &amp; Đánh giá</span>
          <div className="stat-card-icon">⭐</div>
        </div>
        <div className="stat-card-value">4.96 ★</div>
        <div className="rating-tier">
          <div className="rating-tier-badge">💎 Kim Cương Bếp Phố</div>
          <p className="rating-tier-perk">
            Đặc quyền: <span>+5% cước</span> cho đơn đồ ăn nóng sốt
          </p>
          <div className="stat-card-breakdown">
            <div className="breakdown-row">
              <span className="breakdown-row-label">Tổng đánh giá</span>
              <span className="breakdown-row-value">1.248 lượt</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-row-label">5 sao liên tiếp</span>
              <span className="breakdown-row-value bonus">47 cuốc</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Đánh giá trong vòng 30 ngày: <strong style={{ color: 'var(--text-secondary)' }}>4.96/5.0 — GIỮ 5 SAO NGÀY</strong>
          </div>
        </div>
      </div>

    </div>
  )
}

export default StatCards
