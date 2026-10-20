const REVIEWS = [
  {
    id: 'review-1',
    quote: 'Bác tài giao đồ ăn vẫn còn nóng giòn, đúng giờ, thái độ rất nhiệt tình. Sẽ đặt lại ngay!',
    customer: 'Khách hàng Minh T. · Phở Thìn Lò Đúc',
    stars: 5,
  },
  {
    id: 'review-2',
    quote: 'Giao nhanh hơn tôi nghĩ, bún chả còn nguyên nhiệt, cảm ơn bác nhiều lắm ạ!',
    customer: 'Khách hàng Lan Anh · Bún Chả Hương Liên',
    stars: 5,
  },
  {
    id: 'review-3',
    quote: 'Bác lịch sự, giao đúng địa chỉ, bao giờ cũng nhắn tin trước. Tuyệt vời!',
    customer: 'Khách hàng Hoàng N. · Bánh Mì Dân Tổ',
    stars: 5,
  },
]

const BADGES = [
  { id: 'badge-hot-food', icon: '🌡️', label: 'Món ăn nóng sốt', count: 47 },
  { id: 'badge-friendly', icon: '😊', label: 'Thân thiện lễ phép', count: 38 },
  { id: 'badge-on-time', icon: '⏰', label: 'Đúng giờ như hẹn', count: 52 },
  { id: 'badge-safe', icon: '🛡️', label: 'An toàn tuyến đường', count: 29 },
]

function CustomerPraise() {
  return (
    <div className="section-card" id="customer-praise-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">💬</span>
          Lời khen từ thực khách
        </div>
        <span className="section-card-badge">⭐ 4.96 / 5.0</span>
      </div>

      <div className="section-card-body">
        {/* Reviews */}
        <div className="praise-list" role="list" aria-label="Customer reviews">
          {REVIEWS.map(review => (
            <blockquote key={review.id} id={review.id} className="praise-item" role="listitem">
              <p className="praise-quote">"{review.quote}"</p>
              <div className="praise-meta">
                <span className="praise-customer">{review.customer}</span>
                <span className="praise-stars" aria-label={`${review.stars} stars`}>
                  {'★'.repeat(review.stars)}
                </span>
              </div>
            </blockquote>
          ))}
        </div>

        {/* Badges */}
        <div
          className="badges-grid"
          role="list"
          aria-label="Service achievement badges"
        >
          {BADGES.map(badge => (
            <div key={badge.id} id={badge.id} className="badge-item" role="listitem" title={badge.label}>
              <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
              <span>{badge.label}</span>
              <span className="badge-count" aria-label={`${badge.count} times`}>{badge.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CustomerPraise
