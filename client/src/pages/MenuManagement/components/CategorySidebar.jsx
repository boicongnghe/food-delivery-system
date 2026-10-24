import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'

export default function CategorySidebar({
  categories,
  totalItems,
  activeCategory,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}) {
  const itemClass = (isActive) =>
    `group flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[15px] transition-colors ${
      isActive ? 'bg-brand-soft/70 font-semibold text-brand' : 'text-slate-700 hover:bg-brand-light'
    }`

  const countClass = (isActive) =>
    `shrink-0 rounded px-1.5 text-xs font-semibold ${isActive ? 'bg-brand text-white' : 'bg-brand-light text-slate-600'}`

  return (
    <aside className="rounded-xl border border-brand-soft/60 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-brand-soft/60 bg-brand-light/60 px-4 py-3">
        <BookOpen className="w-4 h-4 text-brand" />
        <h2 className="text-sm font-bold uppercase text-slate-800">Danh mục bếp</h2>
      </div>

      <nav className="space-y-0.5 p-2">
        <button type="button" onClick={() => onSelect('all')} className={itemClass(activeCategory === 'all')}>
          <span>Tất cả món ăn</span>
          <span className={countClass(activeCategory === 'all')}>{totalItems}</span>
        </button>

        {categories.map((category) => {
          const isActive = activeCategory === category._id
          return (
            <div key={category._id} className={itemClass(isActive)}>
              <button type="button" onClick={() => onSelect(category._id)} className="min-w-0 flex-1 truncate text-left">
                {category.name}
              </button>
              {/* Edit/delete appear on hover (always visible on touch screens) */}
              <span className="flex items-center gap-1 sm:hidden sm:group-hover:flex">
                <button type="button" onClick={() => onEdit(category)} title="Đổi tên" className="text-slate-400 hover:text-brand">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => onDelete(category)} title="Xóa danh mục" className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
              <span className={countClass(isActive)}>{category.itemCount}</span>
            </div>
          )
        })}

        {categories.length === 0 && (
          <p className="px-3 py-4 text-sm text-slate-500">Chưa có danh mục nào. Hãy tạo danh mục đầu tiên.</p>
        )}
      </nav>

      <div className="border-t border-brand-soft/60 p-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold text-brand hover:bg-brand-light"
        >
          <Plus className="w-4 h-4" />
          Thêm danh mục
        </button>
      </div>
    </aside>
  )
}
