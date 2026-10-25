import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Store,
  Bike,
  Receipt,
  Settings,
  LogOut,
  Bell,
  Sparkles,
} from 'lucide-react'
import useAuth from '../hooks/useAuth.js'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5 flex-1">
          <Link
            to="/admin"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              location.pathname === '/admin'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-purple-400" />
            Tổng quan hệ thống
          </Link>

          <Link
            to="/admin/promotions"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              location.pathname === '/admin/promotions'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Quản lý khuyến mãi
          </Link>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-colors"
          >
            <Store className="w-4 h-4 text-slate-400" />
            Kiểm duyệt quán ăn
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-colors"
          >
            <Users className="w-4 h-4 text-slate-400" />
            Quản lý người dùng
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-colors"
          >
            <Bike className="w-4 h-4 text-slate-400" />
            Hồ sơ tài xế
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-colors"
          >
            <Receipt className="w-4 h-4 text-slate-400" />
            Đơn hàng toàn sàn
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 font-semibold text-sm transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Cấu hình & Tỷ lệ chiết khấu
          </button>
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
