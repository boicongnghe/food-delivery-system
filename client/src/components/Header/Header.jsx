import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { UtensilsCrossed, House, LogOut, ChefHat, Scale, Store, Wallet, Moon, Sun } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import useTheme from '../../hooks/useTheme.js'
import NotificationBell from '../NotificationBell/NotificationBell.jsx'

/**
 * Shared header for partner portals (restaurant owner, kitchen...).
 * Synchronized with FoodDelivery theme and branding.
 *
 * @param {string} subtitle - small text next to the logo, e.g. "Kênh Quán Ăn"
 * @param {Array<{ to: string, label: string }>} navItems - main navigation links
 * @param {{ label: string, isOpen: boolean } | null} status - optional status pill
 * @param {string} hotline - support phone number
 * @param {string} accountImage - picture of the account button (restaurant portal: the restaurant logo)
 * @param {string} accountName - name on the account button (restaurant portal: the restaurant name)
 * @param {string} accountCaption - line under the name in the account menu (default: the restaurant owner)
 * @param {Array<{ to: string, label: string, icon: Component }>} menuItems - links of the account menu
 */
const RESTAURANT_MENU_ITEMS = [
  { to: '/restaurant/orders', label: 'Đơn hàng bếp', icon: ChefHat },
  { to: '/restaurant/profile', label: 'Hồ sơ quán · đổi logo', icon: Store },
  { to: '/restaurant/revenue?tab=wallet', label: 'Ví & rút tiền', icon: Wallet },
  { to: '/restaurant/hearings', label: 'Đối chất', icon: Scale },
]

export default function Header({
  subtitle = 'Kênh Quán Ăn',
  navItems = [],
  status = null,
  hotline = '1900 6868',
  accountImage = '',
  accountName = '',
  accountCaption = '',
  menuItems = RESTAURANT_MENU_ITEMS,
  showThemeToggle = false,
}) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  // Restaurant portal (accountName given): the account IS the restaurant, so only its logo is shown
  const avatarSrc = accountName ? accountImage : accountImage || user?.avatar || ''
  const displayName = accountName || user?.fullName || 'Chủ quán'
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50/70 text-primary shadow-xs transition-all hover:border-primary/50 hover:bg-orange-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Về Trang chủ FoodDelivery"
            aria-label="Về Trang chủ"
          >
            <House className="w-4 h-4" />
          </Link>

          {showThemeToggle && (
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 shadow-xs transition-all hover:scale-105 active:scale-95 dark:border-slate-700 dark:bg-slate-800/80 dark:text-amber-400 dark:hover:bg-slate-700"
              title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
              aria-label={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {status && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase ${
                status.isOpen
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
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
              className="flex items-center rounded-full p-0.5 border border-slate-200 hover:border-orange-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={`Tài khoản: ${displayName}`}
              title={displayName}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                  }}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {menuOpen && (
              <>
                {/* Click outside to close */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  {user && (
                    <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="w-9 h-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-primary font-bold text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                        {(accountCaption || accountName) && (
                          <p className="text-xs text-slate-600 truncate">{accountCaption || `Chủ quán: ${user.fullName}`}</p>
                        )}
                        {user.email && !user.email.startsWith('fb_') && (
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="py-1">
                    {menuItems.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-primary rounded-lg transition-colors font-medium"
                      >
                        <Icon className="w-4 h-4 text-primary" />
                        {label}
                      </Link>
                    ))}
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
