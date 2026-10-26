import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar/Navbar.jsx'

function MainLayout() {
  return (
    <div className="layout-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
