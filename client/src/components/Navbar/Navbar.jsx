import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  UtensilsCrossed,
  Search,
  Home as HomeIcon,
  ChevronDown,
  LogOut,
  Store,
  Bike,
  ShieldCheck,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/login')
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'restaurant_owner':
        return { label: 'Chủ quán', className: 'bg-amber-100 text-amber-800 border-amber-200' }
      case 'shipper':
        return { label: 'Tài xế', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
      case 'admin':
        return { label: 'Quản trị viên', className: 'bg-purple-100 text-purple-800 border-purple-200' }
      default:
        return { label: 'Khách hàng', className: 'bg-orange-100 text-primary border-orange-200' }
    }
  }

  const roleInfo = user ? getRoleLabel(user.role) : null

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">
            Food<span className="text-primary">Delivery</span>
          </span>
        </Link>

        {/* Search bar in Navbar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm món ngon, quán ăn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm text-slate-800 rounded-full border border-transparent focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </form>

        {/* Center / Role Quick Links */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user?.role === 'restaurant_owner' && (
            <Link
              to="/restaurant"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-amber-600" />
              Bảng Quản Lý Quán
            </Link>
          )}

          {isAuthenticated && user?.role === 'shipper' && (
            <Link
              to="/shipper"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-colors"
            >
              <Bike className="w-3.5 h-3.5 text-emerald-600" />
              Bảng Nhận Đơn Shipper
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors"
              >
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                  alt={user.fullName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{user.fullName}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.2 rounded-full inline-block mt-0.5 border ${roleInfo.className}`}>
                    {roleInfo.label}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>

                  {/* Role Specific Shortcuts */}
                  {user.role === 'restaurant_owner' && (
                    <Link
                      to="/restaurant"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-800 hover:bg-amber-50 font-bold transition-colors"
                    >
                      <Store className="w-4 h-4 text-amber-600" />
                      Trang Quản Lý Quán Ăn
                    </Link>
                  )}

                  {user.role === 'restaurant_owner' && (
                    <Link
                      to="/restaurant/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-800 hover:bg-amber-50 font-bold transition-colors"
                    >
                      <Store className="w-4 h-4 text-amber-600" />
                      Hồ Sơ Quán
                    </Link>
                  )}

                  {user.role === 'shipper' && (
                    <Link
                      to="/shipper"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-800 hover:bg-emerald-50 font-bold transition-colors"
                    >
                      <Bike className="w-4 h-4 text-emerald-600" />
                      Trang Nhận Đơn Tài Xế
                    </Link>
                  )}

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-800 hover:bg-purple-50 font-bold transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      Trang Quản Trị Admin
                    </Link>
                  )}

                  <Link
                    to="/"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <HomeIcon className="w-4 h-4 text-slate-400" />
                    Trang chủ món ăn
                  </Link>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-full shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all duration-200"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
