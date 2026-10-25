import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Upload, CheckCircle2, X, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import uploadApi from '../../api/uploadApi.js'

const PRESET_AVATARS = {
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

export default function AvatarModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth()
  const fileInputRef = useRef(null)
  const [avatar, setAvatar] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const isRestaurant = user?.role === 'restaurant_owner'

  useEffect(() => {
    if (isOpen && user) {
      setAvatar(user.avatar || '')
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP)!')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await updateProfile({ avatar: avatar.trim() })
    setLoading(false)

    if (result.success) {
      toast.success(
        isRestaurant
          ? 'Cập nhật ảnh đại diện quán ăn thành công!'
          : 'Cập nhật ảnh đại diện tài xế thành công!'
      )
      onClose()
    } else {
      toast.error(result.message || 'Cập nhật ảnh đại diện thất bại')
    }
  }

  const presets = PRESET_AVATARS[user.role] || PRESET_AVATARS.restaurant_owner

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                isRestaurant ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isRestaurant ? 'Chỉnh sửa ảnh Quán Ăn' : 'Chỉnh sửa ảnh Tài Xế'}
              </h3>
              <p className="text-xs text-slate-500">Thay đổi ảnh đại diện trong hồ sơ quản lý</p>
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="relative flex-shrink-0">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80'}
                alt="Avatar"
                className={`w-20 h-20 rounded-2xl object-cover ring-4 shadow-md ${
                  isRestaurant ? 'ring-amber-400/30' : 'ring-emerald-500/30'
                }`}
              />
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
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
              <p className="text-[11px] text-slate-400">Lưu trữ trên Cloudinary CDN (JPG, PNG, WEBP tối đa 5MB)</p>
            </div>
          </div>

          {/* Preset Avatars */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 block mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Chọn nhanh avatar mẫu:
            </span>
            <div className="flex flex-wrap gap-2.5">
              {presets.map((presetUrl, idx) => {
                const isSelected = avatar === presetUrl
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(presetUrl)}
                    className={`relative rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? `ring-3 scale-105 shadow-md ${
                            isRestaurant ? 'ring-amber-500' : 'ring-emerald-500'
                          }`
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img
                      src={presetUrl}
                      alt={`Preset ${idx}`}
                      className="w-11 h-11 object-cover rounded-xl"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center text-white">
                        <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
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
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-[0.99] disabled:opacity-60 transition-all flex items-center gap-2 ${
                isRestaurant
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang lưu...
                </>
              ) : (
                'Lưu ảnh đại diện'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
