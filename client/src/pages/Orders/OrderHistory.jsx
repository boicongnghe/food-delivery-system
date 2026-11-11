import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { orderApi } from '../../api/orderApi.js'

function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

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
          {orders.map((ord) => (
            <div key={ord._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 mb-3.5 pb-3.5">
                <div>
                  <div className="font-extrabold text-base">
                    #{ord.orderNumber}
                  </div>
                  <div className="text-sm text-slate-500">
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
              <div className="text-sm text-slate-500 mb-4">
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
                <Link to={`/orders/${ord._id}`} className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-slate-200 bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50">
                  Chi tiết & Theo dõi tiến trình ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OrderHistory
