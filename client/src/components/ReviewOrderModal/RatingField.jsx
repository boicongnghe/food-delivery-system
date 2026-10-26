import { RATING_LABELS } from '../../utils/feedbackLabels.js'
import StarRating from '../StarRating/StarRating.jsx'

// One required star rating of the review form: "🏪 Món ăn & nhà hàng *  ★★★★☆ Tốt"
export default function RatingField({ icon: Icon, title, value, error, onChange }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
        <Icon className="h-4 w-4 text-primary" />
        {title} <span className="text-primary">*</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <StarRating value={value} onChange={onChange} size="lg" label={title} />
        <span className="text-sm font-semibold text-amber-600">{RATING_LABELS[value]}</span>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
