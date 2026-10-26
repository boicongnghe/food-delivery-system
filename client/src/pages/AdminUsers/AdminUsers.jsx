import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, Users } from 'lucide-react'
import adminUserApi from '../../api/adminUserApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT } from '../../utils/adminClassNames.js'
import { PAGE_SIZE, ROLES } from './constants.js'
import UserDetailDrawer from './components/UserDetailDrawer.jsx'
import UserTable from './components/UserTable.jsx'

const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: { all: 0, active: 0, locked: 0 },
}

// UC37 - Manage accounts
export default function AdminUsers() {
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', role: 'all', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState(null)

  useEffect(() => {
    let ignore = false

    adminUserApi
      .getUsers({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được danh sách tài khoản')
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

  const statusTabs = [
    { value: 'all', label: 'Tất cả', count: data.counts.all },
    { value: 'active', label: 'Hoạt động', count: data.counts.active },
    { value: 'locked', label: 'Đã khóa', count: data.counts.locked },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Users}
        title="Quản lý tài khoản"
        description="Xem chi tiết, phân quyền và khóa / mở khóa tài khoản người dùng"
        actions={
          <button type="button" onClick={refresh} disabled={loading} className={ADMIN_BUTTON.secondary}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        }
      />

      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
          <AdminFilterTabs options={statusTabs} value={filters.status} onChange={(status) => changeFilters({ status })} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filters.role}
              onChange={(event) => changeFilters({ role: event.target.value })}
              aria-label="Lọc theo vai trò"
              className={`${ADMIN_INPUT} sm:w-44`}
            >
              <option value="all">Mọi vai trò</option>
              {Object.entries(ROLES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
            <AdminSearchInput
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Tìm theo tên, email, số điện thoại"
            />
          </div>
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>Không tìm thấy tài khoản phù hợp.</AdminEmptyState>
        ) : (
          <UserTable users={data.items} onSelect={setSelectedUserId} />
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="tài khoản"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {selectedUserId && (
        <UserDetailDrawer
          key={selectedUserId}
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onChanged={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </div>
  )
}
