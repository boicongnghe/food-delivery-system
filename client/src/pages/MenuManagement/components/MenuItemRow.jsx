import { Ban, Pencil, Trash2 } from 'lucide-react'
import ToggleSwitch from '../../../components/ToggleSwitch/ToggleSwitch.jsx'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { MENU_TAGS } from '../constants.js'

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

const badgeClass = 'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase'

export default function MenuItemRow({ item, isBusy, onToggleAvailable, onToggleVisible, onEdit, onDelete }) {
  const isSoldOut = !item.isAvailable
  const isHidden = !item.isVisible
  const isSelling = !isSoldOut && !isHidden
  const tags = MENU_TAGS.filter((tag) => item.tags.includes(tag.value))

  return (
    <tr className={`border-t border-brand-soft/50 ${isSelling ? '' : 'bg-slate-50/60'}`}>
      <td className="py-2.5 pl-5 pr-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-brand-light">
          <img src={item.image} alt="" className={`h-full w-full object-cover ${isSoldOut ? 'grayscale' : ''}`} />
          {isSoldOut && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Ban className="h-5 w-5 text-white" />
            </span>
          )}
        </div>
      </td>

      <td className="py-2.5 pr-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`font-semibold text-slate-900 ${isSoldOut ? 'line-through text-slate-500' : ''}`}>
            {item.name}
          </span>
          {tags.map((tag) => (
            <span key={tag.value} className={`${badgeClass} ${tag.className}`}>
              {tag.badge}
            </span>
          ))}
          {isSoldOut && item.soldOutAt && (
            <span className={`${badgeClass} border-red-200 bg-red-50 text-red-700`}>Hết {formatTime(item.soldOutAt)}</span>
          )}
          {isHidden && <span className={`${badgeClass} border-slate-200 bg-slate-100 text-slate-500`}>Đang ẩn</span>}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500 max-w-[360px]">
          {item.sku && <span className="font-mono text-xs">{item.sku} • </span>}
          {item.description}
        </p>
      </td>

      <td className="py-2.5 pr-3">
        <span className="rounded bg-brand-light px-2 py-1 text-xs text-slate-700">{item.category?.name}</span>
      </td>

      <td className="py-2.5 pr-3 whitespace-nowrap">
        <span className={isSelling ? 'font-bold text-brand' : 'text-slate-600'}>{formatCurrency(item.price)}</span>
        {item.originalPrice && (
          <span className="block text-xs text-slate-400 line-through">{formatCurrency(item.originalPrice)}</span>
        )}
      </td>

      <td className="py-2.5 pr-3">
        <ToggleSwitch
          checked={item.isAvailable}
          disabled={isBusy}
          onChange={(checked) => onToggleAvailable(item, checked)}
          onLabel="Còn món"
          offLabel="Hết món"
          ariaLabel="Tình trạng còn món"
        />
      </td>

      <td className="py-2.5 pr-3">
        <ToggleSwitch
          checked={item.isVisible}
          disabled={isBusy}
          onChange={(checked) => onToggleVisible(item, checked)}
          onLabel="Hiện"
          offLabel="Đang ẩn"
          ariaLabel="Hiển thị với khách"
        />
      </td>

      <td className="py-2.5 pr-5">
        <div className="flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="Sửa món"
            className="rounded p-1.5 text-slate-600 hover:bg-brand-light hover:text-brand"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            title="Xóa món"
            className="rounded p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
