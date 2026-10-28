import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import reportApi from '../../../api/reportApi.js'
import Pagination from '../../../components/Pagination/Pagination.jsx'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { ORDER_PAGE_SIZE, ORDER_TABS, PAYMENT_METHOD_LABELS } from '../constants.js'
import OrderStatusBadge from './OrderStatusBadge.jsx'

const SEARCH_DELAY_MS = 400
const EMPTY_COUNTS = { all: 0, delivered: 0, in_progress: 0, cancelled: 0, rejected: 0 }

/**
 * "Lịch sử đơn hàng" tab. Filters live in the page (the CSV export uses the same ones).
 * @param {{ status: string, keyword: string }} filters
 */
export default function OrderHistoryTab({ range, filters, onFiltersChange }) {
  const [keywordInput, setKeywordInput] = useState(filters.keyword)
  const searchTimerRef = useRef(null)

  // Any new filter starts again from page 1
  const filterKey = `${range.from}_${range.to}_${filters.status}_${filters.keyword}`
  const [pageState, setPageState] = useState({ filterKey, page: 1 })
  const page = pageState.filterKey === filterKey ? pageState.page : 1
  const changePage = (nextPage) => setPageState({ filterKey, page: nextPage })

  // Previous page stays on screen (dimmed) until the requested one arrives
  const requestKey = `${filterKey}_${page}`
  const [loaded, setLoaded] = useState({ key: null, data: null })
  const result = loaded.data
  const loading = loaded.key !== requestKey

  useEffect(() => {
    let ignore = false
    reportApi
      .getOrders({ ...range, ...filters, page, limit: ORDER_PAGE_SIZE })
      .then((response) => {
        if (!ignore) setLoaded({ key: requestKey, data: response.data })
      })
      .catch((error) => {
        if (ignore) return
        toast.error(error.response?.data?.message || 'Không tải được lịch sử đơn hàng')
        setLoaded((prev) => ({ ...prev, key: requestKey }))
      })
    return () => {
      ignore = true
    }
  }, [range, filters, page, requestKey])

  useEffect(() => () => clearTimeout(searchTimerRef.current), [])

  // Search runs once typing pauses for SEARCH_DELAY_MS
  const changeKeyword = (value) => {
    setKeywordInput(value)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => onFiltersChange({ keyword: value.trim() }), SEARCH_DELAY_MS)
  }

  const counts = result?.counts || EMPTY_COUNTS

  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Lọc theo trạng thái">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filters.status === tab.value}
              onClick={() => onFiltersChange({ status: tab.value })}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                filters.status === tab.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-brand-light'
              }`}
            >
              {tab.label} <span className="tabular-nums opacity-70">({counts[tab.value]})</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Tìm theo mã đơn hoặc tên khách</span>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={keywordInput}
            onChange={(event) => changeKeyword(event.target.value)}
            placeholder="Mã đơn hoặc tên khách"
            maxLength={100}
            className="h-9 w-full rounded-md border border-brand-soft pl-8 pr-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>
      </div>

      <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-brand-light/50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Mã đơn</th>
              <th className="px-4 py-2.5">Thời gian đặt</th>
              <th className="px-4 py-2.5">Khách hàng</th>
              <th className="px-4 py-2.5">Món</th>
              <th className="px-4 py-2.5">Thanh toán</th>
              <th className="px-4 py-2.5 text-right">Doanh thu gộp</th>
              <th className="px-4 py-2.5 text-right">Phí nền tảng</th>
              <th className="px-4 py-2.5 text-right">Thực nhận</th>
              <th className="px-4 py-2.5">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result?.items.map((order) => (
              <tr key={order._id} className="hover:bg-brand-light/40">
                <td className="px-4 py-2.5">
                  <Link to={`/restaurant/orders?order=${order._id}`} className="font-bold text-brand hover:underline">
                    #{order.orderCode}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-800">{order.customerName || 'Khách hàng'}</p>
                  <p className="text-xs tabular-nums text-slate-500">{order.customerPhone}</p>
                </td>
                <td className="max-w-56 px-4 py-2.5 text-slate-600">
                  <p className="truncate" title={order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}>
                    {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{PAYMENT_METHOD_LABELS[order.payment.method] || '–'}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-800">
                  {formatCurrency(order.grossRevenue)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-600">
                  {order.status === 'delivered' ? `−${formatCurrency(order.platformFee)}` : '–'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                  {order.status === 'delivered' ? formatCurrency(order.netRevenue) : '–'}
                </td>
                <td className="px-4 py-2.5">
                  <OrderStatusBadge order={order} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result && result.items.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-slate-500">Không có đơn hàng nào khớp bộ lọc.</p>
        )}
        {!result && loading && <p className="px-4 py-12 text-center text-sm text-slate-500">Đang tải…</p>}
      </div>

      {/* Many pages do not fit a phone: the page buttons scroll instead of the whole page */}
      {result && (
        <div className="overflow-x-auto">
          <Pagination pagination={result.pagination} onPageChange={changePage} unit="đơn" />
        </div>
      )}
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Phí nền tảng từng đơn là ước tính; số quyết toán làm tròn theo ngày ở tab Chi tiết hoa hồng. Chỉ đơn hoàn thành được
        tính tiền.
      </p>
    </section>
  )
}
