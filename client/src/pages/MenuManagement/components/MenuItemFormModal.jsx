import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import menuApi from '../../../api/menuApi.js'
import uploadApi from '../../../api/uploadApi.js'
import { createKey } from '../../../utils/createKey.js'
import { formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'
import { DESCRIPTION_MAX_LENGTH, MENU_TAGS, NAME_MAX_LENGTH } from '../constants.js'
import FieldError from './FieldError.jsx'
import FormLabel from './FormLabel.jsx'
import MenuImagePicker from './MenuImagePicker.jsx'
import OptionGroupEditor from './OptionGroupEditor.jsx'
import StatusChoice from './StatusChoice.jsx'

const inputClass =
  'w-full rounded-md border border-brand-soft bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15'

// Form values are kept as strings for number inputs ('' = empty)
function toFormState(item, defaultCategoryId) {
  return {
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category?._id || item?.category || defaultCategoryId || '',
    sortOrder: item?.sortOrder ? String(item.sortOrder) : '',
    price: item?.price ? String(item.price) : '',
    originalPrice: item?.originalPrice ? String(item.originalPrice) : '',
    description: item?.description || '',
    image: item?.image || '',
    tags: item?.tags || [],
    isAvailable: item?.isAvailable ?? true,
    isVisible: item?.isVisible ?? true,
    // _key: stable React key so removing a row in the middle keeps the other inputs intact
    optionGroups: (item?.optionGroups || []).map((group) => ({
      ...group,
      _key: createKey(),
      options: group.options.map((option) => ({ ...option, _key: createKey() })),
    })),
  }
}

function toPayload(form) {
  return {
    ...form,
    optionGroups: form.optionGroups.map(({ _key, options, ...group }) => ({
      ...group,
      options: options.map(({ _key: _optionKey, ...option }) => option),
    })),
    sku: form.sku.trim(),
    sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
    price: form.price ? Number(form.price) : null,
    originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
  }
}

// API errors: [{ field: 'optionGroups.0.options.1.name', message }] -> { optionGroups: message }
function toFieldErrors(apiErrors = []) {
  return apiErrors.reduce((result, { field, message }) => {
    const key = field.split('.')[0]
    if (!result[key]) result[key] = message
    return result
  }, {})
}

/**
 * Add / edit menu item (UC20.1, UC20.3).
 * @param {object|null} item - item to edit, null to create
 */
export default function MenuItemFormModal({ item, categories, defaultCategoryId, onClose, onSaved }) {
  const isEdit = Boolean(item)
  const [initialForm] = useState(() => toFormState(item, defaultCategoryId))
  const [form, setForm] = useState(initialForm)
  const [pendingImage, setPendingImage] = useState(null) // { file, previewUrl }
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  // Image uploaded to Cloudinary in this form but not saved with a dish yet
  const unsavedUploadRef = useRef(null)

  const isDirty = Boolean(pendingImage) || JSON.stringify(form) !== JSON.stringify(initialForm)

  const discount =
    Number(form.originalPrice) > Number(form.price) && Number(form.price) > 0
      ? Math.round((1 - Number(form.price) / Number(form.originalPrice)) * 100)
      : 0

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const toggleTag = (tag) => {
    setField('tags', form.tags.includes(tag) ? form.tags.filter((value) => value !== tag) : [...form.tags, tag])
  }

  const selectImage = (file) => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) })
    setErrors((prev) => ({ ...prev, image: undefined }))
  }

  // Remove an uploaded-but-unsaved image from Cloudinary (best effort, never blocks the user)
  const discardUnsavedUpload = () => {
    if (!unsavedUploadRef.current) return
    uploadApi.deleteUnusedImage(unsavedUploadRef.current).catch(() => {})
    unsavedUploadRef.current = null
  }

  const requestClose = () => {
    if (saving) return
    if (isDirty && !window.confirm('Bạn có thay đổi chưa lưu. Đóng biểu mẫu?')) return
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    discardUnsavedUpload()
    onClose()
  }

  const save = async (addAnother) => {
    if (saving) return
    if (!form.image && !pendingImage) {
      setErrors((prev) => ({ ...prev, image: 'Vui lòng tải ảnh món ăn' }))
      toast.error('Vui lòng tải ảnh món ăn')
      return
    }

    setSaving(true)
    setErrors({})
    try {
      const payload = toPayload(form)
      if (pendingImage) {
        payload.image = (await uploadApi.uploadImage(pendingImage.file, 'menu-items')).data.url
        // A previous attempt uploaded another photo that was never saved -> remove it
        discardUnsavedUpload()
        unsavedUploadRef.current = payload.image
        // Keep the uploaded URL so a retry (e.g. after a duplicate SKU error) does not upload again
        URL.revokeObjectURL(pendingImage.previewUrl)
        setPendingImage(null)
        setForm((prev) => ({ ...prev, image: payload.image }))
      }

      const response = isEdit
        ? await menuApi.updateMenuItem(item._id, payload)
        : await menuApi.createMenuItem(payload)

      unsavedUploadRef.current = null // saved: the image now belongs to the dish
      toast.success(response.message)
      onSaved()

      if (addAnother) {
        // Keep the category so the owner can add several dishes in a row
        setForm(toFormState(null, form.category))
      } else {
        onClose()
      }
    } catch (error) {
      const data = error.response?.data
      setErrors(toFieldErrors(data?.errors))
      toast.error(data?.message || 'Không lưu được món ăn, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  // Keyboard shortcuts: Esc = close, Ctrl/Cmd + S = submit (runs the browser "required" checks too).
  // The ref keeps the latest requestClose so the listener is added only once.
  const formRef = useRef(null)
  const requestCloseRef = useRef(requestClose)
  useEffect(() => {
    requestCloseRef.current = requestClose
  })
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        requestCloseRef.current()
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        formRef.current.requestSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    save(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 sm:p-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="w-full max-w-6xl bg-white shadow-2xl sm:rounded-xl min-h-screen sm:min-h-0"
        aria-modal="true"
        role="dialog"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 border-b border-brand-soft/60 bg-brand-light/60 px-6 py-4 sm:rounded-t-xl">
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            {isEdit ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới vào thực đơn'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              Trường dấu <span className="text-brand">*</span> là bắt buộc
            </span>
            <button type="button" onClick={requestClose} title="Đóng (Esc)" className="rounded p-1.5 text-slate-500 hover:bg-brand-soft">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Left column: sections 1-9 */}
          <div className="space-y-5">
            <MenuImagePicker
              imageUrl={pendingImage?.previewUrl || form.image}
              fileName={pendingImage?.file.name}
              error={errors.image}
              onSelect={selectImage}
            />

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div>
                <FormLabel number={2} htmlFor="item-name" label="Tên món ăn" required hint={`${form.name.length}/${NAME_MAX_LENGTH} ký tự`} />
                <input
                  id="item-name"
                  required
                  maxLength={NAME_MAX_LENGTH}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="VD: Phở Bò Tái Lăn Hà Nội"
                  className={inputClass}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <FormLabel number={3} htmlFor="item-sku" label="Mã SKU / mã bếp" hint="Tùy chọn" />
                <input
                  id="item-sku"
                  maxLength={20}
                  value={form.sku}
                  onChange={(e) => setField('sku', e.target.value.toUpperCase())}
                  placeholder="PB-01"
                  className={`${inputClass} font-mono`}
                />
                <FieldError message={errors.sku} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div>
                <FormLabel number={4} htmlFor="item-category" label="Danh mục thực đơn" required />
                <select
                  id="item-category"
                  required
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    -- Chọn danh mục --
                  </option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.category} />
              </div>
              <div>
                <FormLabel number={5} htmlFor="item-sort" label="Thứ tự hiển thị" />
                <input
                  id="item-sort"
                  type="number"
                  min={1}
                  value={form.sortOrder}
                  onChange={(e) => setField('sortOrder', e.target.value)}
                  placeholder="Cuối danh mục"
                  className={inputClass}
                />
                <FieldError message={errors.sortOrder} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormLabel number={6} htmlFor="item-price" label="Giá bán thực tế (VNĐ)" required />
                <div className="relative">
                  <input
                    id="item-price"
                    required
                    inputMode="numeric"
                    value={formatNumber(form.price)}
                    onChange={(e) => setField('price', parseNumberInput(e.target.value))}
                    placeholder="65.000"
                    className={`${inputClass} border-slate-800 pr-14 text-base font-bold`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">VNĐ</span>
                </div>
                <FieldError message={errors.price} />
              </div>
              <div>
                <FormLabel
                  number={7}
                  htmlFor="item-original-price"
                  label="Giá gốc / gạch đi (VNĐ)"
                  hint={discount > 0 ? `Giảm ${discount}%` : ''}
                />
                <div className="relative">
                  <input
                    id="item-original-price"
                    inputMode="numeric"
                    value={formatNumber(form.originalPrice)}
                    onChange={(e) => setField('originalPrice', parseNumberInput(e.target.value))}
                    placeholder="Không bắt buộc"
                    className={`${inputClass} pr-14`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">VNĐ</span>
                </div>
                <FieldError message={errors.originalPrice} />
              </div>
            </div>

            <div>
              <FormLabel
                number={8}
                htmlFor="item-description"
                label="Mô tả món ăn"
                hint={`${form.description.length}/${DESCRIPTION_MAX_LENGTH} ký tự`}
              />
              <textarea
                id="item-description"
                rows={3}
                maxLength={DESCRIPTION_MAX_LENGTH}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Nguyên liệu, cách chế biến, hương vị đặc trưng..."
                className={`${inputClass} resize-none`}
              />
              <FieldError message={errors.description} />
            </div>

            <div>
              <FormLabel number={9} label="Nhãn gắn đặc trưng" />
              <div className="flex flex-wrap gap-2">
                {MENU_TAGS.map((tag) => {
                  const isSelected = form.tags.includes(tag.value)
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleTag(tag.value)}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                        isSelected ? 'bg-brand text-white' : 'border border-brand-soft bg-white text-slate-600 hover:bg-brand-light'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {tag.label}
                    </button>
                  )
                })}
              </div>
              <FieldError message={errors.tags} />
            </div>
          </div>

          {/* Right column: sections 10-11 */}
          <div className="space-y-5">
            <OptionGroupEditor
              groups={form.optionGroups}
              error={errors.optionGroups}
              onChange={(groups) => setField('optionGroups', groups)}
            />

            <section className="space-y-3 rounded-lg border border-brand-soft/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-800">11. Thiết lập tình trạng bán hàng</p>
              <StatusChoice
                title="Tình trạng phục vụ của bếp"
                description="Bật để nhận đơn ngay, tắt khi hết nguyên liệu trong ca"
                value={form.isAvailable}
                onChange={(value) => setField('isAvailable', value)}
                onLabel="Còn món"
                offLabel="Hết món"
              />
              <StatusChoice
                title="Hiển thị trên ứng dụng khách"
                description="Cho phép khách hàng nhìn thấy và thêm vào giỏ hàng"
                value={form.isVisible}
                onChange={(value) => setField('isVisible', value)}
                onLabel="Hiển thị"
                offLabel="Ẩn món"
              />
            </section>
          </div>
        </div>

        {/* Action bar */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-brand-soft/60 bg-white px-6 py-4 sm:rounded-b-xl">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="rounded-md bg-brand-light px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-soft disabled:opacity-50"
          >
            Hủy bỏ <span className="text-xs text-slate-400">(Esc)</span>
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="rounded-md border border-brand px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand-light disabled:opacity-50"
            >
              Lưu &amp; thêm món tiếp
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving ? 'Đang lưu...' : 'Lưu món ăn'}
            <span className="text-xs font-normal text-white/70">(Ctrl+S)</span>
          </button>
        </div>
      </form>
    </div>
  )
}
