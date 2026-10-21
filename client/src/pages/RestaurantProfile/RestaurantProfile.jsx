import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, CircleAlert, CloudCheck, Lightbulb } from 'lucide-react'
import restaurantApi from '../../api/restaurantApi.js'
import uploadApi from '../../api/uploadApi.js'
import { DEFAULT_SHIFT, MAX_CATEGORIES, WEEK_DAYS } from './constants.js'
import ImageSection from './components/ImageSection.jsx'
import BasicInfoSection from './components/BasicInfoSection.jsx'
import OpeningHoursSection from './components/OpeningHoursSection.jsx'
import RestaurantPreviewCard from './components/RestaurantPreviewCard.jsx'

// Build editable form data from the API restaurant (or empty defaults for a new profile)
function toFormState(restaurant) {
  return {
    name: restaurant?.name || '',
    description: restaurant?.description || '',
    address: restaurant?.address || '',
    phone: restaurant?.phone || '',
    categories: restaurant?.categories || [],
    logo: restaurant?.logo || '',
    coverImage: restaurant?.coverImage || '',
    openingHours: WEEK_DAYS.map(({ dayOfWeek }) => {
      const saved = restaurant?.openingHours?.find((day) => day.dayOfWeek === dayOfWeek)
      return saved
        ? { dayOfWeek, isOpen: saved.isOpen, shifts: saved.shifts.map(({ open, close }) => ({ open, close })) }
        : { dayOfWeek, isOpen: true, shifts: [{ ...DEFAULT_SHIFT }] }
    }),
  }
}

// API errors look like [{ field: 'openingHours.0.shifts.0', message }]
function toFieldErrors(apiErrors = []) {
  return apiErrors.reduce((result, { field, message }) => {
    const key = field.split('.')[0]
    if (!result[key]) result[key] = message
    return result
  }, {})
}

export default function RestaurantProfile() {
  const { restaurant, setRestaurant } = useOutletContext()

  const [savedForm, setSavedForm] = useState(() => toFormState(restaurant))
  const [form, setForm] = useState(savedForm)
  // Images chosen but not uploaded yet: { file, previewUrl }
  const [pendingCover, setPendingCover] = useState(null)
  const [pendingLogo, setPendingLogo] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(savedForm) || Boolean(pendingCover) || Boolean(pendingLogo)

  const coverUrl = pendingCover?.previewUrl || form.coverImage
  const logoUrl = pendingLogo?.previewUrl || form.logo

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleToggleCategory = (category) => {
    if (form.categories.includes(category)) {
      handleFieldChange('categories', form.categories.filter((item) => item !== category))
      return
    }
    if (form.categories.length >= MAX_CATEGORIES) {
      toast.error(`Chỉ chọn tối đa ${MAX_CATEGORIES} phân loại`)
      return
    }
    handleFieldChange('categories', [...form.categories, category])
  }

  const selectImage = (file, setPending) => {
    setPending((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return { file, previewUrl: URL.createObjectURL(file) }
    })
  }

  const clearPendingImages = () => {
    if (pendingCover) URL.revokeObjectURL(pendingCover.previewUrl)
    if (pendingLogo) URL.revokeObjectURL(pendingLogo.previewUrl)
    setPendingCover(null)
    setPendingLogo(null)
  }

  const handleCancel = () => {
    setForm(savedForm)
    setErrors({})
    clearPendingImages()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      const payload = { ...form }
      // Upload new images to Cloudinary first, then save their URLs with the profile
      if (pendingCover) {
        payload.coverImage = (await uploadApi.uploadImage(pendingCover.file, 'restaurants')).data.url
      }
      if (pendingLogo) {
        payload.logo = (await uploadApi.uploadImage(pendingLogo.file, 'restaurants')).data.url
      }

      const response = await restaurantApi.updateMyRestaurant(payload)
      const nextForm = toFormState(response.data)

      setRestaurant(response.data)
      setSavedForm(nextForm)
      setForm(nextForm)
      clearPendingImages()
      toast.success(response.message || 'Đã lưu thay đổi')
    } catch (error) {
      const data = error.response?.data
      setErrors(toFieldErrors(data?.errors))
      toast.error(data?.message || 'Không lưu được thay đổi, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* Left column: edit form */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-brand-soft/60 shadow-sm p-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-semibold text-slate-900">Hồ Sơ Nhà Hàng</h1>
              <p className="mt-1 text-sm text-slate-600">Thiết lập thông tin hiển thị trên ứng dụng thực khách</p>
            </div>
            {restaurant?.isVerified ? (
              <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Đã xác thực
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Chờ xác thực
              </span>
            )}
          </section>

          <ImageSection
            coverUrl={coverUrl}
            logoUrl={logoUrl}
            onCoverChange={(file) => selectImage(file, setPendingCover)}
            onLogoChange={(file) => selectImage(file, setPendingLogo)}
          />

          <BasicInfoSection
            form={form}
            errors={errors}
            onFieldChange={handleFieldChange}
            onToggleCategory={handleToggleCategory}
          />

          <OpeningHoursSection
            openingHours={form.openingHours}
            error={errors.openingHours}
            onChange={(openingHours) => handleFieldChange('openingHours', openingHours)}
          />

          {/* Action bar */}
          <div className="bg-white rounded-xl border border-brand-soft/60 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            {isDirty ? (
              <span className="inline-flex items-center gap-2 text-xs text-amber-700">
                <CircleAlert className="w-4 h-4" />
                Bạn có thay đổi chưa lưu
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <CloudCheck className="w-4 h-4 text-emerald-600" />
                Tất cả thay đổi đã được lưu
              </span>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={!isDirty || saving}
                className="rounded-md bg-brand-light px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-soft disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: live preview */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <RestaurantPreviewCard
            form={form}
            coverUrl={coverUrl}
            isVerified={restaurant?.isVerified}
            rating={restaurant?.rating || 0}
            ratingCount={restaurant?.ratingCount || 0}
          />

          <div className="flex gap-3 rounded-xl border border-brand-soft/60 bg-brand-light p-4 text-xs leading-relaxed text-slate-600">
            <Lightbulb className="w-5 h-5 shrink-0 text-amber-500" />
            <p>
              <strong className="text-slate-800">Mẹo hữu ích:</strong> Hình ảnh rõ nét chuẩn ánh sáng tự nhiên và giờ
              mở cửa chính xác giúp tăng <strong className="text-brand">30% tỷ lệ chốt đơn</strong> từ khách hàng quen
              trên phố.
            </p>
          </div>
        </aside>
      </div>
    </form>
  )
}
