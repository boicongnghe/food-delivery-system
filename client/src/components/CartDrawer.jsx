import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

function CartDrawer({ isOpen, onClose }) {
  const { cart, updateQuantity, removeFromCart, subtotal, clearCart } = useCart()
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleGoToCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              Giỏ hàng của bạn
            </h2>
            {cart.restaurant && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Từ: <strong>{cart.restaurant.name}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              fontSize: '1.4rem',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🛒</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>
                Giỏ hàng đang trống
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
                Hãy chọn món ăn ngon từ thực đơn nhé!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cart.items.map((item) => (
                <div
                  key={item.food._id || item.food.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <img
                    src={item.food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'}
                    alt={item.food.name}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600 }}>
                      {item.food.name}
                    </h4>
                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.92rem' }}>
                      {(item.food.price * item.quantity).toLocaleString('vi-VN')}đ
                    </div>
                    {item.note && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Ghi chú: {item.note}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                      }}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.food._id || item.food.id, -1)}
                          style={{ padding: '4px 10px', fontWeight: 700, color: 'var(--text-muted)' }}
                        >
                          -
                        </button>
                        <span style={{ padding: '4px 8px', fontWeight: 700, fontSize: '0.9rem' }}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.food._id || item.food.id, 1)}
                          style={{ padding: '4px 10px', fontWeight: 700, color: 'var(--primary)' }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.food._id || item.food.id)}
                        style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600 }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Tạm tính:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                {subtotal.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={handleGoToCheckout}
            >
              Tiến hành Đặt hàng ➔
            </button>

            <button
              type="button"
              onClick={clearCart}
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                padding: '6px 0',
              }}
            >
              Xóa toàn bộ giỏ hàng
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default CartDrawer
