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
        setOrders(res.data.data || [])
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
        return <span className="badge badge-delivered">Đã nhận hàng</span>
      case 'cancelled':
        return <span className="badge badge-cancelled">Đã hủy</span>
      case 'delivering':
        return <span className="badge badge-delivering">Đang giao</span>
      case 'preparing':
        return <span className="badge badge-preparing">Đang nấu</span>
      case 'confirmed':
        return <span className="badge badge-confirmed">Đã nhận đơn</span>
      default:
        return <span className="badge badge-pending">Chờ xác nhận</span>
    }
  }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
            Đơn hàng của tôi
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            Theo dõi trạng thái và lịch sử tất cả các đơn hàng đã đặt
          </p>
        </div>
        <Link to="/" className="btn btn-primary btn-sm">
          + Đặt món mới
        </Link>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p>Đang tải lịch sử đơn hàng...</p>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>Bạn chưa có đơn hàng nào</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--text-muted)' }}>
            Hãy khám phá các món ăn thơm ngon và đặt ngay một bữa nhé!
          </p>
          <Link to="/" className="btn btn-primary">
            Xem thực đơn ngay
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((ord) => (
            <div key={ord._id} className="card" style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderBottom: '1px solid var(--border)',
                paddingBottom: 14,
                marginBottom: 14,
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    #{ord.orderNumber}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(ord.createdAt).toLocaleString('vi-VN')} • Quán: <strong>{ord.restaurant?.name || 'Nhà hàng'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {getStatusBadge(ord.status)}
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {ord.totalPrice?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Items preview */}
              <div style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {ord.items?.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Link to={`/orders/${ord._id}`} className="btn btn-secondary btn-sm">
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
