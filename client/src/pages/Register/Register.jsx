import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    agreeTerms: true,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' }
    let score = 0
    if (pass.length >= 6) score += 1
    if (pass.length >= 8) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1

    if (score <= 2) return { score: 1, text: 'Mật khẩu yếu', color: 'bg-red-500' }
    if (score <= 3) return { score: 2, text: 'Mật khẩu trung bình', color: 'bg-amber-500' }
    return { score: 3, text: 'Mật khẩu mạnh', color: 'bg-emerald-500' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên.')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Vui lòng nhập email.')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp.')
      return
    }

    if (!formData.agreeTerms) {
      toast.error('Bạn cần đồng ý với Điều khoản dịch vụ.')
      return
    }

    setLoading(true)
    const result = await register({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      role: formData.role,
    })
    setLoading(false)

    if (result.success) {
      toast.success(result.message || 'Đăng ký thành công!')
      setTimeout(() => {
        if (formData.role === 'restaurant_owner') {
          navigate('/restaurant', { replace: true })
        } else if (formData.role === 'shipper') {
          navigate('/shipper', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }, 500)
    } else {
      toast.error(result.message || 'Đăng ký thất bại')
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Tabs */}
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-2xl transition-colors"
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className="py-2.5 text-sm font-bold text-primary bg-white rounded-2xl shadow-sm cursor-default"
            disabled
          >
            Đăng ký
          </button>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tạo tài khoản mới 🚀</h2>
            <p className="text-sm text-slate-500 mt-1">Gia nhập cộng đồng ẩm thực tiện lợi ngay hôm nay</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Bạn tham gia với tư cách nào?</label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'customer', title: 'Khách hàng', icon: '👤' },
                  { id: 'restaurant_owner', title: 'Quán ăn', icon: '🍳' },
                  { id: 'shipper', title: 'Tài xế', icon: '🛵' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`cursor-pointer flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      formData.role === item.id
                        ? 'border-primary bg-orange-50/50 text-primary font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={item.id}
                      checked={formData.role === item.id}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-xl mb-1">{item.icon}</span>
                    <span className="text-xs">{item.title}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="reg-name">
                Họ và tên
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-name"
                  type="text"
                  name="fullName"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="reg-email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-email"
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="reg-phone">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-phone"
                    type="tel"
                    name="phone"
                    placeholder="0912 345 678"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="reg-password">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Ít nhất 6 ký tự"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="reg-confirm">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password strength bar */}
            {formData.password && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Độ bảo mật mật khẩu</span>
                  <span>{passwordStrength.text}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'} flex-1`}></div>
                  <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'} flex-1`}></div>
                  <div className={`h-full rounded-full transition-all ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'} flex-1`}></div>
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-primary focus:ring-primary/20"
                />
                Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang khởi tạo tài khoản...
                </>
              ) : (
                'Đăng ký tài khoản'
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
