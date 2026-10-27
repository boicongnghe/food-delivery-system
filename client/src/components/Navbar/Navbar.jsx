import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  UtensilsCrossed,
  Search,
  Home as HomeIcon,
  ChevronDown,
  LogOut,
  Store,
  ShieldCheck,
  UserCog,
  ShoppingBag,
  MessageSquareText,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { useCart } from '../../context/CartContext.jsx'
import ProfileModal from '../ProfileModal/ProfileModal.jsx'
import NotificationBell from '../NotificationBell/NotificationBell.jsx'

export default function Navbar({ onOpenCart }) {
  const cartContext = useCart()
  const itemCount = cartContext?.itemCount || 0
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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

        {/* Right Actions & Menus */}
        <div className="flex items-center gap-3">
          {/* Cart Button - Chỉ hiển thị khi đã đăng nhập với vai trò khách hàng */}
          {isAuthenticated && user?.role === 'customer' && (
            <button
              type="button"
              id="navbar-cart-btn"
              onClick={onOpenCart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors shadow-sm"
              title="Giỏ hàng"
            >
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              {itemCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[11px] font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          )}

          {/* Chuông thông báo (đối với role restaurant_owner được đặt giữa nút Đơn Hàng Bếp và Avatar) */}
          {isAuthenticated && user && user.role !== 'restaurant_owner' && (
            <NotificationBell />
          )}

          {isAuthenticated && user ? (
            user.role === 'customer' ? (
              /* KHÁCH HÀNG: CÓ DROPDOWN DƯỚI ẢNH ĐẠI DIỆN VỚI THANH "THÔNG TIN" */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="customer-avatar-dropdown-btn"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 sm:gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                  aria-expanded={dropdownOpen}
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                    alt={user.fullName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{user.fullName}</p>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full inline-block mt-0.5 bg-orange-100 text-primary border border-orange-200">
                      Khách hàng
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    {/* Header tóm tắt hồ sơ khách hàng */}
                    <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-3">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 bg-orange-100 text-primary border border-orange-200">
                          Khách hàng
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-1"></div>

                    {/* Mục Thông tin cá nhân: kích thước và style y hệt như Trang chủ món ăn, không có chữ Chỉnh sửa */}
                    <button
                      type="button"
                      id="dropdown-info-btn"
                      onClick={() => {
                        setProfileModalOpen(true)
                        setDropdownOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <UserCog className="w-4 h-4 text-slate-400" />
                      <span>Thông tin cá nhân</span>
                    </button>

                    {/* Quick navigation */}
                    <Link
                      to="/"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <HomeIcon className="w-4 h-4 text-slate-400" />
                      <span>Trang chủ món ăn</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <UtensilsCrossed className="w-4 h-4 text-slate-400" />
                      <span>Đơn hàng của tôi</span>
                    </Link>

                    <Link
                      to="/feedback"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <MessageSquareText className="w-4 h-4 text-slate-400" />
                      <span>Đánh giá & Khiếu nại</span>
                    </Link>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : user.role === 'restaurant_owner' ? (
              /* NHÀ HÀNG: GỌN LẠI VỚI 2 NÚT (ĐƠN HÀNG BẾP VÀ ẢNH ĐẠI DIỆN CÓ DROPDOWN) */
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/restaurant/orders"
                  id="restaurant-orders-nav-btn"
                  className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full border border-orange-200 hover:border-primary/50 text-orange-700 hover:bg-orange-50 text-xs font-bold transition-all shadow-xs"
                  title="Đơn Hàng Bếp"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                  <span>Đơn Hàng Bếp</span>
                </Link>

                {/* Chuông thông báo đặt ở giữa nút bên ngoài và Ảnh đại diện */}
                <NotificationBell />

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    id="restaurant-avatar-dropdown-btn"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 sm:gap-2.5 p-1 sm:p-1.5 pr-2.5 sm:pr-3 rounded-full hover:bg-orange-50 border border-orange-200/80 transition-all hover:scale-[1.01] focus:outline-none"
                    aria-expanded={dropdownOpen}
                  >
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80'}
                      alt={user.fullName}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/40 group-hover:ring-primary transition-all"
                    />
                    <div className="hidden sm:block text-left">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                        {user.restaurantDetails?.restaurantName || user.fullName}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full inline-block mt-0.5 bg-orange-100 text-primary border border-orange-200">
                        Chủ quán
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                      {/* Header tóm tắt hồ sơ quán */}
                      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-3">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80'}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 flex-shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {user.restaurantDetails?.restaurantName || user.fullName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 bg-orange-100 text-primary border border-orange-200">
                            Chủ quán
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        {/* Mục Hồ Sơ Quán (thay cho Đơn Hàng Bếp) */}
                        <Link
                          to="/restaurant/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors font-medium"
                        >
                          <Store className="w-4 h-4 text-primary" />
                          <span>Hồ Sơ Quán</span>
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        {/* Nút Đăng xuất */}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : user.role === 'shipper' ? (
              /* TÀI XẾ: ẤN VÀO ẢNH ĐẠI DIỆN LÀ CHUYỂN LUÔN ĐẾN PHẦN QUẢN LÝ (ĐÃ XÓA NÚT THỪA) */
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/shipper"
                  id="shipper-avatar-nav-btn"
                  className="flex items-center gap-2.5 p-1 sm:p-1.5 pr-2.5 sm:pr-3 rounded-full hover:bg-emerald-50 border border-emerald-200/80 transition-all hover:scale-[1.02] group"
                  title="Bấm để vào Trang Nhận Đơn Shipper"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80'}
                    alt={user.fullName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40 group-hover:ring-emerald-600 transition-all"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 leading-tight group-hover:text-emerald-800 transition-colors">
                      {user.fullName}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full inline-block mt-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Tài xế
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span className="hidden md:inline">Đăng xuất</span>
                </button>
              </div>
            ) : (
              /* ADMIN / KHÁC */
              <div className="flex items-center gap-3">
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Quản Trị Admin
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-red-50 text-red-600 text-xs font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </button>
              </div>
            )
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

      {/* Modal Cập Nhật Thông Tin Cá Nhân / Đổi Ảnh Đại Diện */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  )
}
