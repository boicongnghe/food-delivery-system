const TRIPS = [
  {
    id: 'GN-330201',
    time: '10:52',
    restaurant: 'Cơm Bình Dân Bà Nội',
    address: 'Khu nhà trọ Đông Lỗ, Thạch Thất',
    distance: '1.4 km',
    baseFare: 18000,
    bonus: 5000,
    tip: 10000,
    status: 'Đã giao',
    surge: false,
  },
  {
    id: 'GN-330202',
    time: '11:08',
    restaurant: 'Phở Gà Chú Sơn',
    address: 'Km29 Đại lộ Thăng Long, Thạch Thất',
    distance: '2.1 km',
    baseFare: 24000,
    bonus: 9000,
    tip: 15000,
    status: 'Đã giao',
    surge: true,
  },
  {
    id: 'GN-330203',
    time: '11:35',
    restaurant: 'Bánh Mì Hải – Cổng FPT',
    address: 'Cổng chính ĐH FPT Hòa Lạc, Thạch Thất',
    distance: '0.8 km',
    baseFare: 15000,
    bonus: 6000,
    tip: 10000,
    status: 'Đã giao',
    surge: true,
  },
  {
    id: 'GN-330204',
    time: '11:58',
    restaurant: 'Bún Bò Cô Hà',
    address: 'Thị trấn Liên Quan, Thạch Thất',
    distance: '3.2 km',
    baseFare: 35000,
    bonus: 14000,
    tip: 20000,
    status: 'Đã giao',
    surge: true,
  },
  {
    id: 'GN-330205',
    time: '12:20',
    restaurant: 'Cơm Tấm Cô Linh',
    address: 'Khu nhà trọ Bắc Lỗ, Thạch Thất',
    distance: '1.7 km',
    baseFare: 22000,
    bonus: 8000,
    tip: 0,
    status: 'Đã giao',
    surge: true,
  },
  {
    id: 'GN-330206',
    time: '12:47',
    restaurant: 'Bún Đậu Sinh Viên',
    address: 'Ngõ 3 Đường Vành đai FPT, Hòa Lạc',
    distance: '1.2 km',
    baseFare: 18000,
    bonus: 0,
    tip: 15000,
    status: 'Đã giao',
    surge: false,
  },
  {
    id: 'GN-330207',
    time: '13:15',
    restaurant: 'Trà Sữa TocoToco FPT',
    address: 'Tòa nhà Alpha, Khu CNC Hòa Lạc',
    distance: '2.4 km',
    baseFare: 28000,
    bonus: 5000,
    tip: 10000,
    status: 'Đã giao',
    surge: false,
  },
]

function formatVND(amount) {
  return amount.toLocaleString('vi-VN') + 'đ'
}

function TripLedger() {
  const total = TRIPS.reduce((s, t) => s + t.baseFare + t.bonus + t.tip, 0)

  return (
    <div className="section-card" id="trip-ledger-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">🧾</span>
          Biên lai chuyến xe hôm nay
        </div>
        <span className="section-card-badge">{TRIPS.length} cuốc đã ghi nhận</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="ledger-table" aria-label="Today's trip receipts">
          <thead className="ledger-head">
            <tr>
              <th scope="col">Mã cuốc &amp; Giờ</th>
              <th scope="col">Quán ăn &amp; Địa chỉ</th>
              <th scope="col">Khoảng cách</th>
              <th scope="col" style={{ textAlign: 'right' }}>Chi tiết cước</th>
              <th scope="col" style={{ textAlign: 'right' }}>Thực nhận</th>
              <th scope="col" style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {TRIPS.map(trip => (
              <tr key={trip.id} className="ledger-row">
                <td>
                  <span className="trip-code">{trip.id}</span>
                  <div className="trip-time" style={{ marginTop: 2 }}>{trip.time}</div>
                  {trip.surge && <span className="surge-tag">🔥 SURGE x1.4</span>}
                </td>
                <td>
                  <div className="trip-restaurant-name">{trip.restaurant}</div>
                  <div className="trip-restaurant-dist">{trip.address}</div>
                </td>
                <td className="trip-time">{trip.distance}</td>
                <td>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.6 }}>
                    <div>Cước: {formatVND(trip.baseFare)}</div>
                    {trip.bonus > 0 && <div style={{ color: 'var(--brand)' }}>Thưởng: +{formatVND(trip.bonus)}</div>}
                    {trip.tip   > 0 && <div style={{ color: 'var(--amber)' }}>Tip: +{formatVND(trip.tip)}</div>}
                  </div>
                </td>
                <td>
                  <div className="trip-earnings-cell">
                    <span className="trip-base-fare">{formatVND(trip.baseFare + trip.bonus + trip.tip)}</span>
                    <div className="trip-extras">
                      {trip.bonus > 0 && <span className="trip-extra-tag bonus">+{formatVND(trip.bonus)} thưởng</span>}
                      {trip.tip   > 0 && <span className="trip-extra-tag tip">+{formatVND(trip.tip)} tip</span>}
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="trip-status-badge">✓ {trip.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ledger-footer">
        <div>
          <div className="ledger-total-label">Tổng {TRIPS.length} chuyến – Khu vực Thạch Thất &amp; Hòa Lạc</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Cước gốc + Thưởng surge + Tiền tip</div>
        </div>
        <div className="ledger-total-value">{formatVND(total)}</div>
      </div>
    </div>
  )
}

export default TripLedger
