import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import toast from 'react-hot-toast'
import { UtensilsCrossed } from 'lucide-react'
import menuApi from '../../api/menuApi.js'
import useDebounce from '../../hooks/useDebounce.js'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import Pagination from '../../components/Pagination/Pagination.jsx'
import { PAGE_SIZE } from './constants.js'
import MenuHeaderBar from './components/MenuHeaderBar.jsx'
import MenuToolbar from './components/MenuToolbar.jsx'
import CategorySidebar from './components/CategorySidebar.jsx'
import CategoryFormDialog from './components/CategoryFormDialog.jsx'
import MenuItemTable from './components/MenuItemTable.jsx'
import MenuItemFormModal from './components/MenuItemFormModal.jsx'
import NoRestaurantNotice from '../../components/NoRestaurantNotice/NoRestaurantNotice.jsx'

const EMPTY_COUNTS = { all: 0, selling: 0, soldOut: 0, hidden: 0 }
const EMPTY_MENU = {
  items: [],
  pagination: { page: 1, limit: PAGE_SIZE, totalItems: 0, totalPages: 0 },
  summary: EMPTY_COUNTS,
  statusCounts: EMPTY_COUNTS,
}

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// UC20 - Menu management for restaurant owners
export default function MenuManagement() {
  const { restaurant } = useOutletContext()

  const [categoryData, setCategoryData] = useState({ items: [], totalItems: 0 })
  const [menuData, setMenuData] = useState(EMPTY_MENU)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: 'all', status: 'all', page: 1 })
  const [searchText, setSearchText] = useState('')
  const keyword = useDebounce(searchText.trim(), 400)
  // Increase to reload categories + items after any change
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyItemIds, setBusyItemIds] = useState(() => new Set()) // items with a toggle request running

  const [itemForm, setItemForm] = useState(null) // { item } - item is null when creating
  const [categoryForm, setCategoryForm] = useState(null) // { category, saving, error }
  const [confirm, setConfirm] = useState(null) // { title, message, confirmLabel, action }
  const [confirmLoading, setConfirmLoading] = useState(false)

  const categories = categoryData.items
  const refresh = () => setRefreshKey((key) => key + 1)

  // ----- Data loading -----
  useEffect(() => {
    if (!restaurant) return
    let ignore = false

    menuApi
      .getCategories()
      .then((response) => {
        if (!ignore) setCategoryData(response.data)
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Không tải được danh mục')))

    return () => {
      ignore = true
    }
  }, [restaurant, refreshKey])

  useEffect(() => {
    if (!restaurant) return
    let ignore = false

    menuApi
      .getMenuItems({ ...filters, keyword, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setMenuData(response.data)
      })
      .catch((error) => {
        if (ignore) return
        // Selected category was deleted in another tab -> back to "all"
        if (error.response?.status === 404) {
          setFilters((prev) => ({ ...prev, category: 'all', page: 1 }))
          return
        }
        toast.error(getErrorMessage(error, 'Không tải được danh sách món'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [restaurant, filters, keyword, refreshKey])

  // ----- Filters -----
  const changeFilters = (changes) => {
    setLoading(true)
    setFilters((prev) => ({ ...prev, page: 1, ...changes }))
  }

  const handleSearchChange = (text) => {
    setSearchText(text)
    // Keep the same object when already on page 1, otherwise every keystroke triggers a request
    setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))
  }

  // ----- Menu item actions -----
  const updateItemLocally = (itemId, changes) => {
    setMenuData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item._id === itemId ? { ...item, ...changes } : item)),
    }))
  }

  const setItemBusy = (itemId, isBusy) => {
    setBusyItemIds((prev) => {
      const next = new Set(prev)
      if (isBusy) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }

  // Optimistic toggle: update UI first, revert if the API fails.
  // The item's switches are locked until the request finishes, so responses cannot arrive out of order.
  const toggleItem = async (item, changes, request) => {
    if (busyItemIds.has(item._id)) return

    const previous = { isAvailable: item.isAvailable, isVisible: item.isVisible, soldOutAt: item.soldOutAt }
    setItemBusy(item._id, true)
    updateItemLocally(item._id, changes)
    try {
      const response = await request()
      updateItemLocally(item._id, { soldOutAt: response.data.soldOutAt })
      toast.success(response.message)
      refresh() // counters and current tab may change
    } catch (error) {
      updateItemLocally(item._id, previous)
      toast.error(getErrorMessage(error, 'Không cập nhật được trạng thái món'))
    } finally {
      setItemBusy(item._id, false)
    }
  }

  const handleToggleAvailable = (item, isAvailable) =>
    toggleItem(item, { isAvailable }, () => menuApi.setAvailability(item._id, isAvailable))

  const handleToggleVisible = (item, isVisible) =>
    toggleItem(item, { isVisible }, () => menuApi.setVisibility(item._id, isVisible))

  const openCreateItem = () => {
    if (categories.length === 0) {
      toast.error('Hãy tạo danh mục trước khi thêm món')
      setCategoryForm({ category: null })
      return
    }
    setItemForm({ item: null })
  }

  const handleDeleteItem = (item) => {
    setConfirm({
      title: 'Xóa món ăn?',
      message: `"${item.name}" sẽ bị xóa vĩnh viễn khỏi thực đơn.`,
      confirmLabel: 'Xóa món',
      action: async () => {
        const response = await menuApi.deleteMenuItem(item._id)
        toast.success(response.message)
        // Deleting the last item of a page -> go back one page
        if (menuData.items.length === 1 && filters.page > 1) {
          setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
        }
        refresh()
      },
    })
  }

  // ----- Category actions -----
  const handleSubmitCategory = async (name) => {
    const { category } = categoryForm
    setCategoryForm((prev) => ({ ...prev, saving: true, error: '' }))
    try {
      const response = category
        ? await menuApi.updateCategory(category._id, { name })
        : await menuApi.createCategory({ name })
      toast.success(response.message)
      setCategoryForm(null)
      refresh()
    } catch (error) {
      setCategoryForm((prev) => ({ ...prev, saving: false, error: getErrorMessage(error, 'Không lưu được danh mục') }))
    }
  }

  const handleDeleteCategory = (category) => {
    setConfirm({
      title: 'Xóa danh mục?',
      message: `Danh mục "${category.name}" sẽ bị xóa. Chỉ xóa được danh mục không còn món nào.`,
      confirmLabel: 'Xóa danh mục',
      action: async () => {
        const response = await menuApi.deleteCategory(category._id)
        toast.success(response.message)
        if (filters.category === category._id) changeFilters({ category: 'all' })
        refresh()
      },
    })
  }

  const runConfirmAction = async () => {
    setConfirmLoading(true)
    try {
      await confirm.action()
      setConfirm(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Thao tác không thành công'))
    } finally {
      setConfirmLoading(false)
    }
  }

  if (!restaurant) {
    return <NoRestaurantNotice message="Hãy tạo hồ sơ nhà hàng trước, sau đó quay lại đây để xây dựng thực đơn." />
  }

  const activeCategory = categories.find((category) => category._id === filters.category)
  const isFiltered = Boolean(keyword) || filters.status !== 'all' || filters.category !== 'all'

  return (
    <>
      <MenuHeaderBar
        summary={menuData.summary}
        onAddCategory={() => setCategoryForm({ category: null })}
        onAddItem={openCreateItem}
      />
      <MenuToolbar
        searchText={searchText}
        onSearchChange={handleSearchChange}
        status={filters.status}
        statusCounts={menuData.statusCounts}
        onStatusChange={(status) => changeFilters({ status })}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] items-start">
        <CategorySidebar
          categories={categories}
          totalItems={categoryData.totalItems}
          activeCategory={filters.category}
          onSelect={(category) => changeFilters({ category })}
          onAdd={() => setCategoryForm({ category: null })}
          onEdit={(category) => setCategoryForm({ category })}
          onDelete={handleDeleteCategory}
        />

        <section className="rounded-xl border border-brand-soft/60 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-brand-soft/60 px-5 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft/70">
              <UtensilsCrossed className="h-4 w-4 text-brand" />
            </span>
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              {activeCategory ? activeCategory.name : 'Tất cả món ăn'}
            </h2>
            <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-bold text-slate-700">
              {menuData.pagination.totalItems} món
            </span>
          </div>

          <MenuItemTable
            items={menuData.items}
            loading={loading}
            isFiltered={isFiltered}
            hasCategories={categories.length > 0}
            onAddItem={openCreateItem}
            onAddCategory={() => setCategoryForm({ category: null })}
            busyItemIds={busyItemIds}
            onToggleAvailable={handleToggleAvailable}
            onToggleVisible={handleToggleVisible}
            onEdit={(item) => setItemForm({ item })}
            onDelete={handleDeleteItem}
          />

          <div className="border-t border-brand-soft/50 bg-brand-light/30">
            <Pagination
              pagination={menuData.pagination}
              unit="món"
              onPageChange={(page) => {
                setLoading(true)
                setFilters((prev) => ({ ...prev, page }))
              }}
            />
          </div>
        </section>
      </div>

      {itemForm && (
        <MenuItemFormModal
          item={itemForm.item}
          categories={categories}
          defaultCategoryId={activeCategory?._id || categories[0]?._id}
          onClose={() => setItemForm(null)}
          onSaved={refresh}
        />
      )}

      {categoryForm && (
        <CategoryFormDialog
          category={categoryForm.category}
          saving={categoryForm.saving}
          error={categoryForm.error}
          onSubmit={handleSubmitCategory}
          onCancel={() => setCategoryForm(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        loading={confirmLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
