import { formatCurrency } from '../../../utils/formatCurrency.js'

// "2x Phở Bò Tái Lăn   130.000đ" + options / note under each dish
export default function OrderItemList({ items, struck = false }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className={struck ? 'text-slate-400 line-through' : ''}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-slate-900">
              <span className={`mr-1.5 font-extrabold ${struck ? '' : 'text-brand'}`}>{item.quantity}x</span>
              {item.name}
            </p>
            <span className="shrink-0 font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</span>
          </div>
          {(item.options.length > 0 || item.note) && (
            <p className="mt-0.5 pl-7 text-xs text-slate-500">
              {item.options.map((option) => option.name).join(', ')}
              {item.options.length > 0 && item.note && ' • '}
              {item.note && <span className="italic">{item.note}</span>}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
