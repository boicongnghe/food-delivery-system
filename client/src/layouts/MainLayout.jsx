import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import CartDrawer from '../components/CartDrawer.jsx'

function MainLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenCart={() => setIsCartOpen(true)} />
      <main style={{ flex: 1, padding: '32px 0 64px' }}>
        <Outlet />
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: 'var(--text-light)',
        borderTop: '1px solid var(--border)',
        fontSize: '0.85rem',
      }}>
        Food Delivery Management © 2026 – WDP301 Group Project
      </footer>
    </div>
  )
}

export default MainLayout
