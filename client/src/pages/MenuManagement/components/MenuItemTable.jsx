import { CirclePlus, UtensilsCrossed } from 'lucide-react'
import MenuItemRow from './MenuItemRow.jsx'

const COLUMNS = ['Ảnh', 'Tên món ăn & mã', 'Danh mục', 'Giá bán', 'Tình trạng', 'Hiển thị', 'Thao tác']

export default function MenuItemTable({
  items,
  loading,
  isFiltered,
  hasCategories,
  busyItemIds,
  onAddItem,
  onAddCategory,
  ...rowHandlers
}) {
  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <UtensilsCrossed className="h-10 w-10 text-slate-300" />
        {isFiltered ? (
          <p className="text-sm text-slate-500">Không tìm thấy món phù hợp với bộ lọc hiện tại.</p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {hasCategories ? 'Chưa có món nào trong thực đơn.' : 'Hãy tạo danh mục trước khi thêm món ăn.'}
            </p>
            <button
              type="button"
              onClick={hasCategories ? onAddItem : onAddCategory}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover"
            >
              <CirclePlus className="h-4 w-4" />
              {hasCategories ? 'Thêm món đầu tiên' : 'Tạo danh mục đầu tiên'}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead className="bg-brand-light/70 text-xs font-bold uppercase tracking-wide text-slate-700">
          <tr>
            {COLUMNS.map((column, index) => (
              <th
                key={column}
                className={`py-3 pr-3 ${index === 0 ? 'pl-5' : ''} ${index === COLUMNS.length - 1 ? 'pr-5 text-right' : ''}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="border-t border-brand-soft/50">
                  <td colSpan={COLUMNS.length} className="px-5 py-3">
                    <div className="h-10 animate-pulse rounded bg-brand-light" />
                  </td>
                </tr>
              ))
            : items.map((item) => (
                <MenuItemRow key={item._id} item={item} isBusy={busyItemIds.has(item._id)} {...rowHandlers} />
              ))}
        </tbody>
      </table>
    </div>
  )
}
