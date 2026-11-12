import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { orderApi } from '../../api/orderApi.js'

const ITEMS_PER_PAGE = 10

function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const res = await orderApi.getCustomerOrders()
        setOrders(res.data?.data || res.data || [])
      } catch (err) {
        console.error('Failed to load orders', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE) || 1

  // Khi danh sách đơn thay đổi, đảm bảo currentPage không vượt quá totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const displayedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return orders.slice(start, start + ITEMS_PER_PAGE)
  }, [orders, currentPage])

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700">Đã nhận hàng</span>
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-red-50 text-red-700">Đã hủy</span>
      case 'delivering':
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-sky-100 text-sky-700">Đang giao</span>
      case 'preparing':
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-fuchsia-50 text-fuchsia-700">Đang nấu</span>
      case 'ready_for_pickup':
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-fuchsia-50 text-fuchsia-700">Chờ shipper lấy</span>
      case 'confirmed':
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700">Đang tìm shipper</span>
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-amber-50 text-amber-700">Chờ xác nhận</span>
    }
  }

  return (
    <div className="mx-auto w-full px-5 animate-fade-in max-w-[860px]">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-3xl font-extrabold m-0">
            Đơn hàng của tôi
          </h1>
          <p className="text-slate-500 mt-1 mb-0 mx-0">
            Theo dõi trạng thái và lịch sử tất cả các đơn hàng đã đặt
          </p>
        </div>
        <Link to="/" className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500">
          + Đặt món mới
        </Link>
      </div>

      {loading && (
        <div className="text-center text-slate-500 py-[60px] px-0">
          <p>Đang tải lịch sử đơn hàng...</p>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md text-center py-[60px] px-5">
          <div className="text-5xl mb-3">📦</div>
          <h3 className="text-xl mt-0 mb-2 mx-0">Bạn chưa có đơn hàng nào</h3>
          <p className="text-slate-500 mt-0 mb-5 mx-0">
            Hãy khám phá các món ăn thơm ngon và đặt ngay một bữa nhé!
          </p>
          <Link to="/" className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-5 py-2.5 text-[0.95rem] border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500">
            Xem thực đơn ngay
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {displayedOrders.map((ord) => (
            <div key={ord._id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] shadow-sm transition hover:shadow-md p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 mb-3.5 pb-3.5">
                <div>
                  <div className="font-extrabold text-base text-slate-900 dark:text-white">
                    #{ord.orderNumber}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(ord.createdAt).toLocaleString('vi-VN')} • Quán: <strong>{ord.restaurant?.name || 'Nhà hàng'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {getStatusBadge(ord.status)}
                  <span className="text-lg font-extrabold text-orange-500">
                    {ord.totalPrice?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Items preview */}
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {ord.items?.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
              </div>

              <div className="flex justify-end gap-2.5">
                {ord.status === 'delivered' && (
                  <Link
                    to="/feedback"
                    className="inline-flex items-center justify-center gap-1.5 border font-bold transition rounded-lg px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white border-transparent shadow-sm"
                  >
                    ⭐ Đánh giá món ăn
                  </Link>
                )}
                <Link to={`/orders/${ord._id}`} className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14151a] text-slate-900 dark:text-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                  Chi tiết & Theo dõi tiến trình ➔
                </Link>
              </div>
            </div>
          ))}

          {/* Phân trang: 10 đơn / trang */}
          {orders.length > ITEMS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-8 mt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, orders.length)}</span>{' '}
                trên tổng số <span className="font-bold text-slate-800 dark:text-slate-200">{orders.length}</span> đơn hàng
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trước</span>
                </button>

                {getPageNumbers().map((pageNum, idx) =>
                  pageNum === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400 select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-8 h-8 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        pageNum === currentPage
                          ? 'bg-primary text-white shadow-md shadow-orange-500/25'
                          : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181A20] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OrderHistory
