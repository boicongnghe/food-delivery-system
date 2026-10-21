import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { House, LogOut, Phone, User } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

/**
 * Shared header for partner portals (restaurant owner, shipper...).
 *
 * @param {string} subtitle - small text next to the logo, e.g. "Bếp & Phố"
 * @param {Array<{ to: string, label: string }>} navItems - main navigation links
 * @param {{ label: string, isOpen: boolean } | null} status - optional status pill
 * @param {string} hotline - support phone number
 */
export default function Header({ subtitle, navItems = [], status = null, hotline = '1900 6868' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-soft/60">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap lg:flex-nowrap items-center gap-x-6 gap-y-3">
        {/* Logo */}
        <Link to="/" className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-serif text-2xl font-bold text-brand">GiaoNhanh</span>
          {subtitle && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
              {subtitle}
            </span>
          )}
        </Link>

        {/* Navigation: second row on mobile, inline on desktop */}
        <nav className="order-last w-full lg:order-none lg:w-auto flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand text-white shadow-sm hover:text-white'
                    : 'text-slate-700 hover:bg-brand-light hover:text-brand'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <a
            href={`tel:${hotline.replace(/\s/g, '')}`}
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-sm font-semibold text-slate-800 hover:text-brand"
          >
            <Phone className="w-4 h-4 text-brand" />
            {hotline}
          </a>

          {status && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase ${
                status.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {status.label}
            </span>
          )}

          {/* Account menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand-hover"
              aria-label="Tài khoản"
            >
              <User className="w-5 h-5" />
            </button>

            {menuOpen && (
              <>
                {/* Click outside to close */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-100 bg-white py-2 shadow-xl">
                  {user && (
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  )}
                  <Link
                    to="/"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <House className="w-4 h-4 text-slate-400" />
                    Trang chủ
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
