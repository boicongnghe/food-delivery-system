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
  Moon,
  Sun,
  Flame,
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

  // Dark Mode state
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      document.documentElement.classList.contains('dark')
    )
  })

  // Cart animation trigger on count change
  const [cartAnimate, setCartAnimate] = useState(false)
  const prevCountRef = useRef(itemCount)

  useEffect(() => {
    if (itemCount !== prevCountRef.current && itemCount > 0) {
      setCartAnimate(true)
      const timer = setTimeout(() => setCartAnimate(false), 550)
      prevCountRef.current = itemCount
      return () => clearTimeout(timer)
    }
    prevCountRef.current = itemCount
  }, [itemCount])

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  // Close dropdowns on outside click
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
    if (!searchQuery.trim()) return
    if (location.pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      const menuSection = document.getElementById('menu-section')
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: 'smooth' })
      }
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`, { replace: true })
    }
  }

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`)
    } else {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0F1014]/95 backdrop-blur-xl border-b border-orange-100/80 dark:border-slate-800/80 shadow-xs transition-colors duration-200">
      <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 h-20 min-h-[80px] flex items-center justify-between gap-4 sm:gap-8">
        {/* Left Side: Brand Logo + Quick Search + Navigation Links */}
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 flex-1 min-w-0">
          {/* FoodDelivery Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 flex-shrink-0 group select-none"
            title="FoodDelivery"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] via-[#FF416C] to-[#FFB800] flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                Food<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] to-[#FF416C]">Delivery</span>
              </span>
              <span className="text-[10px] font-bold text-orange-600 dark:text-amber-400 tracking-wider uppercase mt-0.5">
                Giao Nhanh 20p
              </span>
            </div>
          </Link>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md lg:max-w-lg xl:max-w-xl relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm món ngon, thương hiệu quán ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-100 focus:bg-white dark:focus:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 rounded-2xl border border-transparent focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </form>

          {/* Navigation Anchor Links - Hiển thị từ màn hình lg (1024px) trở lên */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToSection('restaurants-section')}
              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-orange-50/60 dark:hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
            >
              <Store className="w-4 h-4 text-primary" />
              <span>Nhà hàng</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('menu-section')}
              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-orange-50/60 dark:hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
            >
              <UtensilsCrossed className="w-4 h-4 text-orange-500" />
              <span>Thực đơn</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('deals-section')}
              className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-orange-50/60 dark:hover:bg-slate-800/60 transition-all flex items-center gap-1.5"
            >
              <Flame className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Flash Deal</span>
            </button>
          </nav>
        </div>

        {/* Right Side: Dark Mode Toggle + Notifications + Cart Button + Auth State */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
            title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Cart Button with Cart Bounce Animation */}
          <button
            type="button"
            id="navbar-cart-btn"
            onClick={onOpenCart}
            className={`relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] hover:from-[#e03e20] hover:to-[#e03358] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
              cartAnimate ? 'animate-cart-bounce' : ''
            }`}
            title="Mở giỏ hàng"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Giỏ hàng</span>
            {itemCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-primary text-xs font-black shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* Chuông thông báo (đối với role restaurant_owner được hiển thị bên trong layout của họ) */}
          {isAuthenticated && user && user.role !== 'restaurant_owner' && (
            <NotificationBell />
          )}

          {/* User Authentication Status */}
          {isAuthenticated && user ? (
            user.role === 'customer' ? (
              /* KHÁCH HÀNG: AVATAR DROPDOWN MENU */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="customer-avatar-dropdown-btn"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-orange-50/80 dark:hover:bg-slate-800 hover:border-orange-200 dark:hover:border-slate-700 transition-all focus:outline-none shadow-2xs"
                  aria-expanded={dropdownOpen}
                >
                  <img
                    src={
                      user.avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                    }
                    alt={user.fullName}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-primary/30 shadow-xs"
                  />
                  <div className="hidden md:block text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[130px] xl:max-w-[170px]">
                      {user.fullName}
                    </p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5 bg-orange-100 dark:bg-orange-950/60 text-primary border border-orange-200 dark:border-orange-800">
                      Khách hàng
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#181A20] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-2 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img
                        src={
                          user.avatar ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={user.fullName}
                        className="w-10 h-10 rounded-2xl object-cover ring-2 ring-primary/30 shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        id="dropdown-info-btn"
                        onClick={() => {
                          setProfileModalOpen(true)
                          setDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-colors text-left"
                      >
                        <UserCog className="w-4 h-4 text-slate-400" />
                        <span>Thông tin cá nhân</span>
                      </button>

                      <Link
                        to="/"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-colors"
                      >
                        <HomeIcon className="w-4 h-4 text-slate-400" />
                        <span>Trang chủ món ngon</span>
                      </Link>

                      <Link
                        to="/orders"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-colors"
                      >
                        <UtensilsCrossed className="w-4 h-4 text-slate-400" />
                        <span>Đơn hàng của tôi</span>
                      </Link>

                      <Link
                        to="/feedback"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-colors"
                      >
                        <MessageSquareText className="w-4 h-4 text-slate-400" />
                        <span>Đánh giá & Khiếu nại</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors font-bold"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : user.role === 'restaurant_owner' ? (
              /* QUÁN ĂN: ĐƠN HÀNG BẾP VÀ DROPDOWN */
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/restaurant/orders"
                  id="restaurant-orders-nav-btn"
                  className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-2xl border border-orange-200 dark:border-orange-800/80 hover:border-primary text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-2xs"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                  <span>Đơn Bếp</span>
                </Link>

                <NotificationBell />

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-orange-50 dark:hover:bg-slate-800 border border-orange-200/80 dark:border-slate-700"
                  >
                    <img
                      src={
                        user.avatar ||
                        'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={user.fullName}
                      className="w-8 h-8 rounded-2xl object-cover ring-2 ring-primary/40"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#181A20] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.restaurantDetails?.restaurantName || user.fullName}
                        </p>
                        <span className="text-[10px] text-primary font-bold">Chủ quán ăn</span>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/restaurant/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-50 rounded-xl"
                        >
                          <Store className="w-3.5 h-3.5 text-primary" />
                          <span>Hồ Sơ Quán</span>
                        </Link>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 font-bold hover:bg-red-50 rounded-xl"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : user.role === 'shipper' ? (
              /* TÀI XẾ */
              <div className="flex items-center gap-2">
                <Link
                  to="/shipper"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:scale-105 transition-all"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80'}
                    alt={user.fullName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span>Tài xế</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* ADMIN */
              <div className="flex items-center gap-2">
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Quản trị Admin</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            /* GUEST: LOGIN / REGISTER BUTTONS */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:bg-orange-50 dark:hover:bg-slate-800 transition-all"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </header>
  )
}
