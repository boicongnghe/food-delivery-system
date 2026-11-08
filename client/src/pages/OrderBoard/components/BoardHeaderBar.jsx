import { Bell, BellOff, RefreshCw } from 'lucide-react'
import { formatClock } from '../../../utils/formatTime.js'
import OrderLookup from './OrderLookup.jsx'

// Sub header under the shared Header: kitchen status, pause / resume new orders, order lookup, today's stats,
// bell toggle, manual refresh
export default function BoardHeaderBar({
  isOpen,
  isAcceptingOrders,
  togglingAccepting,
  onToggleAccepting,
  stats,
  lastSyncedAt,
  soundEnabled,
  onToggleSound,
  refreshing,
  onRefresh,
  onLookup,
}) {
  return (
    <div className="border-b border-brand-soft/60 bg-brand-light/60">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <span
          className={`inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-bold uppercase ${
            isOpen ? 'border-emerald-200 text-emerald-800' : 'border-slate-200 text-slate-600'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-600' : 'bg-slate-400'}`} />
          Trạng thái bếp: {isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
        </span>
        {/* Pause / resume new orders (no cook on duty, too many orders). Orders on the board are not affected. */}
        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-brand-soft bg-white px-3 py-1.5 text-xs font-bold uppercase text-slate-700"
          title="Tắt khi bếp không có người làm hoặc quá đông đơn. Đơn đang có vẫn xử lý bình thường."
        >
          Nhận đơn mới
          <button
            type="button"
            role="switch"
            aria-checked={isAcceptingOrders}
            onClick={onToggleAccepting}
            disabled={togglingAccepting}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
              isAcceptingOrders ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isAcceptingOrders ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={isAcceptingOrders ? 'text-emerald-700' : 'text-red-600'}>
            {isAcceptingOrders ? 'Bật' : 'Tạm ngưng'}
          </span>
        </label>
        <OrderLookup onLookup={onLookup} />
        <p className="hidden text-sm text-slate-600 2xl:block">Bảng theo dõi và tiếp nhận đơn hàng nhà bếp trực tiếp</p>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border border-brand-soft bg-white px-3 py-1.5 text-slate-600">
            Hôm nay: <strong className="text-brand">{stats.todayOrders}</strong> đơn
          </span>
          <span className="rounded-md border border-brand-soft bg-white px-3 py-1.5 text-slate-600">
            Đang xử lý: <strong className="text-brand">{stats.processing}</strong> đơn
          </span>
          <span className="rounded-md border border-brand-soft bg-white px-3 py-1.5 text-slate-600">
            Hoàn thành: <strong className="text-emerald-700">{stats.completedToday}</strong> đơn
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            title="Phát âm thanh khi có đơn mới"
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-semibold ${
              soundEnabled
                ? 'border-emerald-200 bg-white text-emerald-800'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Chuông: {soundEnabled ? 'Bật' : 'Tắt'}
          </button>
          {lastSyncedAt && (
            <span className="text-xs text-slate-500">Cập nhật {formatClock(lastSyncedAt, true)}</span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Tải lại"
            className="rounded-md border border-brand-soft bg-white p-2 text-slate-600 hover:text-brand disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
