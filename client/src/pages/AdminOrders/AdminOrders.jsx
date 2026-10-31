import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Receipt, RefreshCw } from 'lucide-react'
import adminOrderApi from '../../api/adminOrderApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT } from '../../utils/adminClassNames.js'
import { ORDER_TABS, PAYMENT_METHOD_LABELS } from '../../utils/orderLabels.js'
import OrderDetailDrawer from './components/OrderDetailDrawer.jsx'
import OrderTable from './components/OrderTable.jsx'

const PAGE_SIZE = 15
const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: Object.fromEntries(ORDER_TABS.map((tab) => [tab.value, 0])),
}

// Platform orders, read only: the admin follows every order but does not act on it
export default function AdminOrders() {
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', paymentMethod: 'all', from: '', to: '', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let ignore = false
    // Empty dates are left out: the server validates YYYY-MM-DD
    const params = { ...filters, keyword, limit: PAGE_SIZE, from: filters.from || undefined, to: filters.to || undefined }

    adminOrderApi
      .getOrders(params)
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (ignore) return
        const details = error.response?.data?.errors?.map((item) => item.message).join('; ')
        toast.error(details || error.response?.data?.message || 'Không tải được danh sách đơn hàng')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [filters, keyword, refreshKey])

  const changeFilters = (changes) => {
    setLoading(true)
    setFilters((prev) => ({ ...prev, page: 1, ...changes }))
  }

  const handleSearchChange = (text) => {
    setSearchText(text)
    setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
  }

  const refresh = () => {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  const statusTabs = ORDER_TABS.map((tab) => ({ ...tab, count: data.counts[tab.value] }))
  const hasFilters = keyword || filters.paymentMethod !== 'all' || filters.from || filters.to

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Receipt}
        title="Đơn hàng toàn sàn"
        description="Theo dõi mọi đơn hàng trên nền tảng (chỉ xem). Đơn chuyển khoản khách bỏ dở không được tính."
        actions={
          <button type="button" onClick={refresh} disabled={loading} className={ADMIN_BUTTON.secondary}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        }
      />

      <div className={ADMIN_CARD}>
        <div className="space-y-3 border-b border-slate-100 dark:border-crave-border p-5">
          <AdminFilterTabs options={statusTabs} value={filters.status} onChange={(status) => changeFilters({ status })} />
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <AdminSearchInput
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Mã đơn, khách hàng, SĐT, nhà hàng, shipper"
            />
            <select
              value={filters.paymentMethod}
              onChange={(event) => changeFilters({ paymentMethod: event.target.value })}
              aria-label="Lọc theo phương thức thanh toán"
              className={`${ADMIN_INPUT} lg:w-48`}
            >
              <option value="all">Mọi phương thức</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => changeFilters({ from: event.target.value })}
                aria-label="Đặt từ ngày"
                className={`${ADMIN_INPUT} dark:[color-scheme:dark] lg:w-40`}
              />
              <span className="text-xs text-slate-500">đến</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => changeFilters({ to: event.target.value })}
                aria-label="Đặt đến ngày"
                className={`${ADMIN_INPUT} dark:[color-scheme:dark] lg:w-40`}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('')
                  changeFilters({ paymentMethod: 'all', from: '', to: '' })
                }}
                className="whitespace-nowrap text-xs font-bold text-primary hover:underline"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>Không có đơn hàng phù hợp.</AdminEmptyState>
        ) : (
          <OrderTable orders={data.items} onSelect={setSelectedId} />
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="đơn hàng"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {selectedId && <OrderDetailDrawer key={selectedId} orderId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
