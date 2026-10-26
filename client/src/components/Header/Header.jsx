import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, House, LogOut, ChefHat, Store, User } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import NotificationBell from '../NotificationBell/NotificationBell.jsx'

/**
 * Shared header for partner portals (restaurant owner, kitchen...).
 * Synchronized with FoodDelivery theme and branding.
 *
 * @param {string} subtitle - small text next to the logo, e.g. "Kênh Quán Ăn"
 * @param {Array<{ to: string, label: string }>} navItems - main navigation links
 * @param {{ label: string, isOpen: boolean } | null} status - optional status pill
 * @param {string} hotline - support phone number
 */
export default function Header({ subtitle = 'Kênh Quán Ăn', navItems = [], status = null, hotline = '1900 6868' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap lg:flex-nowrap items-center gap-x-6 gap-y-3">
        {/* Logo FoodDelivery Kênh Quán Ăn (Bấm vào để về Trang chủ) */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group" title="Bấm để về Trang chủ FoodDelivery">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-800 leading-none">
              Food<span className="text-primary">Delivery</span>
            </span>
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase mt-1">
              {subtitle}
            </span>
          </div>
        </Link>

        {/* Navigation: second row on mobile, inline on desktop */}
        <nav className="order-last w-full lg:order-none lg:w-auto flex gap-1.5 overflow-x-auto py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/30 hover:text-white'
                    : 'text-slate-700 hover:bg-orange-50 hover:text-primary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Nút bấm chuyển về Trang chủ */}
          <Link
            to="/"
            id="back-to-homepage-btn"
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full border border-orange-200 hover:border-primary/50 bg-orange-50/70 hover:bg-orange-100 text-slate-700 hover:text-primary text-xs font-bold transition-all shadow-xs"
            title="Chuyển về Trang chủ FoodDelivery"
          >
            <House className="w-3.5 h-3.5 text-primary" />
            <span>Trang Chủ</span>
          </Link>

          {status && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase ${
                status.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {status.label}
            </span>
          )}

          {/* Chuông thông báo */}
          {user && <NotificationBell />}

          {/* Account menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full hover:bg-orange-50 border border-slate-200 hover:border-orange-200 transition-all focus:outline-none"
              aria-label="Tài khoản"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'Q'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.fullName || 'Chủ quán'}
                </p>
                <span className="text-[10px] font-bold text-primary">Kênh Quán</span>
              </div>
            </button>

            {menuOpen && (
              <>
                {/* Click outside to close */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  {user && (
                    <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-primary font-bold text-xs">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'Q'}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  )}

                  <div className="py-1">
                    <Link
                      to="/restaurant/orders"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors font-medium"
                    >
                      <ChefHat className="w-4 h-4 text-primary" />
                      Đơn hàng bếp
                    </Link>
                    <Link
                      to="/restaurant/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors font-medium"
                    >
                      <Store className="w-4 h-4 text-primary" />
                      Hồ sơ quán ăn
                    </Link>
                    <Link
                      to="/"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <House className="w-4 h-4 text-slate-400" />
                      Trang đặt món (Khách hàng)
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
