import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw } from 'lucide-react'
import complaintApi from '../../api/complaintApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT } from '../../utils/adminClassNames.js'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_LABELS } from '../../utils/feedbackLabels.js'
import { PAGE_SIZE } from './constants.js'
import ComplaintDetailDrawer from './components/ComplaintDetailDrawer.jsx'
import ComplaintTable from './components/ComplaintTable.jsx'

const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: {},
}

/**
 * UC42 - Handle complaints. A tab of the "Khiếu nại & sự cố" page (AdminSupportCases).
 * @param {string | null} initialCaseId - complaint opened on mount (?id= of the page)
 * @param {(counts: object) => void} onCountsChange - status counts after every load, for the tab badge (keep it stable)
 */
export default function ComplaintsPanel({ initialCaseId = null, onCountsChange }) {
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'open', category: 'all', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState(initialCaseId)

  useEffect(() => {
    let ignore = false

    complaintApi
      .getComplaints({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (ignore) return
        setData(response.data)
        onCountsChange?.(response.data.counts)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được danh sách khiếu nại')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [filters, keyword, refreshKey, onCountsChange])

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
    ...Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => ({ value, label, count: data.counts[value] })),
    { value: 'all', label: 'Tất cả', count: data.counts.all },
  ]

  return (
    <>
      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-crave-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <AdminFilterTabs options={tabs} value={filters.status} onChange={(status) => changeFilters({ status })} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filters.category}
              onChange={(event) => changeFilters({ category: event.target.value })}
              aria-label="Lọc theo loại khiếu nại"
              className={`${ADMIN_INPUT} sm:w-48`}
            >
              <option value="all">Mọi loại vấn đề</option>
              {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <AdminSearchInput value={searchText} onChange={handleSearchChange} placeholder="Mã khiếu nại hoặc mã đơn" />
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              title="Làm mới"
              aria-label="Làm mới"
              className={`${ADMIN_BUTTON.secondary} shrink-0 justify-center`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>
            {filters.status === 'open' ? '🎉 Không còn khiếu nại nào chờ xử lý!' : 'Không có khiếu nại phù hợp.'}
          </AdminEmptyState>
        ) : (
          <ComplaintTable complaints={data.items} onSelect={setSelectedId} />
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="khiếu nại"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {selectedId && (
        <ComplaintDetailDrawer
          key={selectedId}
          complaintId={selectedId}
          onClose={() => setSelectedId(null)}
          onResolved={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </>
  )
}
