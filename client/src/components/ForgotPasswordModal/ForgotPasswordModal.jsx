import { useState, useEffect } from 'react'
import {
  Mail,
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  X,
  Sparkles,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import authApi from '../../api/authApi.js'

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '', onSuccess }) {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpDemo, setOtpDemo] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '')
      setStep(1)
      setOtp('')
      setOtpDemo('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setCountdown(0)
    }
  }, [isOpen, initialEmail])

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  if (!isOpen) return null

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      toast.error('Vui lòng nhập email đăng ký tài khoản của bạn.')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.forgotPassword(normalizedEmail)
      setLoading(false)

      toast.success(response.message || 'Mã xác thực OTP đã được gửi thành công!')
      if (response.data?.otpDemo) {
        setOtpDemo(response.data.otpDemo)
      }
      setStep(2)
      setCountdown(60)
    } catch (err) {
      setLoading(false)
      const errorMsg =
        err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.'
      toast.error(errorMsg)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    const cleanOtp = otp.trim()
    if (cleanOtp.length !== 6) {
      toast.error('Mã OTP phải gồm đúng 6 chữ số.')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
        newPassword,
      })
      setLoading(false)

      toast.success(response.message || 'Đặt lại mật khẩu thành công!')
      setStep(3)

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(email.trim().toLowerCase(), newPassword)
        }
        onClose()
      }, 1500)
    } catch (err) {
      setLoading(false)
      const errorMsg =
        err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.'
      toast.error(errorMsg)
    }
  }

  const handleFillDemoEmail = (demoEmail) => {
    setEmail(demoEmail)
    toast('Đã điền email mẫu', { icon: '✉️' })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-primary flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Quên mật khẩu</h3>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? 'Bước 1: Nhập email tài khoản'
                  : step === 2
                  ? 'Bước 2: Xác thực OTP & Đặt mật khẩu mới'
                  : 'Hoàn tất khôi phục'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* STEP 1: ENTER EMAIL */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhập địa chỉ email đăng ký tài khoản của bạn. Hệ thống sẽ gửi mã xác thực gồm 6 chữ số
                để giúp bạn cấp lại mật khẩu mới an toàn.
              </p>

              {/* Quick Demo Fill Buttons */}
              <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-100 space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Chọn nhanh tài khoản kiểm thử:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillDemoEmail('khachhang@fooddelivery.vn')}
                    className="px-2 py-1 rounded-lg bg-white border border-orange-200 text-slate-700 hover:border-primary text-[11px] font-medium transition-colors"
                  >
                    Khách hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillDemoEmail('chuquan@fooddelivery.vn')}
                    className="px-2 py-1 rounded-lg bg-white border border-orange-200 text-slate-700 hover:border-primary text-[11px] font-medium transition-colors"
                  >
                    Chủ quán
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillDemoEmail('taixe@fooddelivery.vn')}
                    className="px-2 py-1 rounded-lg bg-white border border-orange-200 text-slate-700 hover:border-primary text-[11px] font-medium transition-colors"
                  >
                    Tài xế
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="forgot-email">
                  Email đăng ký tài khoản <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang gửi mã...
                    </>
                  ) : (
                    'Gửi mã xác thực OTP'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER OTP & NEW PASSWORD */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <p className="text-slate-600">
                  Mã OTP đã được gửi đến:{' '}
                  <span className="font-bold text-slate-900">{email}</span>
                </p>
                {otpDemo && (
                  <div className="mt-1 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Mã OTP kiểm thử:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtp(otpDemo)}
                      className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 font-mono font-bold text-xs transition-colors"
                      title="Bấm để tự điền mã OTP này"
                    >
                      {otpDemo} (Bấm điền)
                    </button>
                  </div>
                )}
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="forgot-otp">
                  Mã xác thực OTP (6 chữ số) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-widest text-base font-bold"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="forgot-new-pass">
                  Mật khẩu mới <span className="text-red-500">* (Ít nhất 6 ký tự)</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-new-pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="forgot-confirm-pass">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-confirm-pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Đổi email khác
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  disabled={countdown > 0 || loading}
                  className="text-primary hover:underline font-bold disabled:text-slate-400 disabled:no-underline transition-colors flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {countdown > 0 ? `Gửi lại mã sau (${countdown}s)` : 'Gửi lại mã OTP'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang cập nhật mật khẩu...
                  </>
                ) : (
                  'Xác nhận đặt lại mật khẩu'
                )}
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && (
            <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Đặt lại mật khẩu thành công! 🎉</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Mật khẩu của tài khoản <span className="font-bold text-slate-800">{email}</span> đã
                được thay đổi. Đang tự động điền thông tin đăng nhập cho bạn...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
