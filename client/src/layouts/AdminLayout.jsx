import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Store,
  Bike,
  Receipt,
  LogOut,
  ChartColumn,
  MessageSquareText,
  MessageSquareWarning,
  Moon,
  Percent,
  Siren,
  Sun,
  TicketPercent,
  UtensilsCrossed,
} from 'lucide-react'
import useAuth from '../hooks/useAuth.js'
import useTheme from '../hooks/useTheme.js'
import NotificationBell from '../components/NotificationBell/NotificationBell.jsx'

const NAV_LINKS = [
  { to: '/admin', label: 'Tổng quan hệ thống', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Thống kê & báo cáo', icon: ChartColumn },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/restaurants', label: 'Nhà hàng', icon: Store },
  { to: '/admin/shippers', label: 'Shipper', icon: Bike },
  { to: '/admin/orders', label: 'Đơn hàng toàn sàn', icon: Receipt },
  { to: '/admin/complaints', label: 'Xử lý khiếu nại', icon: MessageSquareWarning },
  { to: '/admin/reviews', label: 'Kiểm duyệt đánh giá', icon: MessageSquareText },
  { to: '/admin/delivery-issues', label: 'Sự cố giao hàng', icon: Siren },
  { to: '/admin/promotions', label: 'Mã khuyến mãi', icon: TicketPercent },
  { to: '/admin/commission-rules', label: 'Quy tắc hoa hồng', icon: Percent },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-crave-cream dark:bg-crave-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 md:sticky md:top-0 md:h-screen bg-white dark:bg-crave-surface border-b md:border-b-0 md:border-r border-slate-100 dark:border-crave-border flex flex-col flex-shrink-0">
        {/* Brand: same logo as the customer site */}
        <div className="p-6 border-b border-slate-100 dark:border-crave-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] via-[#FF416C] to-[#FFB800] text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base tracking-tight">
              Food<span className="text-primary">Delivery</span>
            </h2>
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3 h-3 text-primary" />
              Cổng quản trị
            </span>
          </div>
        </div>

        {/* Navigation Menu: a horizontal scroll row on mobile, a column from md */}
        <nav className="p-4 flex gap-1.5 overflow-x-auto md:flex-1 md:flex-col md:overflow-y-auto">
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm transition-colors md:w-full ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold border-primary/20'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

        </nav>

        {/* Admin User info footer */}
        <div className="p-4 border-t border-slate-100 dark:border-crave-border">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'}
              alt={user?.fullName || 'Admin'}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/30"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.fullName || 'Super Admin'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 dark:hover:text-red-200 text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Admin Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-white/80 dark:bg-crave-dark/80 backdrop-blur-xl border-b border-slate-100 dark:border-crave-border px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Hệ thống đang hoạt động</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xs"
              title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationBell isDark={isDark} />
            <span className="hidden sm:inline text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
              Quản trị viên
            </span>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
