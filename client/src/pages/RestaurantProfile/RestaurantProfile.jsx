import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, CircleAlert, CloudCheck, Lightbulb, RefreshCw } from 'lucide-react'
import restaurantApi from '../../api/restaurantApi.js'
import uploadApi from '../../api/uploadApi.js'
import { DEFAULT_PREP_TIME, DEFAULT_SHIFT, MAX_CATEGORIES, WEEK_DAYS } from './constants.js'
import ImageSection from './components/ImageSection.jsx'
import BasicInfoSection from './components/BasicInfoSection.jsx'
import OpeningHoursSection from './components/OpeningHoursSection.jsx'
import PrepTimeSection from './components/PrepTimeSection.jsx'
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
    prepTime: restaurant?.prepTime || DEFAULT_PREP_TIME,
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

// An image uploaded for a save that then failed and was abandoned: free it (the server refuses images in use)
const discardUpload = (url) => {
  if (url) uploadApi.deleteUnusedImage(url).catch(() => {})
}

export default function RestaurantProfile() {
  const { restaurant, setRestaurant } = useOutletContext()

  const [savedForm, setSavedForm] = useState(() => toFormState(restaurant))
  const [form, setForm] = useState(savedForm)
  // Images chosen but not saved yet: { file, previewUrl, uploadedUrl? }. uploadedUrl is set once uploaded,
  // so retrying a failed save reuses the upload instead of sending the file again
  const [pendingCover, setPendingCover] = useState(null)
  const [pendingLogo, setPendingLogo] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  // The profile was changed elsewhere (other tab / device) after this form was loaded
  const [conflict, setConflict] = useState(false)

  // Leaving the page: free the previews and the uploads that were never saved
  const pendingRef = useRef([])
  useEffect(() => {
    pendingRef.current = [pendingCover, pendingLogo]
  }, [pendingCover, pendingLogo])
  useEffect(
    () => () => {
      for (const pending of pendingRef.current) {
        if (!pending) continue
        URL.revokeObjectURL(pending.previewUrl)
        discardUpload(pending.uploadedUrl)
      }
    },
    [],
  )

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
      if (prev) {
        URL.revokeObjectURL(prev.previewUrl)
        discardUpload(prev.uploadedUrl) // replaced before it was ever saved
      }
      return { file, previewUrl: URL.createObjectURL(file) }
    })
  }

  // saved = the uploads now belong to the profile; otherwise they are discarded
  const clearPendingImages = ({ saved = false } = {}) => {
    for (const pending of [pendingCover, pendingLogo]) {
      if (!pending) continue
      URL.revokeObjectURL(pending.previewUrl)
      if (!saved) discardUpload(pending.uploadedUrl)
    }
    setPendingCover(null)
    setPendingLogo(null)
  }

  const handleCancel = () => {
    setForm(savedForm)
    setErrors({})
    clearPendingImages()
  }

  // Upload once; a retry after a failed save reuses the URL already uploaded
  const uploadPending = async (pending, setPending) => {
    if (pending.uploadedUrl) return pending.uploadedUrl
    const url = (await uploadApi.uploadImage(pending.file, 'restaurants')).data.url
    setPending((prev) => (prev?.file === pending.file ? { ...prev, uploadedUrl: url } : prev))
    return url
  }

  // Conflict: load the latest saved profile (the changes typed here are dropped on purpose)
  const reloadLatest = async () => {
    try {
      const response = await restaurantApi.getMyRestaurant()
      const nextForm = toFormState(response.data)
      setRestaurant(response.data)
      setSavedForm(nextForm)
      setForm(nextForm)
      setErrors({})
      clearPendingImages()
      setConflict(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không tải được hồ sơ mới nhất')
    }
  }

  // Same rule as the server: a suspended restaurant cannot change its profile (and must not upload images for it)
  const isSuspended = restaurant?.status === 'suspended'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSuspended) return
    setSaving(true)
    setErrors({})

    try {
      // expectedUpdatedAt: the server refuses to overwrite a profile changed after this form was loaded
      const payload = { ...form, ...(restaurant?.updatedAt && { expectedUpdatedAt: restaurant.updatedAt }) }
      // Upload new images to Cloudinary first, then save their URLs with the profile
      if (pendingCover) {
        payload.coverImage = await uploadPending(pendingCover, setPendingCover)
      }
      if (pendingLogo) {
        payload.logo = await uploadPending(pendingLogo, setPendingLogo)
      }

      const response = await restaurantApi.updateMyRestaurant(payload)
      const nextForm = toFormState(response.data)

      setRestaurant(response.data)
      setSavedForm(nextForm)
      setForm(nextForm)
      clearPendingImages({ saved: true })
      toast.success(response.message || 'Đã lưu thay đổi')
    } catch (error) {
      const data = error.response?.data
      // 409 without field errors = the profile was saved elsewhere meanwhile (field 409s are duplicates)
      if (error.response?.status === 409 && !data?.errors?.length) setConflict(true)
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
            {restaurant?.status === 'approved' ? (
              <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Đã xác thực
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Chờ xác thực
              </span>
            )}
          </section>

          {isSuspended && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Nhà hàng đang bị tạm ngưng hoạt động nên không thể thay đổi hồ sơ.
                {restaurant.statusChange?.note && ` Lý do: ${restaurant.statusChange.note}.`} Vui lòng liên hệ quản trị viên.
              </span>
            </div>
          )}

          {conflict && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <span>Hồ sơ vừa được cập nhật ở nơi khác. Tải bản mới nhất rồi chỉnh sửa lại để không ghi đè thay đổi đó.</span>
              <button
                type="button"
                onClick={reloadLatest}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tải bản mới nhất
              </button>
            </div>
          )}

          <ImageSection
            coverUrl={coverUrl}
            logoUrl={logoUrl}
            errors={errors}
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

          <PrepTimeSection
            prepTime={form.prepTime}
            error={errors.prepTime}
            onChange={(prepTime) => handleFieldChange('prepTime', prepTime)}
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
                disabled={!isDirty || saving || isSuspended}
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
            isVerified={restaurant?.status === 'approved'}
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
