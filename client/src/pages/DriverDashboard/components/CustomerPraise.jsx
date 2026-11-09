import { MessageSquareHeart } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

function CustomerPraise({ reviews, badges, rating }) {
  return (
    <SectionCard
      id="customer-praise-section"
      title="Lời khen từ thực khách"
      icon={MessageSquareHeart}
      badge={`★ ${Number(rating || 0).toFixed(2)} / 5.0`}
    >
      <div className="space-y-2" role="list" aria-label="Customer reviews">
        {reviews.map(review => (
          <blockquote key={review.id} id={review.id} className="rounded-lg bg-brand-light/50 px-3 py-2.5" role="listitem">
            <p className="text-sm italic text-slate-700">"{review.quote}"</p>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">{review.customer}</span>
              <span className="text-amber-500" aria-label={`${review.stars} stars`}>
                {'★'.repeat(review.stars)}
              </span>
            </div>
          </blockquote>
        ))}
        {reviews.length === 0 && <p className="text-xs text-slate-500">Chưa có đánh giá được cập nhật.</p>}
      </div>

      {badges.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2" role="list" aria-label="Service achievement badges">
          {badges.map(badge => (
            <div
              key={badge.id}
              id={badge.id}
              className="flex items-center gap-2 rounded-lg border border-brand-soft/70 px-2.5 py-2 text-xs font-semibold text-slate-700"
              role="listitem"
              title={badge.label}
            >
              <span aria-hidden="true">{badge.icon}</span>
              <span className="min-w-0 flex-1 truncate">{badge.label}</span>
              <span className="rounded bg-brand px-1.5 text-[10px] font-bold text-white" aria-label={`${badge.count} times`}>
                {badge.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export default CustomerPraise
