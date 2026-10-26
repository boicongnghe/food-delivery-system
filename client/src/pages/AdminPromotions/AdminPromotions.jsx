import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, TicketPercent } from 'lucide-react'
import promotionRuleApi from '../../api/promotionRuleApi.js'
import AdminEmptyState from '../../components/AdminEmptyState/AdminEmptyState.jsx'
import AdminFilterTabs from '../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import AdminPagination from '../../components/AdminPagination/AdminPagination.jsx'
import AdminSearchInput from '../../components/AdminSearchInput/AdminSearchInput.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import useDebounce from '../../hooks/useDebounce.js'
import { ADMIN_BUTTON, ADMIN_CARD } from '../../utils/adminClassNames.js'
import { PAGE_SIZE, PROMOTION_STATUSES } from './constants.js'
import PromotionFormModal from './components/PromotionFormModal.jsx'
import PromotionTable from './components/PromotionTable.jsx'

const EMPTY_LIST = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  counts: {},
}

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// UC41 - Manage promotion rules
export default function AdminPromotions() {
  const [data, setData] = useState(EMPTY_LIST)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  const [refreshKey, setRefreshKey] = useState(0)
  const [formPromotion, setFormPromotion] = useState(null) // { promotion } - null when creating
  const [deletingPromotion, setDeletingPromotion] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let ignore = false

    promotionRuleApi
      .getPromotions({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setData(response.data)
      })
      .catch((error) => {
        if (!ignore) toast.error(getErrorMessage(error, 'Không tải được danh sách mã khuyến mãi'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [filters, keyword, refreshKey])

  const refresh = () => setRefreshKey((key) => key + 1)

  const handleSearchChange = (text) => {
    setSearchText(text)
    setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await promotionRuleApi.deletePromotion(deletingPromotion._id)
      toast.success(response.message)
      // Deleting the last code of a page -> go back one page
      if (data.items.length === 1 && filters.page > 1) {
        setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
      }
      refresh()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xóa được mã khuyến mãi'))
    } finally {
      setDeleting(false)
      setDeletingPromotion(null)
    }
  }

  const tabs = [
    { value: 'all', label: 'Tất cả', count: data.counts.all },
    ...Object.entries(PROMOTION_STATUSES).map(([value, status]) => ({
      value,
      label: status.label,
      count: data.counts[value],
    })),
  ]

  return (
    // gap instead of space-y: the ConfirmDialog below is a fixed overlay and must not get a margin
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <AdminPageHeader
        icon={TicketPercent}
        title="Mã khuyến mãi"
        description="Tạo, chỉnh sửa và ngừng các chương trình giảm giá áp dụng khi khách thanh toán"
        actions={
          <button type="button" onClick={() => setFormPromotion({ promotion: null })} className={ADMIN_BUTTON.primary}>
            <Plus className="h-3.5 w-3.5" /> Tạo mã mới
          </button>
        }
      />

      <div className={ADMIN_CARD}>
        <div className="flex flex-col gap-3 border-b border-slate-800 p-5 xl:flex-row xl:items-center xl:justify-between">
          <AdminFilterTabs
            options={tabs}
            value={filters.status}
            onChange={(status) => {
              setLoading(true)
              setFilters({ status, page: 1 })
            }}
          />
          <AdminSearchInput value={searchText} onChange={handleSearchChange} placeholder="Tìm theo mã hoặc tên" />
        </div>

        {loading && data.items.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : data.items.length === 0 ? (
          <AdminEmptyState>Không có mã khuyến mãi phù hợp.</AdminEmptyState>
        ) : (
          <PromotionTable
            promotions={data.items}
            onEdit={(promotion) => setFormPromotion({ promotion })}
            onDelete={setDeletingPromotion}
          />
        )}

        <AdminPagination
          pagination={data.pagination}
          unit="mã"
          onPageChange={(page) => {
            setLoading(true)
            setFilters((prev) => ({ ...prev, page }))
          }}
        />
      </div>

      {formPromotion && (
        <PromotionFormModal
          promotion={formPromotion.promotion}
          onClose={() => setFormPromotion(null)}
          onSaved={() => {
            setFormPromotion(null)
            refresh()
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingPromotion)}
        title="Xóa mã khuyến mãi?"
        message={`Mã ${deletingPromotion?.code} chưa được sử dụng và sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa mã"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingPromotion(null)}
      />
    </div>
  )
}
