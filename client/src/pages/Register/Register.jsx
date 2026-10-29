import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Store,
  UtensilsCrossed,
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  Bike,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Truck,
  Coins,
  Star,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
  Image as ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'

// Authentic minimal 1-page blank PDF in Base64 for fast demo testing
const SAMPLE_PDF_BASE64 =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmo8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1NiAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTc4CiUlRU9GCg=='

const SUGGESTED_ITEMS = [
  '🍚 Cơm tấm / Cơm trưa',
  '🍜 Bún bò, Phở, Hủ tiếu',
  '🧋 Trà sữa & Đồ uống',
  '🍔 Đồ ăn nhanh & Gà rán',
  '☕ Cà phê rang xay',
  '🥗 Món chay & Thực dưỡng',
  '🍰 Bánh ngọt & Tráng miệng',
  '🍲 Lẩu & Nướng mang về',
]

export default function Register() {
  const navigate = useNavigate()
  const { register, resendVerification } = useAuth()
  const pdfInputRef = useRef(null)

  const [registeredData, setRegisteredData] = useState(null)
  const [resending, setResending] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: Thông tin cơ bản, 2: Thông tin đối tác & giấy tờ

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer', // 'customer' | 'restaurant_owner' | 'shipper'
    agreeTerms: true,

    // Nhà Hàng
    restaurantName: '',
    restaurantAddress: '',
    businessItems: '',
    ownerCitizenId: '',
    businessLicense: null,

    // Tài Xế
    dateOfBirth: '',
    driverCitizenId: '',
    vehicleInfo: '',
    insuranceSubmitLater: true,
    insuranceInfo: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'role' && value === 'customer') {
      setCurrentStep(1)
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleToggleTag = (tag) => {
    const cleanTag = tag.replace(/^[^\s]+\s/, '')
    const current = formData.businessItems
      ? formData.businessItems.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    let next
    if (current.includes(cleanTag)) {
      next = current.filter((s) => s !== cleanTag)
    } else {
      next = [...current, cleanTag]
    }

    setFormData((prev) => ({
      ...prev,
      businessItems: next.join(', '),
    }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    if (!isImage && !isPdf) {
      toast.error('Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP) hoặc file PDF (.pdf)!')
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Dung lượng tệp vượt quá giới hạn 3MB. Vui lòng chọn file nhỏ gọn hơn hoặc nén ảnh/PDF.')
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        businessLicense: {
          fileName: file.name,
          fileSize: file.size,
          fileType: isImage ? 'image' : 'pdf',
          fileData: reader.result,
          uploadedAt: new Date().toISOString(),
        },
      }))
      toast.success(`Đã tải lên tệp: ${file.name}`)
    }
    reader.onerror = () => {
      toast.error('Không thể đọc tệp. Vui lòng thử lại!')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, businessLicense: null }))
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    toast('Đã gỡ tệp Giấy phép kinh doanh', { icon: '🗑️' })
  }

  const handlePreviewFile = () => {
    if (!formData.businessLicense?.fileData) return
    const dataUri = formData.businessLicense.fileData
    const isImg =
      formData.businessLicense.fileType === 'image' ||
      dataUri.startsWith('data:image/') ||
      /\.(jpe?g|png|webp)$/i.test(formData.businessLicense.fileName)

    try {
      const win = window.open('')
      if (win) {
        if (isImg) {
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Xem trước: ${formData.businessLicense.fileName}</title>
                <style>
                  body { margin: 0; padding: 24px; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; font-family: sans-serif; }
                  img { max-width: 95%; max-height: 90vh; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${dataUri}" alt="Giấy phép kinh doanh" />
              </body>
            </html>
          `)
        } else {
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Xem trước: ${formData.businessLicense.fileName}</title>
                <style>
                  body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #1e293b; }
                  iframe { width: 100%; height: 100%; border: none; }
                </style>
              </head>
              <body>
                <iframe src="${dataUri}"></iframe>
              </body>
            </html>
          `)
        }
      } else {
        toast.error('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép để xem trước tệp!')
      }
    } catch {
      toast.error('Không thể mở xem trước tệp.')
    }
  }

  const calculateAge = (dobString) => {
    if (!dobString) return null
    const dob = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
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
  const hasConfirmPassword = formData.confirmPassword.length > 0
  const isPasswordMismatch = hasConfirmPassword && formData.password !== formData.confirmPassword
  const isPasswordMatch = hasConfirmPassword && formData.password === formData.confirmPassword

  const handleQuickFill = (targetRole) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)

    if (targetRole === 'restaurant_owner') {
      setCurrentStep(1)
      setFormData((prev) => ({
        ...prev,
        fullName: 'Võ Thị Bích Thảo',
        email: `nhahang.${randomSuffix}@fooddelivery.vn`,
        phone: '0938556677',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'restaurant_owner',
        agreeTerms: true,
        restaurantName: 'Bếp Cơm Niêu & Trà Thảo Mộc Sài Gòn',
        restaurantAddress: 'Số 128 Đường Hai Bà Trưng, Phường Đa Kao, Quận 1, TP.HCM',
        businessItems: 'Cơm niêu cá kho tộ, Cơm tấm sườn nướng, Canh chua, Trà thảo mộc',
        ownerCitizenId: '079198005432',
        businessLicense: {
          fileName: 'Giay_Phep_Kinh_Doanh_BepComNieu.pdf',
          fileSize: 524288,
          fileData: SAMPLE_PDF_BASE64,
          uploadedAt: new Date().toISOString(),
        },
      }))
      toast.success('Đã điền đầy đủ thông tin Quán Ăn & file PDF mẫu!')
    } else if (targetRole === 'shipper') {
      setCurrentStep(1)
      setFormData((prev) => ({
        ...prev,
        fullName: 'Hoàng Minh Đức',
        email: `taixe.${randomSuffix}@fooddelivery.vn`,
        phone: '0977889911',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'shipper',
        agreeTerms: true,
        dateOfBirth: '2001-08-15',
        driverCitizenId: '079201009876',
        vehicleInfo: 'Honda Air Blade 150cc - Biển số: 59-V2 678.90 (Có Cà vẹt chính chủ)',
        insuranceSubmitLater: true,
        insuranceInfo: '',
      }))
      toast.success('Đã điền thông tin Tài Xế mẫu (Bảo hiểm chọn nộp sau)!')
    } else {
      setCurrentStep(1)
      setFormData((prev) => ({
        ...prev,
        fullName: 'Lê Thu Hương',
        email: `khachhang.${randomSuffix}@fooddelivery.vn`,
        phone: '0912345678',
        password: 'password123',
        confirmPassword: 'password123',
        role: 'customer',
        agreeTerms: true,
      }))
      toast.success('Đã điền thông tin Khách Hàng mẫu!')
    }
  }

  // Xác thực sơ bộ Bước 1: Tài khoản cơ bản
  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên.')
      return false
    }

    if (!formData.email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Địa chỉ email không đúng định dạng.')
      return false
    }

    const cleanPhone = formData.phone.trim().replace(/[\s.-]/g, '')
    if (!cleanPhone) {
      toast.error('Vui lòng nhập số điện thoại liên hệ.')
      return false
    }

    const phoneRegex = /^(0|\+84)[0-9]{9}$/
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Số điện thoại không hợp lệ (gồm 10 số, ví dụ: 0912345678).')
      return false
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.')
      return false
    }

    return true
  }

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2)
      // Cuộn mượt lên đầu khung đăng ký để người dùng thuận tiện nhập tiếp
      window.scrollTo({ top: 180, behavior: 'smooth' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateStep1()) {
      if (formData.role !== 'customer') {
        setCurrentStep(1)
      }
      return
    }

    // Nếu đang ở Bước 1 của vai trò Quán ăn hoặc Tài xế, chuyển sang Bước 2
    if (formData.role !== 'customer' && currentStep === 1) {
      handleNextStep()
      return
    }

    if (!formData.agreeTerms) {
      toast.error('Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách.')
      return
    }

    const cleanPhone = formData.phone.trim().replace(/[\s.-]/g, '')
    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: cleanPhone,
      password: formData.password,
      role: formData.role,
    }

    if (formData.role === 'restaurant_owner') {
      if (!formData.restaurantName.trim()) {
        toast.error('Vui lòng nhập tên nhà hàng / quán ăn.')
        return
      }
      if (!formData.restaurantAddress.trim()) {
        toast.error('Vui lòng nhập địa chỉ cụ thể của nhà hàng.')
        return
      }
      if (!formData.businessItems.trim()) {
        toast.error('Vui lòng cho biết nhà hàng muốn bán sản phẩm / món ăn gì.')
        return
      }
      if (!/^[0-9]{9,12}$/.test(formData.ownerCitizenId.trim())) {
        toast.error('Số CCCD của chủ quán phải gồm từ 9 đến 12 chữ số hợp lệ.')
        return
      }
      if (!formData.businessLicense || !formData.businessLicense.fileData) {
        toast.error('Bắt buộc phải tải lên hình ảnh hoặc file PDF Giấy phép kinh doanh của nhà hàng.')
        return
      }

      payload.restaurantDetails = {
        restaurantName: formData.restaurantName.trim(),
        restaurantAddress: formData.restaurantAddress.trim(),
        businessItems: formData.businessItems.trim(),
        ownerCitizenId: formData.ownerCitizenId.trim(),
        businessLicense: formData.businessLicense,
      }
    } else if (formData.role === 'shipper') {
      if (!formData.dateOfBirth) {
        toast.error('Vui lòng chọn ngày tháng năm sinh của tài xế.')
        return
      }
      const age = calculateAge(formData.dateOfBirth)
      if (age !== null && age < 18) {
        toast.error('Tài xế đối tác phải đủ từ 18 tuổi trở lên theo quy định.')
        return
      }
      if (!/^[0-9]{9,12}$/.test(formData.driverCitizenId.trim())) {
        toast.error('Số CCCD của tài xế phải gồm từ 9 đến 12 chữ số hợp lệ.')
        return
      }
      if (!formData.vehicleInfo.trim()) {
        toast.error('Vui lòng cung cấp thông tin giấy tờ xe / loại xe và biển số xe.')
        return
      }

      payload.shipperDetails = {
        dateOfBirth: formData.dateOfBirth,
        citizenId: formData.driverCitizenId.trim(),
        vehicleInfo: formData.vehicleInfo.trim(),
        vehicleInsurance: {
          hasInsurance: !formData.insuranceSubmitLater,
          submitLater: formData.insuranceSubmitLater,
          insuranceInfo: formData.insuranceInfo.trim(),
        },
      }
    }

    setLoading(true)
    const result = await register(payload)
    setLoading(false)

    if (result.success) {
      if (result.requiresVerification) {
        setRegisteredData({
          email: result.email || payload.email,
          fullName: result.fullName || payload.fullName,
          role: payload.role,
          verificationUrl: result.verificationUrl,
          isDevMode: result.isDevMode,
        })
        toast.success(
          result.message ||
            'Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.'
        )
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      toast.success(result.message || 'Đăng ký tài khoản thành công!')
      setTimeout(() => {
        if (formData.role === 'restaurant_owner') {
          navigate('/restaurant/profile', { replace: true })
        } else if (formData.role === 'shipper') {
          navigate('/shipper', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }, 500)
    } else {
      toast.error(
        result.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.'
      )
    }
  }

  const handleResendFromRegister = async () => {
    if (!registeredData?.email) return
    setResending(true)
    const res = await resendVerification(registeredData.email)
    setResending(false)
    if (res.success) {
      toast.success(res.message || 'Đã gửi lại email kích hoạt!')
      if (res.data?.verificationUrl) {
        setRegisteredData((prev) => ({
          ...prev,
          verificationUrl: res.data.verificationUrl,
        }))
      }
    } else {
      toast.error(res.message || 'Không thể gửi lại email. Vui lòng thử lại sau.')
    }
  }

  const shipperAge = calculateAge(formData.dateOfBirth)

  if (registeredData) {
    return (
      <div className="min-h-screen w-full bg-[#FFFDF9] dark:bg-[#0F1014] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white">
        {/* Verification Success Box */}
        <div className="w-full flex-1 px-4 sm:px-8 py-12 sm:py-16 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-[#181A20] rounded-3xl border border-orange-100 dark:border-slate-800 shadow-2xl p-8 sm:p-10 relative overflow-hidden text-center backdrop-blur-xl">
            {/* Ambient background decoration */}
            <div className="absolute -top-24 -right-24 w-52 h-52 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-gradient-to-tr from-amber-400/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Icon */}
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                <Mail className="w-10 h-10 animate-bounce" />
              </div>
              <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>

            <div className="inline-block px-3.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
              Gần hoàn tất đăng ký!
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Kiểm tra email của bạn 📩
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-4 leading-relaxed">
              Xin chào <strong>{registeredData.fullName}</strong>! Chúng tôi đã gửi một liên kết xác nhận kích hoạt tài khoản tới:
            </p>

            <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded-2xl font-bold text-orange-600 dark:text-orange-400 text-sm mb-6 select-all break-all shadow-inner">
              {registeredData.email}
            </div>

            <div className="text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2 mb-6">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Các bước tiếp theo:</span>
              </div>
              <p>1. Mở hòm thư của bạn và tìm thư từ <strong>FoodDelivery</strong>.</p>
              <p>2. Nhấp vào nút <strong>"Kích hoạt tài khoản ngay"</strong> để kích hoạt.</p>
              <p>3. Nếu không thấy trong Hộp thư đến, vui lòng kiểm tra thêm mục <strong>Thư rác / Spam</strong>.</p>
            </div>

            {/* Dev mode quick link helper */}
            {registeredData.verificationUrl && (
              <div className="p-3.5 mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                  <span>💡 [Chế độ thử nghiệm Dev Mode]</span>
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
                  Bạn có thể bấm vào nút dưới đây để xác thực ngay mà không cần mở mail thật:
                </p>
                <a
                  href={registeredData.verificationUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-3.5 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <span>Mở liên kết kích hoạt ngay ➔</span>
                </a>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendFromRegister}
                disabled={resending}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Đang gửi lại...' : 'Chưa nhận được mail? Gửi lại'}</span>
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setRegisteredData(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  Đăng ký email khác
                </button>

                <Link
                  to="/login"
                  className="text-orange-500 hover:text-orange-600 font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <span>Đi đến Đăng nhập</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFDF9] dark:bg-[#0F1014] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Main Full-Width 2-Column Content */}
      <div className="w-full flex-1 px-4 sm:px-8 lg:px-12 2xl:px-16 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          {/* ================================================================
              CỘT TRÁI (5 CỘT) — VISUAL BRAND SHOWCASE
              ================================================================ */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-6 sticky top-28">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-xs font-bold text-primary w-fit shadow-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>Gia nhập cộng đồng ẩm thực số #1</span>
            </div>

            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-slate-900 dark:text-white leading-[1.18] tracking-tight">
              Khởi đầu trải nghiệm <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FFB800] animate-gradient-text">
                ẩm thực đỉnh cao
              </span>
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-md">
              Dù bạn là khách hàng sành ăn, chủ quán mong muốn bứt phá doanh số hay tài xế tìm kiếm thu nhập ổn định, FoodDelivery luôn đồng hành cùng bạn!
            </p>

            {/* Member Benefit Cards */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#181A20] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-orange-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Giao hàng thần tốc 20 phút
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống phân phối đơn thông minh, giảm tối đa thời gian chờ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#181A20] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-amber-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Chiết khấu ưu đãi cho đối tác
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Miễn phí duy trì gian hàng tháng đầu, hỗ trợ quảng bá chuyên sâu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#181A20] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Bảo vệ quyền lợi toàn diện
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Bảo hiểm đơn hàng, hỗ trợ giải quyết sự cố 24/7 từ tổng đài
                  </p>
                </div>
              </div>
            </div>

            {/* Social Proof */}
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
              CỘT PHẢI (7 CỘT) — REGISTRATION FORM
              ================================================================ */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#181A20] rounded-3xl shadow-2xl shadow-orange-500/10 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all duration-300">
              {/* Header Tabs: Đăng nhập / Đăng ký */}
              <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="py-3 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <span>🔑</span> Đăng nhập
                </button>
                <button
                  type="button"
                  className="py-3 text-xs sm:text-sm font-extrabold text-primary bg-white dark:bg-[#181A20] rounded-2xl shadow-sm cursor-default flex items-center justify-center gap-2"
                  disabled
                >
                  <span>📝</span> Đăng ký tài khoản
                </button>
              </div>

              <div className="p-6 sm:p-8 lg:p-10 space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Tạo tài khoản FoodDelivery 🚀
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Chọn vai trò tham gia và hoàn tất biểu mẫu để bắt đầu ngay
                  </p>
                </div>

                {/* Quick Fill Test Badges */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-orange-50/70 dark:bg-slate-800/60 rounded-2xl border border-dashed border-orange-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Điền nhanh test mẫu:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('restaurant_owner')}
                    className="px-2.5 py-1 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-primary font-bold hover:bg-orange-200 transition-colors"
                  >
                    🍳 Mẫu Quán Ăn (+PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('shipper')}
                    className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-200 transition-colors"
                  >
                    🛵 Mẫu Tài Xế
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('customer')}
                    className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-200 transition-colors"
                  >
                    👤 Mẫu Khách Hàng
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Role Selector Pills */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Bạn muốn đăng ký tham gia với tư cách nào? <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'customer',
                          title: 'Khách hàng',
                          desc: 'Đặt món ngon',
                          icon: '👤',
                          activeClass: 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/20',
                        },
                        {
                          id: 'restaurant_owner',
                          title: 'Quán ăn',
                          desc: 'Mở gian hàng',
                          icon: '🍳',
                          activeClass: 'border-primary bg-orange-50/60 dark:bg-orange-950/40 text-primary shadow-sm ring-2 ring-primary/20',
                        },
                        {
                          id: 'shipper',
                          title: 'Tài xế',
                          desc: 'Giao hàng',
                          icon: '🛵',
                          activeClass: 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm ring-2 ring-emerald-500/20',
                        },
                      ].map((item) => (
                        <label
                          key={item.id}
                          className={`cursor-pointer flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border text-center transition-all ${
                            formData.role === item.id
                              ? `${item.activeClass} font-bold`
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
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
                          <span className="text-2xl mb-1">{item.icon}</span>
                          <span className="text-xs sm:text-sm font-bold block">{item.title}</span>
                          <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
                            {item.desc}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Thanh tiến trình 2 bước dành cho đối tác Quán ăn & Tài xế */}
                  {formData.role !== 'customer' && (
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-orange-50/70 dark:bg-slate-900/60 border border-orange-200/80 dark:border-slate-800 animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className={`flex items-center gap-2 text-left cursor-pointer transition-all ${
                          currentStep === 1
                            ? 'text-primary font-black'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                            currentStep === 1
                              ? 'bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-primary/20'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {currentStep > 1 ? '✓' : '1'}
                        </div>
                        <div className="leading-tight">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Bước 1</p>
                          <p className="text-xs sm:text-sm font-bold truncate">Tài khoản cơ bản</p>
                        </div>
                      </button>

                      <div className="h-[2px] flex-1 mx-2.5 sm:mx-4 bg-slate-200 dark:bg-slate-800 relative rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-300 ${
                            currentStep === 2 ? 'w-full' : 'w-0'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleNextStep}
                        className={`flex items-center gap-2 text-left cursor-pointer transition-all ${
                          currentStep === 2
                            ? 'text-primary font-black'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                            currentStep === 2
                              ? 'bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-primary/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          2
                        </div>
                        <div className="leading-tight">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Bước 2</p>
                          <p className="text-xs sm:text-sm font-bold truncate">
                            {formData.role === 'restaurant_owner' ? 'Hồ sơ quán & Giấy phép' : 'Phương tiện & Định danh'}
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* BƯỚC 1: THÔNG TIN TÀI KHOẢN (Hiển thị cho Khách hàng HOẶC khi Partner ở Bước 1) */}
                  {(formData.role === 'customer' || currentStep === 1) && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Thông tin tài khoản đăng nhập
                    </h3>

                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="reg-name">
                        {formData.role === 'restaurant_owner'
                          ? 'Họ và tên chủ quán / Người đại diện pháp lý'
                          : formData.role === 'shipper'
                          ? 'Họ và tên tài xế'
                          : 'Họ và tên'}{' '}
                        <span className="text-red-500">*</span>
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
                          className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="reg-email">
                          Địa chỉ Email <span className="text-red-500">*</span>
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
                            className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="reg-phone">
                          Số điện thoại liên hệ <span className="text-red-500">*</span>
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
                            required
                            className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="reg-pass">
                          Mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="reg-pass"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Tối thiểu 6 ký tự"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="reg-confirm">
                          Xác nhận mật khẩu <span className="text-red-500">*</span>
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
                            className={`w-full pl-11 pr-10 py-3 text-xs sm:text-sm rounded-xl border bg-white dark:bg-[#181A20] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all font-medium ${
                              isPasswordMismatch
                                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30'
                                : isPasswordMatch
                                  ? 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30'
                                  : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                            }`}
                          />
                          {hasConfirmPassword && (
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in">
                              {isPasswordMatch ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        {isPasswordMismatch && (
                          <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Mật khẩu xác nhận không khớp</span>
                          </p>
                        )}
                        {isPasswordMatch && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Mật khẩu hoàn toàn trùng khớp ✓</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">Độ mạnh mật khẩu:</span>
                          <span className={passwordStrength.score >= 3 ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                            {passwordStrength.text}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  {/* BƯỚC 2: DÀNH RIÊNG CHO QUÁN ĂN */}
                  {formData.role === 'restaurant_owner' && currentStep === 2 && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 space-y-4 animate-in fade-in">
                      <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5" /> Thông tin hồ sơ quán ăn & pháp lý
                      </h3>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Tên thương hiệu quán ăn <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="restaurantName"
                          placeholder="Ví dụ: Cơm Tấm Ba Ghiền"
                          value={formData.restaurantName}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Địa chỉ cụ thể của quán <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="restaurantAddress"
                          placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                          value={formData.restaurantAddress}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Món ăn / Mặt hàng quán muốn kinh doanh <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="businessItems"
                          placeholder="Ví dụ: Cơm tấm sườn bì chả, canh rong biển..."
                          value={formData.businessItems}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-primary mb-2"
                        />

                        {/* Suggested Tag Pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTED_ITEMS.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleToggleTag(item)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Số CCCD của chủ quán <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="ownerCitizenId"
                          placeholder="Gồm 9 đến 12 chữ số"
                          value={formData.ownerCitizenId}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Image / PDF Upload Box */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Hình ảnh hoặc File PDF Giấy phép kinh doanh / Vệ sinh ATTP <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={pdfInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="license-upload-input"
                        />

                        {formData.businessLicense ? (
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 truncate">
                              {formData.businessLicense.fileType === 'image' ||
                              formData.businessLicense.fileData?.startsWith('data:image/') ||
                              /\.(jpe?g|png|webp)$/i.test(formData.businessLicense.fileName) ? (
                                <img
                                  src={formData.businessLicense.fileData}
                                  alt="Xem trước giấy phép"
                                  className="w-9 h-9 rounded-lg object-cover border border-emerald-200 dark:border-emerald-800 shrink-0"
                                />
                              ) : (
                                <FileText className="w-6 h-6 text-emerald-500 shrink-0" />
                              )}
                              <div className="flex flex-col truncate">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {formData.businessLicense.fileName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formData.businessLicense.fileType === 'image' ||
                                  formData.businessLicense.fileData?.startsWith('data:image/') ||
                                  /\.(jpe?g|png|webp)$/i.test(formData.businessLicense.fileName)
                                    ? '🖼️ Tệp hình ảnh'
                                    : '📄 Tài liệu PDF'} • {(formData.businessLicense.fileSize / 1024).toFixed(0)} KB
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={handlePreviewFile}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" /> Xem
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Gỡ bỏ tệp"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="license-upload-input"
                            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-orange-300 dark:border-orange-800 hover:border-primary bg-white/70 dark:bg-slate-900/60 cursor-pointer transition-colors"
                          >
                            <UploadCloud className="w-8 h-8 text-primary mb-2" />
                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                              Bấm để chụp ảnh hoặc tải lên tệp (Tối đa 3MB)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Hỗ trợ định dạng ảnh (.jpg, .jpeg, .png, .webp) hoặc tài liệu PDF (.pdf)
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BƯỚC 2: DÀNH RIÊNG CHO TÀI XẾ */}
                  {formData.role === 'shipper' && currentStep === 2 && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-4 animate-in fade-in">
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5" /> Thông tin phương tiện & tài xế
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Ngày tháng năm sinh <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                            className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                          {shipperAge !== null && (
                            <span
                              className={`text-[11px] font-bold block mt-1 ${
                                shipperAge >= 18 ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              Tuổi hiện tại: {shipperAge} tuổi {shipperAge < 18 ? '(Chưa đủ 18 tuổi)' : '(Đủ điều kiện)'}
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Số CCCD của tài xế <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="driverCitizenId"
                            placeholder="Gồm 9 đến 12 chữ số"
                            value={formData.driverCitizenId}
                            onChange={handleChange}
                            className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Thông tin loại xe & Biển số xe <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="vehicleInfo"
                          placeholder="Ví dụ: Honda Wave Alpha - Biển số: 59-P1 888.88"
                          value={formData.vehicleInfo}
                          onChange={handleChange}
                          className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181A20] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                          <input
                            type="checkbox"
                            name="insuranceSubmitLater"
                            checked={formData.insuranceSubmitLater}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
                          />
                          <span>Bảo hiểm trách nhiệm dân sự xe máy: Tôi sẽ bổ sung sau khi kích hoạt</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Terms & Privacy Checkbox (Hiển thị ở bước cuối) */}
                  {(formData.role === 'customer' || currentStep === 2) && (
                    <div className="pt-2 animate-in fade-in">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400 select-none">
                        <input
                          type="checkbox"
                          name="agreeTerms"
                          checked={formData.agreeTerms}
                          onChange={handleChange}
                          className="w-4 h-4 rounded mt-0.5 text-primary accent-primary"
                        />
                        <span>
                          Tôi đã đọc và đồng ý với{' '}
                          <span className="text-primary font-bold hover:underline">
                            Điều khoản dịch vụ & Chính sách bảo mật
                          </span>{' '}
                          của FoodDelivery.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Nút hành động */}
                  {formData.role === 'customer' ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-orange-500/25 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang khởi tạo tài khoản...</span>
                        </>
                      ) : (
                        <>
                          <span>Hoàn tất đăng ký Khách Hàng</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : currentStep === 1 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-orange-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>
                        Tiếp tục Bước 2: {formData.role === 'restaurant_owner' ? 'Thông tin quán & Giấy tờ' : 'Phương tiện & Định danh'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Quay lại Bước 1</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-orange-500/25 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Đang nộp hồ sơ xét duyệt...</span>
                          </>
                        ) : (
                          <>
                            <span>Hoàn tất đăng ký đối tác</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>

                {/* Bottom Login Redirect */}
                <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
                  Đã có tài khoản FoodDelivery?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Đăng nhập ngay ➔
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
