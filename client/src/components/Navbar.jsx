import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

function Navbar({ onOpenCart }) {
  const { itemCount } = useCart()
  const location = useLocation()

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-brand">
          <div className="nav-brand-icon">🍜</div>
          <span>FoodDelivery</span>
        </Link>

        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Thực đơn món ăn
          </Link>
          <Link
            to="/orders"
            className={`nav-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`}
          >
            Đơn hàng của tôi
          </Link>

          <button
            type="button"
            className="cart-btn"
            onClick={onOpenCart}
            aria-label="Giỏ hàng"
          >
            <span>🛒 Giỏ hàng</span>
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </button>

          {/* Customer Profile Info (No switcher) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 14px',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}>
            <span>👤</span>
            <span>Nguyễn Văn Đạt</span>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
