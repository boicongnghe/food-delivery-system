import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MessageSquareText, RefreshCw } from 'lucide-react'
import reviewApi from '../../api/reviewApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD, ADMIN_INPUT } from '../../utils/adminClassNames.js'
import AdminReviewCard from './components/AdminReviewCard.jsx'
import ReviewDetailDrawer from './components/ReviewDetailDrawer.jsx'

const PAGE_SIZE = 10
const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: { all: 0, visible: 0, hidden: 0 },
}

// UC43 - Moderate reviews
export default function AdminReviews() {
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ visibility: 'all', rating: '', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let ignore = false

    reviewApi
      .getReviews({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(error.response?.data?.message || 'Không tải được danh sách đánh giá')
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
    { value: 'all', label: 'Tất cả', count: data.counts.all },
    { value: 'visible', label: 'Đang hiển thị', count: data.counts.visible },
    { value: 'hidden', label: 'Đã ẩn', count: data.counts.hidden },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={MessageSquareText}
        title="Kiểm duyệt đánh giá"
        description="Ẩn các đánh giá vi phạm (spam, xúc phạm, lộ thông tin cá nhân...) để bảo vệ cộng đồng"
        actions={
          <button type="button" onClick={refresh} disabled={loading} className={ADMIN_BUTTON.secondary}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        }
      />

      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
          <AdminFilterTabs
            options={tabs}
            value={filters.visibility}
            onChange={(visibility) => changeFilters({ visibility })}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filters.rating}
              onChange={(event) => changeFilters({ rating: event.target.value })}
              aria-label="Lọc theo số sao"
              className={`${ADMIN_INPUT} sm:w-40`}
            >
              <option value="">Mọi số sao</option>
              {[5, 4, 3, 2, 1].map((stars) => (
                <option key={stars} value={stars}>
                  {stars} sao
                </option>
              ))}
            </select>
            <AdminSearchInput value={searchText} onChange={handleSearchChange} placeholder="Mã đơn hoặc nội dung" />
          </div>
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>Không có đánh giá phù hợp.</AdminEmptyState>
        ) : (
          <div className="space-y-3 p-5">
            {data.items.map((review) => (
              <AdminReviewCard key={review._id} review={review} onSelect={setSelectedId} />
            ))}
          </div>
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="đánh giá"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {selectedId && (
        <ReviewDetailDrawer
          key={selectedId}
          reviewId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </div>
  )
}
