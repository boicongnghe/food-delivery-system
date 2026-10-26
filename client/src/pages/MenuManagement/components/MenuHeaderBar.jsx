import { CirclePlus, ListPlus } from 'lucide-react'
import StatPill from './StatPill.jsx'

export default function MenuHeaderBar({ summary, onAddCategory, onAddItem }) {
  return (
    <div className="border-b border-brand-soft/60 bg-brand-light/60">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Quản lý / <span className="font-bold text-slate-800">Thực đơn bếp</span>
          </p>
          <h1 className="font-serif text-2xl font-semibold text-slate-900">Quản Lý Thực Đơn Bếp</h1>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StatPill label="Tổng" value={summary.all} className="text-slate-900" />
          <StatPill label="Bán" value={summary.selling} className="text-emerald-700" />
          <StatPill label="Hết" value={summary.soldOut} className="text-amber-700" />
          <StatPill label="Ẩn" value={summary.hidden} className="text-slate-500" />

          <button
            type="button"
            onClick={onAddCategory}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-soft bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-brand-light"
          >
            <ListPlus className="w-4 h-4" />
            Danh Mục
          </button>
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover"
          >
            <CirclePlus className="w-4 h-4" />
            Món Ăn
          </button>
        </div>
      </div>
    </div>
  )
}
