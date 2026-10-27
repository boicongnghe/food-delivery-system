function CustomerPraise({ reviews, badges, rating }) {
  return (
    <div className="section-card" id="customer-praise-section">
      <div className="section-card-header">
        <div className="section-card-title">
          <span className="section-card-title-icon">💬</span>
          Lời khen từ thực khách
        </div>
        <span className="section-card-badge">
          ⭐ {Number(rating || 0).toFixed(2)} / 5.0
        </span>
      </div>

      <div className="section-card-body">
        <div className="praise-list" role="list" aria-label="Customer reviews">
          {reviews.map(review => (
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
          {reviews.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Chưa có đánh giá được cập nhật.
            </p>
          )}
        </div>

        <div className="badges-grid" role="list" aria-label="Service achievement badges">
          {badges.map(badge => (
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
