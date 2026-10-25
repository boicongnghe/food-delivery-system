import { useState } from 'react'

// Create or rename a menu category. `category` is null when creating.
export default function CategoryFormDialog({ category, saving, error, onSubmit, onCancel }) {
  const [name, setName] = useState(category?.name || '')

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(name.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h3 className="text-base font-bold text-slate-900">{category ? 'Đổi tên danh mục' : 'Thêm danh mục mới'}</h3>

        <label htmlFor="category-name" className="mt-4 block text-xs font-semibold text-slate-700">
          Tên danh mục <span className="text-brand">*</span>
        </label>
        <input
          id="category-name"
          autoFocus
          required
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Phở Bò Bán Chạy"
          className="mt-1.5 w-full rounded-md bg-brand-light px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}
