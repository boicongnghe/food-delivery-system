function formatVND(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`
}

function TripLedger({ trips, periodLabel }) {
  const total = trips.reduce((sum, trip) => sum + Number(trip.baseFare || 0) + Number(trip.bonus || 0), 0)

  return (
    <div className="section-card" id="trip-ledger-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">🧾</span>
          Biên lai chuyến xe · {periodLabel.toLowerCase()}
        </div>
        <span className="section-card-badge">{trips.length} cuốc đã ghi nhận</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="ledger-table" aria-label="Trip receipts">
          <thead className="ledger-head">
            <tr>
              <th scope="col">Mã cuốc &amp; Giờ</th>
              <th scope="col">Quán ăn &amp; Địa chỉ</th>
              <th scope="col">Khoảng cách</th>
              <th scope="col" style={{ textAlign: 'right' }}>Chi tiết thu nhập</th>
              <th scope="col" style={{ textAlign: 'right' }}>Thực nhận</th>
              <th scope="col" style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {trips.map(trip => (
              <tr key={trip.id} className="ledger-row">
                <td>
                  <span className="trip-code">{trip.id}</span>
                  <div className="trip-time" style={{ marginTop: 2 }}>{trip.time}</div>
                </td>
                <td>
                  <div className="trip-restaurant-name">{trip.restaurant}</div>
                  <div className="trip-restaurant-dist">{trip.address}</div>
                </td>
                <td className="trip-time">{trip.distance}</td>
                <td>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.6 }}>
                    <div>Cước: {formatVND(trip.baseFare)}</div>
                    {trip.bonus > 0 && <div>Thưởng: {formatVND(trip.bonus)}</div>}
                  </div>
                </td>
                <td>
                  <div className="trip-earnings-cell">
                    <span className="trip-base-fare">{formatVND(Number(trip.baseFare || 0) + Number(trip.bonus || 0))}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="trip-status-badge">✓ {trip.status}</span>
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chưa có chuyến xe trong kỳ này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ledger-footer">
        <div>
          <div className="ledger-total-label">Tổng {trips.length} chuyến</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Tổng cước và thưởng, không gồm tiền tip</div>
        </div>
        <div className="ledger-total-value">{formatVND(total)}</div>
      </div>
    </div>
  )
}

export default TripLedger
