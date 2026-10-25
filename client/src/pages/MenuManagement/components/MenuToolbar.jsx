import { Search } from 'lucide-react'
import { STATUS_TABS } from '../constants.js'

export default function MenuToolbar({ searchText, onSearchChange, status, statusCounts, onStatusChange }) {
  return (
    <div className="border-b border-brand-soft/60 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full md:w-[480px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên món, mã SKU (PB-01)..."
            className="w-full rounded-md bg-brand-light py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={`rounded px-3 py-1 text-sm font-semibold transition-colors ${
                status === tab.value ? 'bg-brand-soft text-brand' : 'text-slate-700 hover:bg-brand-light'
              }`}
            >
              {tab.label} ({statusCounts[tab.countKey]})
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
