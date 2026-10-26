import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  ShoppingBag,
  Star,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import ForgotPasswordModal from '../../components/ForgotPasswordModal/ForgotPasswordModal.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null) // 'google' | 'facebook' | null
  const [showForgotModal, setShowForgotModal] = useState(false)

  const pendingDish = location.state?.selectedDish

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email.trim() || !formData.password) {
      toast.error('Vui lòng điền đầy đủ email và mật khẩu.')
      return
    }

    setLoading(true)
    const result = await login({
      email: formData.email.trim(),
      password: formData.password,
    })
    setLoading(false)

    if (result.success) {
      handleLoginSuccess(result)
    } else {
      toast.error(result.message || 'Đăng nhập thất bại')
    }
  }

  const handleLoginSuccess = (result) => {
    const userRole = result.user?.role
    toast.success(result.message || 'Đăng nhập thành công! 🎉')

    setTimeout(() => {
      // Direct according to user role requirements:
      // 1. Admin -> only goes to /admin
      if (userRole === 'admin') {
        navigate('/admin', { replace: true })
        return
      }

      // 2. Restaurant Owner -> goes directly to kitchen orders /restaurant/orders
      if (userRole === 'restaurant_owner') {
        navigate('/restaurant/orders', { replace: true })
        return
      }

      // 3. Shipper -> goes to /shipper
      if (userRole === 'shipper') {
        navigate('/shipper', { replace: true })
        return
      }

      // 4. Customer:
      // If they were trying to order a dish before login, continue ordering that dish!
      if (pendingDish) {
        navigate('/', {
          replace: true,
          state: { continueOrder: pendingDish },
        })
        return
      }

      // Customer logged in from beginning -> go to homepage
      const fromPath = location.state?.from?.pathname || '/'
      navigate(fromPath, { replace: true })
    }, 350)
  }

  // Đăng nhập nhanh bằng Google / Facebook
  const handleSocialLogin = async (provider) => {
    setSocialLoading(provider)
    const toastId = toast.loading(`Đang kết nối tài khoản ${provider === 'google' ? 'Google' : 'Facebook'}...`)

    setTimeout(async () => {
      // Tự động liên kết và đăng nhập bằng tài khoản khách hàng demo tiện lợi
      const result = await login({
        email: 'khachhang@fooddelivery.vn',
        password: 'password123',
      })
      toast.dismiss(toastId)
      setSocialLoading(null)

      if (result.success) {
        toast.success(`Đăng nhập thành công với ${provider === 'google' ? 'Google' : 'Facebook'}! 🎉`)
        handleLoginSuccess(result)
      } else {
        toast.error(`Không thể kết nối ${provider}. Vui lòng thử lại.`)
      }
    }, 900)
  }

  const handleDemoFill = (role) => {
    if (role === 'customer') {
      setFormData((prev) => ({
        ...prev,
        email: 'khachhang@fooddelivery.vn',
        password: 'password123',
      }))
      toast('Đã điền tài khoản Khách hàng mẫu', { icon: '👤' })
    } else if (role === 'owner') {
      setFormData((prev) => ({
        ...prev,
        email: 'chuquan@fooddelivery.vn',
        password: 'password123',
      }))
      toast('Đã điền tài khoản Chủ quán mẫu', { icon: '🍳' })
    } else if (role === 'shipper') {
      setFormData((prev) => ({
        ...prev,
        email: 'taixe@fooddelivery.vn',
        password: 'password123',
      }))
      toast('Đã điền tài khoản Tài xế mẫu', { icon: '🛵' })
    } else if (role === 'admin') {
      setFormData((prev) => ({
        ...prev,
        email: 'admin@fooddelivery.vn',
        password: 'password123',
      }))
      toast('Đã điền tài khoản Quản trị viên mẫu', { icon: '🛡️' })
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-gradient-to-br from-orange-50/70 via-slate-50 to-amber-50/50">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-orange-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left: Brand Showcase & Interactive Floating Cards */}
        <div className="hidden lg:flex lg:col-span-6 flex-col gap-6 pr-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-orange-200/80 shadow-xs text-xs font-bold text-orange-900 w-fit">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="w-2 h-2 rounded-full bg-primary -ml-4" />
            <span>Nền tảng giao món ngon chuẩn vị số #1</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black text-slate-900 leading-[1.18] tracking-tight">
            Thưởng thức món ngon <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-amber-500">
              nóng hổi tận cửa nhà
            </span>
          </h1>

          <p className="text-slate-600 text-base leading-relaxed max-w-lg">
            Hơn 1.200 quán ăn đặc sản, giao hàng siêu tốc 15 phút, ưu đãi mã giảm giá độc quyền mỗi ngày dành riêng cho bạn.
          </p>

          {/* Interactive Feature Cards */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/70 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Ưu đãi độc quyền mỗi ngày
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-primary border border-orange-200">
                    Giảm tới 50%
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tặng voucher freeship và giảm giá ngay trong lần đầu đặt món
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/70 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Giao nhanh tức thì
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    15-25 phút
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tài xế nhận đơn ngay lập tức, theo dõi lộ trình thời gian thực
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof / Stats */}
          <div className="flex items-center gap-6 pt-3 border-t border-slate-200/80">
            <div>
              <p className="text-xl font-black text-slate-900">50K+</p>
              <p className="text-xs text-slate-500 font-medium">Khách hàng tin dùng</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-xl font-black text-slate-900">1.200+</p>
              <p className="text-xs text-slate-500 font-medium">Quán ăn đối tác</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700">4.9/5</span>
            </div>
          </div>
        </div>

        {/* Right: Glassmorphism Login Card */}
        <div className="lg:col-span-6">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-orange-500/10 border border-white/80 overflow-hidden transition-all duration-300 hover:shadow-orange-500/15">
            {/* Header Tabs: Đăng nhập / Đăng ký */}
            <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-100/60 p-1.5 gap-1.5">
              <button
                type="button"
                className="py-2.5 text-sm font-bold text-primary bg-white rounded-2xl shadow-sm cursor-default flex items-center justify-center gap-1.5"
                disabled
              >
                <span>🔑</span> Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>📝</span> Đăng ký tài khoản
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {/* If user was redirected from a dish, show helpful note */}
              {pendingDish && (
                <div className="mb-5 p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-slate-800 flex items-center gap-3 animate-in fade-in">
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 shadow-xs">
                    <img src={pendingDish.image} alt={pendingDish.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Tiếp tục đặt món:
                    </p>
                    <p className="text-primary font-bold truncate">{pendingDish.name}</p>
                    <span className="text-slate-500">Đăng nhập tài khoản Khách hàng để hoàn tất đơn hàng</span>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Chào mừng trở lại!
                  <span className="inline-block animate-bounce text-2xl">👋</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Đăng nhập để đặt món, quản lý đơn hàng hoặc điều hành gian hàng của bạn.
                </p>
              </div>

              {/* Quick Demo Credentials */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-50/70 via-slate-50 to-amber-50/70 border border-dashed border-orange-200/80 mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    Đăng nhập nhanh (Chọn vai trò để tự điền test):
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('customer')}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-xs hover:scale-[1.02] truncate"
                    title="Khách hàng (Người mua)"
                  >
                    👤 Khách hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('owner')}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-xs hover:scale-[1.02] truncate"
                    title="Nhà hàng (Chủ quán)"
                  >
                    🍳 Quán ăn
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('shipper')}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs hover:scale-[1.02] truncate"
                    title="Tài xế giao hàng"
                  >
                    🛵 Tài xế
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoFill('admin')}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-xs hover:scale-[1.02] truncate"
                    title="Quản trị viên (Admin)"
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="login-email">
                    Địa chỉ Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="login-password">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-2.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 accent-primary"
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-bold text-primary hover:text-primary-hover hover:underline transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xác thực...
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider: Hoặc đăng nhập với */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/90" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3.5 text-slate-400 font-bold tracking-wider">
                    Hoặc đăng nhập với
                  </span>
                </div>
              </div>

              {/* ⚡ Cụm 2 Nút Đăng nhập Mạng xã hội: Có khung viền ngoài bo tròn + từng nút có viền đậm sắc nét */}
              <div className="p-3.5 sm:p-4 rounded-3xl border-2 border-slate-200/90 bg-slate-50/60 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nút Đăng nhập Google */}
                  <button
                    type="button"
                    id="login-google-btn"
                    onClick={() => handleSocialLogin('google')}
                    disabled={!!socialLoading || loading}
                    className="group relative flex items-center justify-center gap-3 px-5 py-3 rounded-full border-2 border-slate-300 hover:border-red-500 bg-white hover:bg-red-50 text-slate-800 hover:text-red-600 text-xs sm:text-sm font-bold shadow-sm hover:shadow-md hover:shadow-red-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60"
                    title="Đăng nhập nhanh bằng tài khoản Google"
                  >
                    {socialLoading === 'google' ? (
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Google</span>
                  </button>

                  {/* Nút Đăng nhập Facebook */}
                  <button
                    type="button"
                    id="login-facebook-btn"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={!!socialLoading || loading}
                    className="group relative flex items-center justify-center gap-3 px-5 py-3 rounded-full border-2 border-slate-300 hover:border-[#1877F2] bg-white hover:bg-blue-50 text-slate-800 hover:text-[#1877F2] text-xs sm:text-sm font-bold shadow-sm hover:shadow-md hover:shadow-blue-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60"
                    title="Đăng nhập nhanh bằng tài khoản Facebook"
                  >
                    {socialLoading === 'facebook' ? (
                      <div className="w-5 h-5 border-2 border-[#1877F2] border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0 text-[#1877F2] transition-transform duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    )}
                    <span>Facebook</span>
                  </button>
                </div>
              </div>

              {/* Bottom Register Redirect */}
              <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
                Chưa có tài khoản?{' '}
                <Link to="/register" className="font-bold text-primary hover:underline inline-flex items-center gap-0.5">
                  Đăng ký ngay ➔
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Quên Mật Khẩu */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={formData.email}
        onSuccess={(resetEmail, newPass) => {
          setFormData((prev) => ({
            ...prev,
            email: resetEmail,
            password: newPass,
          }))
          toast.success('Đã tự động điền thông tin mới. Bạn có thể bấm Đăng nhập ngay!')
        }}
      />
    </div>
  )
}
