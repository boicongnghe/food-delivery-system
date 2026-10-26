import { useState } from 'react'
import { Star } from 'lucide-react'

const SIZES = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-8 w-8' }
const STARS = [1, 2, 3, 4, 5]

/**
 * 1-5 stars. Read-only unless onChange is given.
 * @param {number} value
 * @param {(value: number) => void} [onChange]
 * @param {string} emptyClassName - color of empty stars (darker on the admin theme)
 */
export default function StarRating({ value = 0, onChange, size = 'md', label, emptyClassName = 'text-slate-300' }) {
  const [hovered, setHovered] = useState(0)
  const shown = hovered || Math.round(value)
  const starClass = (star) =>
    `${SIZES[size]} ${star <= shown ? 'fill-amber-400 text-amber-400' : `fill-transparent ${emptyClassName}`}`

  if (!onChange) {
    return (
      <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} trên 5 sao`}>
        {STARS.map((star) => (
          <Star key={star} className={starClass(star)} />
        ))}
      </span>
    )
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} sao`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Star className={starClass(star)} />
        </button>
      ))}
    </div>
  )
}
