import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar.jsx'
import CartDrawer from '../components/CartDrawer.jsx'
import useAuth from '../hooks/useAuth.js'

function MainLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const isCustomer = isAuthenticated && user?.role === 'customer'

  return (
    <div className="layout-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenCart={() => setIsCartOpen(true)} />
      <main style={{ flex: 1, paddingBottom: '48px' }}>
        <Outlet />
      </main>
      {isCustomer && (
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      )}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: '#94a3b8',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.85rem',
        backgroundColor: '#ffffff',
      }}>
        Food Delivery Management © 2026 – WDP301 Group Project
      </footer>
    </div>
  )
}

export default MainLayout
