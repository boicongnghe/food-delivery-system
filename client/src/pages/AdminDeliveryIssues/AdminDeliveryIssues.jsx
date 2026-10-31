import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, Siren } from 'lucide-react'
import deliveryIssueApi from '../../api/deliveryIssueApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT } from '../../utils/adminClassNames.js'
import { DELIVERY_ISSUE_STATUSES, DELIVERY_ISSUE_TYPE_LABELS } from '../../utils/deliveryIssueLabels.js'
import DeliveryIssueDetailDrawer from './components/DeliveryIssueDetailDrawer.jsx'
import DeliveryIssueTable from './components/DeliveryIssueTable.jsx'

const PAGE_SIZE = 10
const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: {},
}

// UC45 - Handle delivery issue reports
export default function AdminDeliveryIssues() {
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'open', type: 'all', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let ignore = false

    deliveryIssueApi
      .getDeliveryIssues({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được báo cáo sự cố')
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

  const tabs = [
    ...Object.entries(DELIVERY_ISSUE_STATUSES).map(([value, status]) => ({
      value,
      label: status.label,
      count: data.counts[value],
    })),
    { value: 'all', label: 'Tất cả', count: data.counts.all },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Siren}
        title="Sự cố giao hàng"
        description="Tiếp nhận báo cáo sự cố từ shipper, xử lý hoặc xử phạt bên vi phạm"
        actions={
          <button type="button" onClick={refresh} disabled={loading} className={ADMIN_BUTTON.secondary}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        }
      />

      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-crave-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <AdminFilterTabs options={tabs} value={filters.status} onChange={(status) => changeFilters({ status })} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filters.type}
              onChange={(event) => changeFilters({ type: event.target.value })}
              aria-label="Lọc theo loại sự cố"
              className={`${ADMIN_INPUT} sm:w-52`}
            >
              <option value="all">Mọi loại sự cố</option>
              {Object.entries(DELIVERY_ISSUE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <AdminSearchInput value={searchText} onChange={handleSearchChange} placeholder="Mã sự cố hoặc mã đơn" />
          </div>
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>
            {filters.status === 'open' ? '🎉 Không có sự cố nào chờ xử lý!' : 'Không có báo cáo phù hợp.'}
          </AdminEmptyState>
        ) : (
          <DeliveryIssueTable issues={data.items} onSelect={setSelectedId} />
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="báo cáo"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {selectedId && (
        <DeliveryIssueDetailDrawer
          key={selectedId}
          issueId={selectedId}
          onClose={() => setSelectedId(null)}
          onResolved={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </div>
  )
}
