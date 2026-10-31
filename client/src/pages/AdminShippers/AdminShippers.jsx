import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Bike, RefreshCw } from 'lucide-react'
import adminPartnerApi from '../../api/adminPartnerApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD } from '../../utils/adminClassNames.js'
import { PARTNER_STATUS_TABS, PARTNER_STATUSES } from '../../utils/partnerLabels.js'
import ShipperDetailDrawer from './components/ShipperDetailDrawer.jsx'
import ShipperTable from './components/ShipperTable.jsx'

const PAGE_SIZE = 10
const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: { all: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 },
}

// Shipper partners: approval queue, review of the registration, suspend / reopen.
// ?review=<id> opens a profile directly (links from the dashboard).
export default function AdminShippers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'pending', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState(() => searchParams.get('review'))

  useEffect(() => {
    let ignore = false

    adminPartnerApi
      .getShippers({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được danh sách tài xế')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [filters, keyword, refreshKey])

  const changeStatusTab = (status) => {
    setLoading(true)
    setFilters({ status, page: 1 })
  }

  const handleSearchChange = (text) => {
    setSearchText(text)
    setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
  }

  const refresh = () => {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  const closeDrawer = () => {
    setSelectedId(null)
    if (searchParams.has('review')) setSearchParams({}, { replace: true })
  }

  const statusTabs = PARTNER_STATUS_TABS.map((status) => ({
    value: status,
    label: status === 'all' ? 'Tất cả' : PARTNER_STATUSES[status].label,
    count: data.counts[status],
  }))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Bike}
        title="Quản lý shipper"
        description="Duyệt hồ sơ đăng ký, đình chỉ và mở lại hoạt động của tài xế giao hàng"
        actions={
          <button type="button" onClick={refresh} disabled={loading} className={ADMIN_BUTTON.secondary}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        }
      />

      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-crave-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <AdminFilterTabs options={statusTabs} value={filters.status} onChange={changeStatusTab} />
          <AdminSearchInput
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Tên, email, SĐT, CCCD, biển số xe"
          />
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>
            {filters.status === 'pending' && !keyword
              ? 'Không có hồ sơ tài xế nào đang chờ duyệt.'
              : 'Không tìm thấy tài xế phù hợp.'}
          </AdminEmptyState>
        ) : (
          <ShipperTable shippers={data.items} onSelect={setSelectedId} />
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="tài xế"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {selectedId && (
        <ShipperDetailDrawer
          key={selectedId}
          shipperId={selectedId}
          onClose={closeDrawer}
          onChanged={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </div>
  )
}
