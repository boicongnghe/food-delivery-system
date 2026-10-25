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
  ShieldCheck,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'

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

const SAMPLE_ADDRESSES = [
  '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
  '123 Nguyễn Thị Minh Khai, P.6, Quận 3, TP.HCM',
  'Phòng 402, Tòa Nhà Bitexco, Bến Nghé, Q.1, TP.HCM',
  'Tòa Landmark 81, Vinhomes Central Park, Q.Bình Thạnh, TP.HCM',
]

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [avatar, setAvatar] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const isCustomer = user?.role === 'customer'
  const isRestaurant = user?.role === 'restaurant_owner'
  const isShipper = user?.role === 'shipper'

  useEffect(() => {
    if (isOpen && user) {
      setAvatar(user.avatar || '')
      setPhone(user.phone || '')
      setDeliveryAddress(
        user.deliveryAddress ||
          (user.addresses?.[0]?.street
            ? `${user.addresses[0].street}${user.addresses[0].district ? ', ' + user.addresses[0].district : ''}`
            : '')
      )
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const handleImageFileChange = (e) => {
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

    const reader = new FileReader()
    reader.onload = () => {
      setAvatar(reader.result)
      toast.success('Đã tải ảnh lên thành công!')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Build payload strictly adhering to rules:
    // Customer: avatar, phone, deliveryAddress
    // Restaurant: avatar ONLY
    // Shipper: avatar ONLY
    const payload = {
      avatar: avatar.trim(),
    }

    if (isCustomer) {
      payload.phone = phone.trim()
      payload.deliveryAddress = deliveryAddress.trim()
    }

    const result = await updateProfile(payload)
    setLoading(false)

    if (result.success) {
      toast.success(result.message || 'Cập nhật thông tin cá nhân thành công!')
      onClose()
    } else {
      toast.error(result.message || 'Cập nhật thông tin thất bại')
    }
  }

  const avatarPresets = PRESET_AVATARS[user.role] || PRESET_AVATARS.customer

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col my-auto">
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
                {isCustomer
                  ? 'Thông tin cá nhân & Địa chỉ nhận hàng'
                  : isRestaurant
                  ? 'Đổi ảnh đại diện Quán ăn'
                  : 'Đổi ảnh đại diện Tài xế'}
              </h3>
              <p className="text-xs text-slate-500">
                {isCustomer
                  ? 'Chỉnh sửa ảnh đại diện, số điện thoại và địa chỉ giao hàng'
                  : 'Cập nhật ảnh đại diện hồ sơ đại diện của bạn'}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Avatar Upload & Selection (ALL ROLES) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Ảnh đại diện hồ sơ <span className="text-red-500">*</span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              {/* Avatar Live Preview */}
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

              {/* Upload Buttons */}
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
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-primary text-slate-700 hover:text-primary text-xs font-bold transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" /> Tải ảnh từ thiết bị
                </button>
                <p className="text-[11px] text-slate-400">
                  Hỗ trợ JPG, PNG, WEBP dung lượng tối đa 5MB.
                </p>
              </div>
            </div>

            {/* Quick Preset Avatars */}
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

          {/* Section 2: KHÁCH HÀNG (CUSTOMER ONLY) */}
          {isCustomer && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Thông tin liên hệ & Giao nhận
              </h4>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="cust-phone">
                  Số điện thoại nhận hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="cust-phone"
                    type="tel"
                    name="phone"
                    placeholder="0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="cust-address">
                  Địa chỉ nhận hàng mặc định <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <textarea
                    id="cust-address"
                    name="deliveryAddress"
                    rows={2}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, thành phố..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Quick Sample Addresses */}
                <div className="mt-2">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    💡 Địa chỉ giao hàng mẫu (Bấm để chọn nhanh):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_ADDRESSES.map((addr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDeliveryAddress(addr)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-primary text-slate-700 transition-colors border border-slate-200/80 text-left truncate max-w-full"
                      >
                        {addr}
                      </button>
                    ))}
                  </div>
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
                  {isRestaurant
                    ? 'Quyền hạn tài khoản Nhà Hàng:'
                    : 'Quyền hạn tài khoản Đối tác Tài Xế:'}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {isRestaurant
                    ? 'Bạn có thể thay đổi ảnh đại diện của quán bất cứ lúc nào. Các thông tin kinh doanh pháp lý (Tên quán, CCCD chủ quán, Giấy phép kinh doanh) được cố định để đảm bảo tính minh bạch.'
                    : 'Bạn có thể cập nhật ảnh đại diện tài xế. Thông tin số CCCD, ngày sinh và phương tiện di chuyển được quản lý theo hồ sơ xác minh đối tác vận chuyển.'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang lưu thay đổi...
                </>
              ) : (
                'Lưu thông tin'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
