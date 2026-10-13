import { Link, Outlet } from 'react-router-dom'

function MainLayout() {
  return (
    <>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
        <Link to="/" style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>
          Food Delivery
        </Link>
      </header>
      <main style={{ padding: '24px' }}>
        <Outlet />
      </main>
    </>
  )
}

export default MainLayout
