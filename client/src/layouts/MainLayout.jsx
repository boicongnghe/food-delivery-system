import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { UtensilsCrossed, Phone, Mail, MapPin, ShieldCheck, Heart, ArrowUpRight, Sparkles } from 'lucide-react'
import Navbar from '../components/Navbar/Navbar.jsx'
import CartDrawer from '../components/CartDrawer.jsx'

function MainLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9] dark:bg-[#0F1014] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sticky Full-Width Glassmorphic Navbar */}
      <Navbar onOpenCart={() => setIsCartOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Slide-Over Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Full-Width Edge-to-Edge Footer */}
      <footer className="w-full bg-slate-900 text-slate-300 dark:bg-[#0B0C0E] border-t border-slate-800 transition-colors">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-slate-800">
            {/* Col 1: Brand & Bio (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] via-[#FF416C] to-[#FFB800] flex items-center justify-center text-white shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-white tracking-tight">
                  Crave<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] to-[#FF416C]">Dash</span>
                </span>
              </Link>

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
                Nền tảng giao đồ ăn thần tốc 20 phút hàng đầu. Kết nối hơn 1.200 nhà hàng đối tác uy tín với hàng triệu tín đồ ẩm thực mỗi ngày.
              </p>

              <div className="space-y-2 pt-2 text-xs text-slate-400">
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span>Tổng đài CSKH: <strong>1900 6868</strong> (24/7)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>Email hỗ trợ: hotro@cravedash.vn</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>Tòa nhà Innovation Hub, Quận 1, TP. Hồ Chí Minh</span>
                </p>
              </div>
            </div>

            {/* Col 2: Danh Mục Nổi Bật (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Khám Phá
              </h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-400">
                <li>
                  <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                    Cơm & Mì Phở <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                    Burger & Gà Rán <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                    Trà Sữa & Cà Phê <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                    Ăn Vặt Sài Gòn <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                    Món Chay Healthy <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Hợp Tác & Cơ Hội (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Gia Nhập CraveDash
              </h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-400">
                <li>
                  <Link to="/register" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                    🍳 Đăng ký mở quán đối tác (Freeship 30 ngày)
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                    🛵 Trở thành tài xế giao hàng (Thu nhập 15tr+)
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-primary transition-colors">
                    🔑 Cổng thông tin đối tác nhà hàng
                  </Link>
                </li>
                <li>
                  <Link to="/feedback" className="hover:text-primary transition-colors">
                    💬 Trung tâm phản hồi & khiếu nại
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Tải App & Thanh Toán (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Tải Ứng Dụng CraveDash
              </h4>
              <p className="text-xs text-slate-400">
                Đặt món mượt mà hơn với ứng dụng điện thoại. Nhận ngay voucher giảm 50% cho đơn hàng đầu tiên!
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer">
                  <span className="text-xl"></span>
                  <div className="text-left">
                    <p className="text-[9px] text-slate-400 uppercase">Tải trên</p>
                    <p className="text-xs font-bold text-white">App Store</p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 flex items-center gap-2 cursor-pointer">
                  <span className="text-xl">▶</span>
                  <div className="text-left">
                    <p className="text-[9px] text-slate-400 uppercase">Tải trên</p>
                    <p className="text-xs font-bold text-white">Google Play</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Bảo mật chuẩn thanh toán PCI-DSS & SSL 256-bit</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © 2026 CraveDash Delivery System. All rights reserved. Made with{' '}
              <Heart className="w-3.5 h-3.5 inline text-red-500 fill-red-500" /> for food lovers.
            </p>
            <div className="flex items-center gap-6 font-medium">
              <span className="hover:text-slate-400 cursor-pointer">Điều khoản sử dụng</span>
              <span className="hover:text-slate-400 cursor-pointer">Chính sách bảo mật</span>
              <span className="hover:text-slate-400 cursor-pointer">Quy chế hoạt động</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
