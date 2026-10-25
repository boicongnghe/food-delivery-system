import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  User,
  Phone,
  MapPin,
  Camera,
  Upload,
  CheckCircle2,
  X,
  Sparkles,
  Store,
  Bike,
  Info,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Check,
  Building,
  Home,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import authApi from '../../api/authApi.js'
import uploadApi from '../../api/uploadApi.js'

const PRESET_AVATARS = {
  customer: [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  ],
  restaurant_owner: [
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=150&q=80',
  ],
  shipper: [
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
  ],
}

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('info') // 'info' | 'addresses' | 'password'

  // Tab 1: Profile Info State
  const [avatar, setAvatar] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Tab 2: Addresses State (Customers only)
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState({
    title: 'Nhà riêng',
    receiverName: '',
    receiverPhone: '',
    street: '',
    district: '',
    isDefault: false,
  })
  const [savingAddress, setSavingAddress] = useState(false)

  // Tab 3: Change Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [changingPass, setChangingPass] = useState(false)

  const isCustomer = user?.role === 'customer'
  const isRestaurant = user?.role === 'restaurant_owner'
  const isShipper = user?.role === 'shipper'

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true)
      const res = await authApi.getAddresses()
      if (res.data) {
        setAddresses(res.data)
      }
    } catch {
      // ignore or toast
    } finally {
      setLoadingAddresses(false)
    }
  }

  // Initialize data on modal open
  useEffect(() => {
    if (isOpen && user) {
      setAvatar(user.avatar || '')
      setPhone(user.phone || '')
      setFullName(user.fullName || '')
      setActiveTab('info')
      setShowAddressForm(false)
      setEditingAddressId(null)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })

      if (isCustomer) {
        fetchAddresses()
      }
    }
  }, [isOpen, user, isCustomer])

  if (!isOpen || !user) return null

  // Handler: Change Avatar File Upload to Cloudinary
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)!')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB')
      return
    }

    setUploadingAvatar(true)
    const toastId = toast.loading('Đang tải ảnh đại diện lên Cloudinary...')
    try {
      const res = await uploadApi.uploadImage(file, 'avatars')
      if (res?.data?.url) {
        setAvatar(res.data.url)
        toast.success('Đã tải ảnh lên Cloudinary thành công! ☁️', { id: toastId })
      } else {
        throw new Error('Không nhận được URL từ máy chủ')
      }
    } catch (err) {
      // Local preview fallback if Cloudinary credentials are not configured
      const reader = new FileReader()
      reader.onload = () => {
        setAvatar(reader.result)
      }
      reader.readAsDataURL(file)

      const errMsg = err.response?.data?.message || err.message || 'Lỗi kết nối'
      if (errMsg.includes('Cloudinary')) {
        toast('Đã chọn ảnh (Lưu ý: ' + errMsg + ')', { id: toastId, icon: '⚠️' })
      } else {
        toast.error('Tải lên Cloudinary thất bại: ' + errMsg, { id: toastId })
      }
    } finally {
      setUploadingAvatar(false)
      if (e.target) e.target.value = ''
    }
  }

  // Handler: Save Profile Info (Tab 1)
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSavingProfile(true)

    const payload = {
      avatar: avatar.trim(),
    }

    if (isCustomer) {
      payload.phone = phone.trim()
      payload.fullName = fullName.trim()
    }

    const result = await updateProfile(payload)
    setSavingProfile(false)

    if (result.success) {
      toast.success(result.message || 'Cập nhật thông tin cá nhân thành công!')
      onClose()
    } else {
      toast.error(result.message || 'Cập nhật thông tin thất bại')
    }
  }

  // Handler: Save Address (Add or Edit)
  const handleSaveAddress = async (e) => {
    e.preventDefault()
    if (!addressForm.street.trim()) {
      toast.error('Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường).')
      return
    }

    setSavingAddress(true)
    try {
      if (editingAddressId) {
        const res = await authApi.updateAddress(editingAddressId, addressForm)
        setAddresses(res.data)
        toast.success('Cập nhật địa chỉ thành công!')
      } else {
        const res = await authApi.addAddress(addressForm)
        setAddresses(res.data)
        toast.success('Thêm địa chỉ giao hàng mới thành công!')
      }
      setShowAddressForm(false)
      setEditingAddressId(null)
      setAddressForm({
        title: 'Nhà riêng',
        receiverName: user.fullName || '',
        receiverPhone: user.phone || '',
        street: '',
        district: '',
        isDefault: false,
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu địa chỉ.')
    } finally {
      setSavingAddress(false)
    }
  }

  // Handler: Delete Address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này không?')) return

    try {
      const res = await authApi.deleteAddress(addressId)
      setAddresses(res.data)
      toast.success('Đã xóa địa chỉ thành công!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa địa chỉ.')
    }
  }

  // Handler: Set as Default Address
  const handleSetDefaultAddress = async (addressId) => {
    try {
      const res = await authApi.setDefaultAddress(addressId)
      setAddresses(res.data)
      toast.success('Đã đặt làm địa chỉ giao hàng mặc định!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đặt mặc định.')
    }
  }

  // Handler: Start Editing Address
  const handleStartEdit = (addr) => {
    setEditingAddressId(addr._id)
    setAddressForm({
      title: addr.title || 'Nhà riêng',
      receiverName: addr.receiverName || user.fullName || '',
      receiverPhone: addr.receiverPhone || user.phone || '',
      street: addr.street || '',
      district: addr.district || '',
      isDefault: Boolean(addr.isDefault),
    })
    setShowAddressForm(true)
  }

  // Handler: Change Password (Tab 3)
  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!passwordData.currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp.')
      return
    }

    setChangingPass(true)
    try {
      const res = await authApi.changePassword(passwordData)
      toast.success(res.message || 'Đổi mật khẩu thành công!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setActiveTab('info')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.')
    } finally {
      setChangingPass(false)
    }
  }

  const avatarPresets = PRESET_AVATARS[user.role] || PRESET_AVATARS.customer

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs text-white ${
                isRestaurant
                  ? 'bg-amber-500'
                  : isShipper
                  ? 'bg-emerald-600'
                  : 'bg-primary'
              }`}
            >
              {isRestaurant ? (
                <Store className="w-6 h-6" />
              ) : isShipper ? (
                <Bike className="w-6 h-6" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Quản lý tài khoản cá nhân
              </h3>
              <p className="text-xs text-slate-500">
                {user.fullName} ({user.email})
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/40 px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thông tin cá nhân</span>
          </button>

          {isCustomer && (
            <button
              type="button"
              onClick={() => setActiveTab('addresses')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'addresses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Sổ địa chỉ ({addresses.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'password'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: THÔNG TIN CÁ NHÂN & AVATAR */}
          {activeTab === 'info' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar Upload & Presets */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Ảnh đại diện hồ sơ <span className="text-red-500">*</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="relative group flex-shrink-0">
                    <img
                      src={avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt="Ảnh đại diện"
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary/20 shadow-md group-hover:opacity-90 transition-opacity"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      title="Tải ảnh mới từ máy tính"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="avatar-file-input"
                    />
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-primary text-slate-700 hover:text-primary text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                    >
                      {uploadingAvatar ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Đang tải lên Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh lên Cloudinary</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Lưu trữ an toàn trên Cloudinary CDN (JPG, PNG, WEBP tối đa 5MB).
                    </p>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Chọn nhanh avatar có sẵn:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {avatarPresets.map((presetUrl, idx) => {
                      const isSelected = avatar === presetUrl
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(presetUrl)}
                          className={`relative rounded-xl overflow-hidden transition-all ${
                            isSelected
                              ? 'ring-3 ring-primary scale-105 shadow-md'
                              : 'opacity-75 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          <img
                            src={presetUrl}
                            alt={`Preset ${idx}`}
                            className="w-11 h-11 object-cover rounded-xl"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center text-white">
                              <CheckCircle2 className="w-4 h-4 fill-primary text-white" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Customer specific inputs: Full Name & Phone */}
              {isCustomer && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="cust-name">
                      Họ và tên khách hàng <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="cust-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="cust-phone">
                      Số điện thoại liên hệ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="cust-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Role specific Notice for Restaurant & Shipper */}
              {(isRestaurant || isShipper) && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {isRestaurant ? 'Tài khoản Quán ăn:' : 'Tài khoản Tài xế:'}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {isRestaurant
                        ? 'Bạn có thể thay đổi ảnh đại diện bất kỳ lúc nào. Để chỉnh sửa giờ mở cửa, thực đơn, vui lòng truy cập trang Hồ Sơ Quán.'
                        : 'Bạn có thể thay đổi ảnh đại diện tài xế. Thông tin CCCD và phương tiện được ban quản trị xét duyệt.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-60 transition-all flex items-center gap-2"
                >
                  {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: QUẢN LÝ SỔ ĐỊA CHỈ (CUSTOMER ONLY) */}
          {activeTab === 'addresses' && isCustomer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Danh sách địa chỉ giao hàng</h4>
                  <p className="text-xs text-slate-500">Quản lý các địa chỉ nhận món ăn thuận tiện khi đặt hàng</p>
                </div>

                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddressId(null)
                      setAddressForm({
                        title: 'Nhà riêng',
                        receiverName: user.fullName || '',
                        receiverPhone: user.phone || '',
                        street: '',
                        district: '',
                        isDefault: addresses.length === 0,
                      })
                      setShowAddressForm(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm địa chỉ mới
                  </button>
                )}
              </div>

              {/* Form Thêm / Chỉnh sửa địa chỉ */}
              {showAddressForm && (
                <form
                  onSubmit={handleSaveAddress}
                  className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-3 animate-in fade-in duration-150"
                >
                  <h5 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    {editingAddressId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingAddressId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ giao hàng mới'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tên gọi địa chỉ
                      </label>
                      <select
                        value={addressForm.title}
                        onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-primary"
                      >
                        <option value="Nhà riêng">🏠 Nhà riêng</option>
                        <option value="Công ty / Văn phòng">🏢 Công ty / Văn phòng</option>
                        <option value="Trường học">🎓 Trường học</option>
                        <option value="Khác">📍 Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tên người nhận hàng
                      </label>
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={addressForm.receiverName}
                        onChange={(e) => setAddressForm({ ...addressForm, receiverName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Số điện thoại người nhận
                      </label>
                      <input
                        type="tel"
                        placeholder="0912 345 678"
                        value={addressForm.receiverPhone}
                        onChange={(e) => setAddressForm({ ...addressForm, receiverPhone: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quận / Huyện
                      </label>
                      <input
                        type="text"
                        placeholder="Quận 1, Bình Thạnh..."
                        value={addressForm.district}
                        onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Địa chỉ cụ thể (Số nhà, tên đường, phường...) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Số 123 Đường Nguyễn Trãi, Phường 2..."
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <span>Đặt làm địa chỉ nhận hàng mặc định</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(false)
                          setEditingAddressId(null)
                        }}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="px-4 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors shadow-xs disabled:opacity-60"
                      >
                        {savingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Danh sách địa chỉ đã lưu */}
              {loadingAddresses ? (
                <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách địa chỉ...</div>
              ) : addresses.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Bạn chưa lưu địa chỉ giao hàng nào</p>
                  <p className="text-[11px] text-slate-400 mt-1">Bấm "Thêm địa chỉ mới" để thêm địa chỉ nhà riêng hoặc văn phòng</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`p-4 rounded-2xl border transition-all ${
                        addr.isDefault
                          ? 'border-primary/40 bg-orange-50/20 shadow-xs ring-1 ring-primary/20'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {addr.title === 'Công ty / Văn phòng' ? (
                                <Building className="w-3 h-3 text-slate-500" />
                              ) : (
                                <Home className="w-3 h-3 text-slate-500" />
                              )}
                              {addr.title || 'Nhà riêng'}
                            </span>

                            {addr.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-primary border border-orange-200">
                                Mặc định
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-bold text-slate-900 mt-1">
                            {addr.street}
                            {addr.district && `, ${addr.district}`}
                          </p>

                          {(addr.receiverName || addr.receiverPhone) && (
                            <p className="text-[11px] text-slate-500">
                              Người nhận: <span className="font-semibold text-slate-700">{addr.receiverName || user.fullName}</span>
                              {addr.receiverPhone && ` • SĐT: ${addr.receiverPhone}`}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr._id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors border border-slate-200"
                              title="Đặt làm mặc định"
                            >
                              Đặt mặc định
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEdit(addr)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa địa chỉ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ĐỔI MẬT KHẨU (ALL USERS) */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Đổi mật khẩu tài khoản</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác. Mật khẩu mới phải có tối thiểu 6 ký tự.
                  </p>
                </div>
              </div>

              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="current-pass">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="current-pass"
                    type={showPass.current ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu đang sử dụng"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="new-pass">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="new-pass"
                    type={showPass.new ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="confirm-pass">
                  Xác nhận lại mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Check className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="confirm-pass"
                    type={showPass.confirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    setActiveTab('info')
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-60 transition-all flex items-center gap-2"
                >
                  {changingPass ? 'Đang đổi mật khẩu...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
