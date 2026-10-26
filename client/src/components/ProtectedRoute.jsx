import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth()

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="container animate-fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🚫</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
          Quyền truy cập bị từ chối
        </h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', maxWidth: 480, marginInline: 'auto' }}>
          Chức năng này chỉ dành cho vai trò: <strong>{allowedRoles.join(', ').toUpperCase()}</strong>.
          Bạn đang đăng nhập với vai trò: <strong>{user?.role?.toUpperCase() || 'CHƯA ĐĂNG NHẬP'}</strong>.
        </p>
        <Link to="/" className="btn btn-primary">
          Về trang Thực đơn của Khách hàng
        </Link>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
