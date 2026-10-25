import { useRef } from 'react'
import toast from 'react-hot-toast'
import { ImagePlus, Upload } from 'lucide-react'
import { MAX_IMAGE_SIZE } from '../constants.js'
import FormLabel from './FormLabel.jsx'

// Section 1 of the form: square dish photo. The file is uploaded when the form is saved.
export default function MenuImagePicker({ imageUrl, fileName, error, onSelect }) {
  const inputRef = useRef(null)

  const handleChange = (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Ảnh vượt quá 5MB, vui lòng chọn ảnh nhỏ hơn')
      return
    }
    onSelect(file)
  }

  return (
    <section className="rounded-lg border border-brand-soft/70 p-4">
      <FormLabel number={1} label="Ảnh đại diện món ăn" required hint="JPG/PNG/WEBP, tỉ lệ 1:1, tối đa 5MB" />

      <div className="mt-2 flex gap-4">
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border-2 border-dashed bg-brand-light ${
            error ? 'border-red-400' : 'border-brand-soft'
          } hover:border-brand`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Ảnh món" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
              <ImagePlus className="h-7 w-7" />
              <span className="text-[11px] font-semibold">1:1</span>
            </span>
          )}
        </button>

        <div className="min-w-0 space-y-2">
          <p className="text-sm text-slate-600">
            Tải ảnh thực tế của món ăn để hiển thị trên ứng dụng khách hàng và màn hình gọi món.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-soft bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-brand-light"
            >
              <Upload className="h-4 w-4 text-brand" />
              {imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
            </button>
            <span className="truncate text-xs text-slate-500">{fileName || (imageUrl ? 'Ảnh hiện tại' : 'Chưa có tệp nào')}</span>
          </div>
          <p className="text-xs italic text-slate-500">
            * Khuyến cáo: chụp góc nghiêng 45 độ hoặc từ trên xuống dưới ánh sáng tự nhiên.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
    </section>
  )
}
