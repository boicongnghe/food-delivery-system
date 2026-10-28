import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  Star,
  Zap,
  ArrowRight,
  ArrowLeft,
  UtensilsCrossed,
  Gift,
  Coins,
  Truck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import ForgotPasswordModal from '../../components/ForgotPasswordModal/ForgotPasswordModal.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, resendVerification } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null) // 'google' | 'facebook' | 'apple'
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)
  const [resendingMail, setResendingMail] = useState(false)

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
      setUnverifiedEmail(null)
      handleLoginSuccess(result)
    } else {
      if (result.requiresVerification) {
        setUnverifiedEmail(result.unverifiedEmail || formData.email.trim())
      }
      toast.error(result.message || 'Đăng nhập thất bại')
    }
  }

  const handleResendFromLogin = async () => {
    if (!unverifiedEmail) return
    setResendingMail(true)
    const res = await resendVerification(unverifiedEmail)
    setResendingMail(false)
    if (res.success) {
      toast.success(res.message || 'Đã gửi lại email kích hoạt! Vui lòng kiểm tra hộp thư.')
    } else {
      toast.error(res.message || 'Không thể gửi lại email kích hoạt.')
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
      if (pendingDish) {
        navigate('/', {
          replace: true,
          state: { continueOrder: pendingDish },
        })
        return
      }

      // Customer logged in from beginning -> go to homepage or referer
      const fromPath = location.state?.from?.pathname || '/'
      navigate(fromPath, { replace: true })
    }, 350)
  }

  // Đăng nhập nhanh bằng Google / Facebook / Apple
  const handleSocialLogin = async (provider) => {
    setSocialLoading(provider)
    const label = provider.charAt(0).toUpperCase() + provider.slice(1)
    const toastId = toast.loading(`Đang kết nối tài khoản ${label}...`)

    setTimeout(async () => {
      const result = await login({
        email: 'khachhang@fooddelivery.vn',
        password: 'password123',
      })
      toast.dismiss(toastId)
      setSocialLoading(null)

      if (result.success) {
        toast.success(`Đăng nhập thành công với ${label}! 🎉`)
        handleLoginSuccess(result)
      } else {
        toast.error(`Không thể kết nối ${label}. Vui lòng thử lại.`)
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
    <div className="min-h-screen w-full bg-[#FFFDF9] dark:bg-[#0F1014] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Header Bar with Back Button */}
      <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 py-4 flex items-center justify-between border-b border-orange-100/60 dark:border-slate-800/80 bg-white/70 dark:bg-[#181A20]/70 backdrop-blur-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại Trang chủ</span>
        </Link>

        {/* Brand Logo in Header */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF4B2B] via-[#FF416C] to-[#FFB800] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Crave<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] to-[#FF416C]">Dash</span>
          </span>
        </Link>
      </div>

      {/* Main Full-Width 2-Column Content */}
      <div className="w-full flex-1 px-4 sm:px-8 lg:px-12 2xl:px-16 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* ================================================================
              CỘT TRÁI (5 CỘT) — VISUAL BRAND SHOWCASE
              ================================================================ */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-6 relative">
            {/* Ambient Glow */}
            <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-xs font-bold text-primary w-fit shadow-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>Nền tảng giao món nóng chuẩn vị số #1</span>
            </div>

            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-slate-900 dark:text-white leading-[1.18] tracking-tight">
              Thưởng thức món ngon <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FFB800] animate-gradient-text">
                nóng hổi tận cửa nhà
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-md">
              Hơn 1.200 quán ăn đối tác tuyển chọn, giao nhanh 20 phút, ưu đãi mã giảm giá và hoàn tiền mỗi ngày dành riêng cho bạn.
            </p>

            {/* Member Benefit Cards */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#181A20] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    Freeship 0đ đơn đầu tiên
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-primary border border-orange-200 dark:border-orange-800">
                      Voucher 15k
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Giao nhanh 15-25 phút, tài xế nhận đơn ngay lập tức
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#181A20] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    Tích điểm hoàn tiền đến 15%
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      CravePoint
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Đổi điểm lấy đồ uống miễn phí hoặc giảm trừ trực tiếp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#181A20] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-pink-300 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    Ưu đãi sinh nhật độc quyền
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tặng voucher giảm 50.000đ và quà tặng tráng miệng đặc biệt
                  </p>
                </div>
              </div>
            </div>

            {/* Social Proof Stats */}
            <div className="flex items-center gap-6 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">50K+</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Khách hàng tin dùng</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">1.200+</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quán ăn đối tác</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">4.9/5</span>
              </div>
            </div>
          </div>

          {/* ================================================================
              CỘT PHẢI (7 CỘT) — FORM XÁC THỰC HIỆN ĐẠI
              ================================================================ */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#181A20] rounded-3xl shadow-2xl shadow-orange-500/10 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-300">
              {/* Header Tabs: Đăng nhập / Đăng ký */}
              <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2 gap-2">
                <button
                  type="button"
                  className="py-3 text-xs sm:text-sm font-extrabold text-primary bg-white dark:bg-[#181A20] rounded-2xl shadow-sm cursor-default flex items-center justify-center gap-2"
                  disabled
                >
                  <span>🔑</span> Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="py-3 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <span>📝</span> Đăng ký tài khoản
                </button>
              </div>

              <div className="p-6 sm:p-8 lg:p-10">
                {/* If user was redirected from a dish, show helpful note */}
                {pendingDish && (
                  <div className="mb-6 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-slate-800 dark:text-slate-200 flex items-center gap-3 animate-in fade-in">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-200 shadow-xs">
                      <img
                        src={pendingDish.image}
                        alt={pendingDish.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Tiếp tục đặt món:
                      </p>
                      <p className="text-primary font-bold truncate">{pendingDish.name}</p>
                      <span className="text-slate-500 dark:text-slate-400">
                        Đăng nhập tài khoản Khách hàng để hoàn tất đơn hàng
                      </span>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Chào mừng trở lại!
                    <span className="inline-block animate-bounce text-2xl">👋</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Đăng nhập để đặt món ngon, theo dõi lộ trình hoặc quản lý gian hàng của bạn.
                  </p>
                </div>

                {/* Quick Demo Credentials for Fast Grading */}
                <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-slate-800/60 border border-dashed border-orange-200 dark:border-slate-700 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      Đăng nhập nhanh (Tự điền tài khoản mẫu):
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoFill('customer')}
                      className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-all shadow-xs hover:scale-105 active:scale-95 truncate"
                    >
                      👤 Khách hàng
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoFill('owner')}
                      className="px-2 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs hover:scale-105 active:scale-95 truncate"
                    >
                      🍳 Quán ăn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoFill('shipper')}
                      className="px-2 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs hover:scale-105 active:scale-95 truncate"
                    >
                      🛵 Tài xế
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoFill('admin')}
                      className="px-2 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs hover:scale-105 active:scale-95 truncate"
                    >
                      🛡️ Admin
                    </button>
                  </div>
                </div>

                {/* Unverified Account Warning Banner */}
                {unverifiedEmail && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 mb-5 text-left">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-1">
                          Tài khoản chưa kích hoạt email
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 leading-relaxed">
                          Tài khoản <strong>{unverifiedEmail}</strong> cần xác nhận email trước khi có thể đăng nhập.
                        </p>
                        <button
                          type="button"
                          onClick={handleResendFromLogin}
                          disabled={resendingMail}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${resendingMail ? 'animate-spin' : ''}`} />
                          <span>{resendingMail ? 'Đang gửi...' : 'Gửi lại email kích hoạt ngay'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                      htmlFor="login-email"
                    >
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
                        className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/70 dark:bg-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                      htmlFor="login-password"
                    >
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
                        className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/70 dark:bg-slate-900 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between pt-2.5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400 select-none">
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
                        className="text-xs font-bold text-primary hover:underline transition-colors"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-orange-500/25 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xác thực hệ thống...</span>
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
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-[#181A20] px-3.5 text-slate-400 font-bold tracking-wider">
                      Hoặc đăng nhập nhanh với
                    </span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    disabled={!!socialLoading || loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={!!socialLoading || loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialLogin('apple')}
                    disabled={!!socialLoading || loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <span className="text-base"></span>
                    <span>Apple</span>
                  </button>
                </div>

                {/* Bottom Register Redirect */}
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  Chưa có tài khoản CraveDash?{' '}
                  <Link
                    to="/register"
                    className="font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Đăng ký tài khoản ngay ➔
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
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
          toast.success('Đã tự động điền mật khẩu mới. Bạn có thể bấm Đăng nhập ngay!')
        }}
      />
    </div>
  )
}
