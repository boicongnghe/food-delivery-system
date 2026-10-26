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
  MapPin,
  UtensilsCrossed,
  CreditCard,
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  Calendar,
  Bike,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
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
  const { register } = useAuth()
  const pdfInputRef = useRef(null)

  const [formData, setFormData] = useState({
    // Thông tin tài khoản chung
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer', // 'customer' | 'restaurant_owner' | 'shipper'
    agreeTerms: true,

    // Thông tin dành riêng cho Nhà Hàng
    restaurantName: '',
    restaurantAddress: '',
    businessItems: '',
    ownerCitizenId: '',
    businessLicense: null, // { fileName, fileSize, fileData, uploadedAt }

    // Thông tin dành riêng cho Tài Xế
    dateOfBirth: '',
    driverCitizenId: '',
    vehicleInfo: '',
    insuranceSubmitLater: true, // Mặc định: cho nộp sau cũng được
    insuranceInfo: '',
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

  // Thêm/bỏ nhanh tag món ăn muốn bán
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

  // Xử lý upload file PDF giấy phép kinh doanh
  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Kiểm tra định dạng PDF bắt buộc
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      toast.error('Chỉ chấp nhận tệp định dạng PDF (.pdf) cho Giấy phép kinh doanh!')
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      return
    }

    // Kiểm tra kích thước file <= 15MB
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Dung lượng file PDF vượt quá giới hạn 15MB. Vui lòng chọn file nhỏ hơn.')
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
          fileData: reader.result,
          uploadedAt: new Date().toISOString(),
        },
      }))
      toast.success(`Đã tải lên tệp PDF: ${file.name}`)
    }
    reader.onerror = () => {
      toast.error('Không thể đọc file PDF. Vui lòng thử lại!')
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePdf = () => {
    setFormData((prev) => ({ ...prev, businessLicense: null }))
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    toast('Đã gỡ tệp Giấy phép kinh doanh', { icon: '🗑️' })
  }

  const handlePreviewPdf = () => {
    if (!formData.businessLicense?.fileData) return
    try {
      const dataUri = formData.businessLicense.fileData
      const win = window.open('')
      if (win) {
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
      } else {
        toast.error('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép để xem trước file!')
      }
    } catch {
      toast.error('Không thể mở xem trước file PDF.')
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

  // Tự động điền dữ liệu mẫu để kiểm thử nhanh
  const handleQuickFill = (targetRole) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)

    if (targetRole === 'restaurant_owner') {
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 1. Kiểm tra thông tin chung
    if (!formData.fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên.')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email.')
      return
    }

    const cleanPhone = formData.phone.trim().replace(/[\s.-]/g, '')
    if (!cleanPhone) {
      toast.error('Vui lòng nhập số điện thoại liên hệ.')
      return
    }

    const phoneRegex = /^(0|\+84)[0-9]{9}$/
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Số điện thoại không hợp lệ (gồm 10 số, ví dụ: 0912345678).')
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
      toast.error('Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách.')
      return
    }

    // 2. Kiểm tra thông tin theo vai trò
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
        toast.error('Bắt buộc phải tải lên file PDF Giấy phép kinh doanh của nhà hàng.')
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
      toast.error(result.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.')
    }
  }

  const shipperAge = calculateAge(formData.dateOfBirth)

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
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
          {/* Title Header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tạo tài khoản đối tác & khách hàng 🚀
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Điền thông tin tương ứng theo vai trò để kích hoạt tài khoản ngay hôm nay
            </p>

            {/* Quick Fill Test Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 p-2.5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Điền nhanh test mẫu:
              </span>
              <button
                type="button"
                onClick={() => handleQuickFill('restaurant_owner')}
                className="px-2.5 py-1 rounded-lg bg-orange-100 text-primary font-bold hover:bg-orange-200 transition-colors"
              >
                🍳 Mẫu Quán Ăn (+PDF)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('shipper')}
                className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold hover:bg-emerald-200 transition-colors"
              >
                🛵 Mẫu Tài Xế
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('customer')}
                className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition-colors"
              >
                👤 Mẫu Khách Hàng
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Bạn muốn đăng ký tham gia với tư cách nào?
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    id: 'customer',
                    title: 'Khách hàng',
                    desc: 'Đặt món & Thưởng thức',
                    icon: '👤',
                    activeColor: 'border-blue-500 bg-blue-50/50 text-blue-700',
                  },
                  {
                    id: 'restaurant_owner',
                    title: 'Nhà hàng / Quán ăn',
                    desc: 'Kinh doanh & Bán món',
                    icon: '🍳',
                    activeColor: 'border-primary bg-orange-50/50 text-primary',
                  },
                  {
                    id: 'shipper',
                    title: 'Tài xế giao hàng',
                    desc: 'Nhận đơn & Giao đồ ăn',
                    icon: '🛵',
                    activeColor: 'border-emerald-500 bg-emerald-50/50 text-emerald-700',
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`cursor-pointer flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border text-center transition-all ${
                      formData.role === item.id
                        ? `${item.activeColor} font-bold shadow-sm ring-2 ring-primary/20`
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
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
                    <span className="text-2xl sm:text-3xl mb-1.5">{item.icon}</span>
                    <span className="text-xs sm:text-sm font-bold block">{item.title}</span>
                    <span className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
                      {item.desc}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* SECTION 1: THÔNG TIN CƠ BẢN */}
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Thông tin tài khoản đăng nhập
              </h3>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="reg-name">
                  {formData.role === 'restaurant_owner'
                    ? 'Họ và tên chủ quán / Người đại diện pháp lý'
                    : formData.role === 'shipper'
                    ? 'Họ và tên tài xế'
                    : 'Họ và tên'}
                  <span className="text-red-500 ml-1">*</span>
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
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                    htmlFor="reg-email"
                  >
                    Địa chỉ Email đăng nhập <span className="text-red-500">*</span>
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
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                    htmlFor="reg-phone"
                  >
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
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                    htmlFor="reg-password"
                  >
                    Mật khẩu <span className="text-red-500">*</span>
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
                      className="w-full pl-11 pr-11 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
                  <label
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                    htmlFor="reg-confirm"
                  >
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
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password strength indicator */}
              {formData.password && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span>Độ bảo mật mật khẩu</span>
                    <span>{passwordStrength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'
                      } flex-1`}
                    ></div>
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'
                      } flex-1`}
                    ></div>
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'
                      } flex-1`}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: DÀNH RIÊNG CHO NHÀ HÀNG */}
            {formData.role === 'restaurant_owner' && (
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Thông tin Nhà hàng & Giấy phép Kinh doanh
                      </h3>
                      <p className="text-xs text-amber-900/80">
                        Bắt buộc cung cấp đầy đủ thông tin để kiểm duyệt mở gian hàng
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-200/70 text-amber-900">
                    Bắt buộc
                  </span>
                </div>

                {/* Tên nhà hàng */}
                <div>
                  <label
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                    htmlFor="reg-rest-name"
                  >
                    Tên nhà hàng / quán ăn <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-5 h-5 text-amber-600/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-rest-name"
                      type="text"
                      name="restaurantName"
                      placeholder="Ví dụ: Cơm Tấm Ba Ghiền, Phở Thìn Hà Nội..."
                      value={formData.restaurantName}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-amber-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Địa chỉ nhà hàng */}
                <div>
                  <label
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                    htmlFor="reg-rest-addr"
                  >
                    Địa chỉ nhà hàng cụ thể <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 text-amber-600/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-rest-addr"
                      type="text"
                      name="restaurantAddress"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      value={formData.restaurantAddress}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-amber-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Nhà hàng muốn bán sản phẩm gì */}
                <div>
                  <label
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                    htmlFor="reg-rest-items"
                  >
                    Nhà hàng muốn bán sản phẩm / món ăn gì? <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UtensilsCrossed className="w-5 h-5 text-amber-600/70 absolute left-3.5 top-3 pointer-events-none" />
                    <textarea
                      id="reg-rest-items"
                      name="businessItems"
                      rows={2}
                      placeholder="Ví dụ: Cơm tấm sườn bì chả, canh khổ qua, sườn cây nướng, trà tắc khổng lồ..."
                      value={formData.businessItems}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-amber-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                  {/* Category Chips Helper */}
                  <div className="mt-2">
                    <span className="text-[11px] font-semibold text-amber-900/80 block mb-1">
                      💡 Chọn nhanh mặt hàng kinh doanh:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_ITEMS.map((item) => {
                        const cleanItem = item.replace(/^[^\s]+\s/, '')
                        const isSelected = formData.businessItems
                          .toLowerCase()
                          .includes(cleanItem.toLowerCase())
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleToggleTag(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-white shadow-xs font-bold'
                                : 'bg-white border border-amber-200 text-slate-700 hover:bg-amber-100/70'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* CCCD của chủ quán */}
                <div>
                  <label
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                    htmlFor="reg-owner-cccd"
                  >
                    Số Căn cước công dân (CCCD) của chủ quán <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-5 h-5 text-amber-600/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-owner-cccd"
                      type="text"
                      name="ownerCitizenId"
                      maxLength={12}
                      placeholder="12 chữ số CCCD (Ví dụ: 079198005432)"
                      value={formData.ownerCitizenId}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-amber-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all tracking-wider font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nhập 12 chữ số trên thẻ CCCD gắn chip của chủ hộ kinh doanh hoặc người đại diện.
                  </p>
                </div>

                {/* File PDF về Giấy phép kinh doanh */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Tệp PDF Giấy phép đăng ký kinh doanh <span className="text-red-500">* (Bắt buộc dạng .PDF)</span>
                  </label>

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    id="business-pdf-upload"
                  />

                  {!formData.businessLicense ? (
                    <label
                      htmlFor="business-pdf-upload"
                      className="cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-2xl transition-all text-center group hover:bg-amber-50/30"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center mb-2 transition-colors">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-primary">
                        Bấm vào đây để tải lên tệp PDF Giấy phép kinh doanh
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ định dạng: <span className="font-bold text-red-600">.PDF</span> (Dung lượng tối đa 15MB)
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                        <FileText className="w-3.5 h-3.5 text-red-500" /> Bắt buộc tệp PDF hợp lệ
                      </div>
                    </label>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-xs">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {formData.businessLicense.fileName}
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Dung lượng: {(formData.businessLicense.fileSize / 1024 / 1024).toFixed(2)} MB • Định dạng: PDF
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={handlePreviewPdf}
                          className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Xem trước
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePdf}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Đổi file
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    Tài liệu này được lưu trữ an toàn và bảo mật chỉ dùng để đối chiếu xác minh tư cách nhà hàng.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 3: DÀNH RIÊNG CHO TÀI XẾ */}
            {formData.role === 'shipper' && (
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Thông tin Đối tác Tài xế & Phương tiện
                      </h3>
                      <p className="text-xs text-emerald-900/80">
                        Cung cấp thông tin ngày sinh, CCCD, giấy tờ xe & bảo hiểm (nộp sau cũng được)
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-200/70 text-emerald-900">
                    Đối tác vận chuyển
                  </span>
                </div>

                {/* Ngày sinh & Số CCCD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                      htmlFor="reg-shipper-dob"
                    >
                      Ngày sinh tài xế <span className="text-red-500">* (Đủ từ 18 tuổi)</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 text-emerald-600/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-shipper-dob"
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        required
                        className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-emerald-200 bg-white text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    {shipperAge !== null && (
                      <p
                        className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${
                          shipperAge >= 18 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {shipperAge >= 18 ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Đủ điều kiện ({shipperAge} tuổi)
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Chưa đủ 18 tuổi ({shipperAge} tuổi)
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                      htmlFor="reg-shipper-cccd"
                    >
                      Số CCCD tài xế <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="w-5 h-5 text-emerald-600/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-shipper-cccd"
                        type="text"
                        name="driverCitizenId"
                        maxLength={12}
                        placeholder="12 chữ số CCCD (Ví dụ: 079201009876)"
                        value={formData.driverCitizenId}
                        onChange={handleChange}
                        required
                        className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono tracking-wider"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nhập đủ 12 số CCCD gắn chip chính chủ tài xế.
                    </p>
                  </div>
                </div>

                {/* Giấy tờ xe / Loại xe & Biển số xe */}
                <div>
                  <label
                    className="block text-xs font-bold text-slate-800 mb-1.5"
                    htmlFor="reg-shipper-vehicle"
                  >
                    Giấy tờ xe & Thông tin phương tiện giao hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Bike className="w-5 h-5 text-emerald-600/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-shipper-vehicle"
                      type="text"
                      name="vehicleInfo"
                      placeholder="Ví dụ: Honda Wave Alpha - Biển kiểm soát: 59-P1 888.88 (Có Cà vẹt chính chủ)"
                      value={formData.vehicleInfo}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ghi rõ dòng xe, biển số xe và tình trạng giấy đăng ký xe (Cà vẹt xe / GPLX).
                  </p>
                </div>

                {/* Bảo hiểm xe (Cho nộp sau cũng được) */}
                <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="insuranceSubmitLater"
                        checked={formData.insuranceSubmitLater}
                        onChange={handleChange}
                        className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500/20 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Bảo hiểm xe: Tôi sẽ nộp bổ sung sau khi tài khoản được duyệt
                      </span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Cho nộp sau cũng được
                    </span>
                  </div>

                  {!formData.insuranceSubmitLater ? (
                    <div className="pt-1 space-y-2 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-slate-700">
                        Thông tin thẻ bảo hiểm TNDS xe (Nếu đã có):
                      </label>
                      <input
                        type="text"
                        name="insuranceInfo"
                        placeholder="Số thẻ bảo hiểm, nhà bảo hiểm (Bảo Việt, PTI...) và hạn sử dụng"
                        value={formData.insuranceInfo}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Bạn có thể bổ sung ảnh chụp bảo hiểm xe máy trong mục quản lý hồ sơ tài xế trước khi thực hiện đơn hàng đầu tiên.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="rounded border-slate-300 text-primary focus:ring-primary/20 w-4 h-4"
                />
                <span>
                  Tôi cam kết thông tin cung cấp là hoàn toàn chính xác và đồng ý với{' '}
                  <span className="text-primary font-bold hover:underline">Điều khoản dịch vụ</span>{' '}
                  & <span className="text-primary font-bold hover:underline">Chính sách bảo mật</span>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang khởi tạo tài khoản...
                </>
              ) : formData.role === 'restaurant_owner' ? (
                'Đăng ký Mở Quán Ăn Ngay'
              ) : formData.role === 'shipper' ? (
                'Đăng ký Trở Thành Tài Xế'
              ) : (
                'Đăng ký Tài Khoản Khách Hàng'
              )}
            </button>
          </form>

          {/* Bottom Switch Link */}
          <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
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
