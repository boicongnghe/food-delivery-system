import { useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import complaintApi from '../../api/complaintApi.js'
import uploadApi from '../../api/uploadApi.js'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js'
import { COMPLAINT_CATEGORY_LABELS } from '../../utils/feedbackLabels.js'
import OrderBrief from '../OrderBrief/OrderBrief.jsx'
import EvidencePicker from './EvidencePicker.jsx'

const DESCRIPTION_MIN_LENGTH = 10
const DESCRIPTION_MAX_LENGTH = 1000
const MAX_IMAGES = 3
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Photos uploaded in the form but never sent with a complaint
const discardUploads = (urls) => urls.forEach((url) => uploadApi.deleteUnusedImage(url).catch(() => {}))

/**
 * UC18 - complain about a delivered or cancelled order (one complaint per order, answered by an admin in UC42).
 * @param {object} order - { _id, orderCode, restaurant, items }
 * @param {(complaint: object) => void} onSubmitted - called after the complaint is saved (close the modal there)
 */
export default function ComplaintFormModal({ order, onClose, onSubmitted }) {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const close = () => {
    if (saving || uploading) return
    discardUploads(images)
    onClose()
  }
  useKeyboardShortcuts({ Escape: close })

  const setError = (field, message) => setErrors((prev) => ({ ...prev, [field]: message }))

  const handleAddImage = async (file) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('images', 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('images', 'Ảnh tối đa 5MB')
      return
    }
    setUploading(true)
    setError('images', '')
    try {
      const response = await uploadApi.uploadImage(file, 'complaints')
      setImages((prev) => [...prev, response.data.url])
    } catch (error) {
      setError('images', error.response?.data?.message || 'Không tải được ảnh, vui lòng thử lại')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (url) => {
    setImages((prev) => prev.filter((item) => item !== url))
    discardUploads([url])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!category) nextErrors.category = 'Vui lòng chọn loại khiếu nại'
    if (description.trim().length < DESCRIPTION_MIN_LENGTH) {
      nextErrors.description = `Mô tả ít nhất ${DESCRIPTION_MIN_LENGTH} ký tự`
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const response = await complaintApi.createComplaint(order._id, {
        category,
        description: description.trim(),
        images,
      })
      toast.success(response.message)
      onSubmitted(response.data)
    } catch (error) {
      // "images.0" -> "images"
      const apiErrors = error.response?.data?.errors || []
      setErrors(Object.fromEntries(apiErrors.map(({ field, message }) => [field.split('.')[0], message])))
      toast.error(error.response?.data?.message || 'Không gửi được khiếu nại')
      setSaving(false)
    }
  }

  // In document.body so a parent's space-y-* margin cannot shift the overlay
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={close}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Gửi khiếu nại"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Gửi khiếu nại</h2>
            <p className="text-xs text-slate-500">Ban quản trị sẽ xem xét và phản hồi bạn sớm nhất</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <OrderBrief order={order} />
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              Vấn đề bạn gặp phải <span className="text-primary">*</span>
            </p>
            <div role="radiogroup" aria-label="Loại khiếu nại" className="flex flex-wrap gap-2">
              {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={category === value}
                  onClick={() => {
                    setCategory(value)
                    setError('category', '')
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    category === value
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-primary/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="complaint-description" className="mb-2 block text-sm font-bold text-slate-800">
              Mô tả chi tiết <span className="text-primary">*</span>
            </label>
            <textarea
              id="complaint-description"
              rows={4}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                setError('description', '')
              }}
              placeholder="Ví dụ: Đơn thiếu 1 phần quẩy so với hóa đơn..."
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <div className="flex justify-between text-xs">
              <span className="text-red-600">{errors.description}</span>
              <span className="text-slate-400">
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>

          <EvidencePicker
            images={images}
            max={MAX_IMAGES}
            uploading={uploading}
            disabled={saving}
            error={errors.images}
            onAdd={handleAddImage}
            onRemove={handleRemoveImage}
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={close}
            disabled={saving || uploading}
            className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  )
}
