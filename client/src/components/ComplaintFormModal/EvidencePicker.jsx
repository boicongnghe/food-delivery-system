import { useRef } from 'react'
import { ImagePlus, LoaderCircle, X } from 'lucide-react'

/**
 * Evidence photos of a complaint: thumbnails + "Thêm ảnh" tile (the modal uploads the file).
 * @param {string[]} images - Cloudinary URLs already uploaded
 */
export default function EvidencePicker({ images, max, uploading, disabled, error, onAdd, onRemove }) {
  const inputRef = useRef(null)

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // picking the same file again still triggers onChange
    if (file) onAdd(file)
  }

  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-800">
        Ảnh minh chứng <span className="font-normal text-slate-400">(tối đa {max} ảnh, không bắt buộc)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
            <img src={url} alt="Ảnh minh chứng" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(url)}
              disabled={disabled}
              aria-label="Xóa ảnh"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-xs text-slate-500 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {uploading ? 'Đang tải' : 'Thêm ảnh'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
