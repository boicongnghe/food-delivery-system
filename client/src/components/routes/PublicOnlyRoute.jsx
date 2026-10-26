import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'

export default function PublicOnlyRoute() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />
    }
    if (user.role === 'restaurant_owner') {
      return <Navigate to="/restaurant/orders" replace />
    }
    if (user.role === 'shipper') {
      return <Navigate to="/shipper" replace />
    }
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
