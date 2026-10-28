import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  MailCheck,
  RefreshCw,
  ArrowRight,
  Home,
  Mail,
  Loader2,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyEmail, resendVerification } = useAuth()

  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error' | 'no-token'
  const [errorMessage, setErrorMessage] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!token) {
      setStatus('no-token')
      return
    }

    let isMounted = true

    const executeVerification = async () => {
      setStatus('loading')
      const result = await verifyEmail(token)

      if (!isMounted) return

      if (result.success) {
        setStatus('success')
        toast.success(result.message || 'Kích hoạt tài khoản thành công!')
      } else {
        setStatus('error')
        setErrorMessage(
          result.message ||
            'Liên kết kích hoạt không hợp lệ hoặc đã hết thời hạn 24 giờ.'
        )
      }
    }

    executeVerification()

    return () => {
      isMounted = false
    }
  }, [token])

  // Tự động chuyển hướng khi xác thực thành công sau 5 giây
  useEffect(() => {
    if (status !== 'success') return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, navigate])

  const handleResend = async (e) => {
    e.preventDefault()
    const cleanEmail = resendEmail.trim().toLowerCase()

    if (!cleanEmail) {
      toast.error('Vui lòng nhập địa chỉ email của bạn.')
      return
    }

    setResending(true)
    const result = await resendVerification(cleanEmail)
    setResending(false)

    if (result.success) {
      setResendSuccess(true)
      toast.success(
        result.message || 'Đã gửi lại email kích hoạt. Vui lòng kiểm tra hộp thư!'
      )
    } else {
      toast.error(result.message || 'Không thể gửi email kích hoạt. Vui lòng thử lại.')
    }
  }

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-[#181A20] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-8 sm:p-10 relative overflow-hidden backdrop-blur-xl">
        
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-gradient-to-tr from-amber-400/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* ======================= CASE 1: LOADING ======================= */}
        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-orange-500 mb-6 shadow-inner animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Đang xác thực tài khoản...
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Hệ thống đang kiểm tra mã xác nhận trong liên kết của bạn. Quá trình này chỉ mất vài giây...
            </p>
          </div>
        )}

        {/* ======================= CASE 2: SUCCESS ======================= */}
        {status === 'success' && (
          <div className="text-center py-6">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="w-11 h-11" />
              </div>
              <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4 fill-white" />
              </span>
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              Kích hoạt thành công
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              Chào mừng bạn đến với CraveDash! 🎉
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
              Email của bạn đã được xác thực thành công. Tài khoản của bạn hiện đã sẵn sàng để bắt đầu đặt món ngon nóng hổi hoặc sử dụng các tính năng đối tác!
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 mb-6 flex items-center justify-center gap-2">
              <span>Tự động chuyển về Trang chủ sau</span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs">
                {countdown}
              </span>
              <span>giây</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/"
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white font-bold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Vào Trang Chủ Ngay</span>
              </Link>
            </div>
          </div>
        )}

        {/* ======================= CASE 3: ERROR / EXPIRED ======================= */}
        {(status === 'error' || status === 'no-token') && (
          <div className="text-center py-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-500 mb-6 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-3">
              {status === 'no-token' ? 'Thiếu mã xác nhận' : 'Xác thực thất bại'}
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {status === 'no-token'
                ? 'Không tìm thấy liên kết hợp lệ'
                : 'Liên kết không hợp lệ hoặc đã hết hạn'}
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
              {errorMessage ||
                'Đường link xác nhận trong email có thể đã quá hạn 24 giờ hoặc đã được sử dụng. Đừng lo, bạn có thể yêu cầu gửi lại email mới bên dưới.'}
            </p>

            {/* Resend Verification Form */}
            <div className="text-left p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <MailCheck className="w-4 h-4 text-orange-500" />
                <span>Gửi lại email kích hoạt</span>
              </h4>

              {resendSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                  ✅ <strong>Đã gửi email mới!</strong> Vui lòng kiểm tra hòm thư của bạn (kể cả mục Thư rác / Spam) để bấm kích hoạt.
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3 mt-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Nhập email tài khoản của bạn..."
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#121316] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resending}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider hover:bg-orange-500 dark:hover:bg-orange-500 dark:hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi lại...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Gửi lại email kích hoạt</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <Link
                to="/login"
                className="text-slate-500 hover:text-orange-500 font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Trang Đăng Nhập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/"
                className="text-slate-500 hover:text-orange-500 font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Trang Chủ</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
