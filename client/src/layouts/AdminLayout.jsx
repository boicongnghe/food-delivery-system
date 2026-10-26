import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Store,
  Bike,
  Receipt,
  LogOut,
  Bell,
  ChartColumn,
  MessageSquareText,
  MessageSquareWarning,
  Percent,
  Siren,
  TicketPercent,
} from 'lucide-react'
import useAuth from '../hooks/useAuth.js'

const NAV_LINKS = [
  { to: '/admin', label: 'Tổng quan hệ thống', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Thống kê & báo cáo', icon: ChartColumn },
  { to: '/admin/users', label: 'Quản lý tài khoản', icon: Users },
  { to: '/admin/complaints', label: 'Xử lý khiếu nại', icon: MessageSquareWarning },
  { to: '/admin/reviews', label: 'Kiểm duyệt đánh giá', icon: MessageSquareText },
  { to: '/admin/delivery-issues', label: 'Sự cố giao hàng', icon: Siren },
  { to: '/admin/promotions', label: 'Mã khuyến mãi', icon: TicketPercent },
  { to: '/admin/commission-rules', label: 'Quy tắc hoa hồng', icon: Percent },
]

// Sections owned by other modules that have no screen yet
const UPCOMING_ITEMS = [
  { label: 'Kiểm duyệt quán ăn', icon: Store },
  { label: 'Hồ sơ tài xế', icon: Bike },
  { label: 'Đơn hàng toàn sàn', icon: Receipt },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-base text-white tracking-tight">Admin Portal</h2>
            <span className="text-[11px] font-bold text-purple-400">Hệ Thống Quản Trị</span>
          </div>
        </div>

        {/* Navigation Menu: a horizontal scroll row on mobile, a column from md */}
        <nav className="p-4 flex gap-1.5 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm transition-colors md:w-full ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 font-bold border-purple-500/30'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900 font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {UPCOMING_ITEMS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex shrink-0 items-center gap-3 whitespace-nowrap px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-colors md:w-full"
            >
              <Icon className="w-4 h-4 text-slate-400" />
              {label}
            </button>
          ))}
        </nav>

        {/* Admin User info footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'}
              alt={user?.fullName || 'Admin'}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/40"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.fullName || 'Super Admin'}</p>
              <p className="text-xs text-purple-400 font-semibold truncate">admin@fooddelivery.vn</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-red-200 text-xs font-bold transition-colors border border-red-800/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất Quản trị
          </button>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Admin Top Header */}
        <header className="h-16 bg-slate-950/70 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300">Server Cluster: Online (NodeJS + MERN)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500"></span>
            </button>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-purple-300">
              Role: SYSTEM_ADMIN
            </span>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 lg:p-8 bg-slate-900/50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
