import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Clock, Sparkles, ShoppingBag } from 'lucide-react'
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
      const userRole = result.user?.role
      toast.success(result.message || 'Đăng nhập thành công!')

      setTimeout(() => {
        // Direct according to user role requirements:
        // 1. Admin -> only goes to /admin
        if (userRole === 'admin') {
          navigate('/admin', { replace: true })
          return
        }

        // 2. Restaurant Owner -> goes to /restaurant
        if (userRole === 'restaurant_owner') {
          navigate('/restaurant', { replace: true })
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
    } else {
      toast.error(result.message || 'Đăng nhập thất bại')
    }
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Brand Showcase */}
        <div className="hidden lg:flex flex-col gap-6 pr-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-bold text-slate-800 w-fit">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Nền tảng giao đồ ăn đa vai trò
          </div>

          <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
            Thưởng thức món ngon <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">
              nóng hổi tận nơi
            </span>
          </h1>

          <p className="text-slate-600 text-base leading-relaxed">
            Hàng ngàn nhà hàng uy tín, giao hàng siêu tốc 15 phút, ưu đãi mỗi ngày dành riêng cho bạn.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Ưu đãi độc quyền</h4>
                <p className="text-xs text-slate-500">Giảm đến 50% cho đơn hàng đầu tiên của bạn</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Giao nhanh tức thì</h4>
                <p className="text-xs text-slate-500">Tài xế nhận đơn và giao trong 15-25 phút</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1.5">
            <button
              type="button"
              className="py-2.5 text-sm font-bold text-primary bg-white rounded-2xl shadow-sm cursor-default"
              disabled
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-2xl transition-colors"
            >
              Đăng ký
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* If user was redirected from a dish, show helpful note */}
            {pendingDish && (
              <div className="mb-5 p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
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
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Chào mừng trở lại! 👋</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Nhập email và mật khẩu. Hệ thống sẽ tự động nhận diện vai trò tài khoản để điều hướng tới đúng trang.
              </p>
            </div>

            {/* Quick Demo Credentials */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 mb-6">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                ⚡ Tài khoản có sẵn (Bấm để tự điền nhanh Email & Mật khẩu test):
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Hệ thống tự động biết vai trò tương ứng khi đăng nhập.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('customer')}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors truncate"
                  title="Khách hàng (Người mua)"
                >
                  👤 Khách hàng
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('owner')}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors truncate"
                  title="Nhà hàng (Chủ quán)"
                >
                  🍳 Quán ăn
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('shipper')}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors truncate"
                  title="Tài xế giao hàng"
                >
                  🛵 Tài xế
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin')}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors truncate"
                  title="Quản trị viên (Admin)"
                >
                  🛡️ Admin
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="login-email">
                  Email
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
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="login-password">
                  Mật khẩu
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
                    className="w-full pl-11 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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

                {/* Vị trí dưới ô nhập mật khẩu: Ghi nhớ đăng nhập & Quên mật khẩu */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    Ghi nhớ đăng nhập
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xử lý...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 mt-6">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-bold text-primary hover:underline">
                Đăng ký ngay
              </Link>
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
