import { useRef } from 'react'
import toast from 'react-hot-toast'
import { Camera, ImageIcon } from 'lucide-react'
import { MAX_IMAGE_SIZE } from '../constants.js'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

export default function ImageSection({ coverUrl, logoUrl, onCoverChange, onLogoChange }) {
  const coverInputRef = useRef(null)
  const logoInputRef = useRef(null)

  const handleFileChange = (event, onChange) => {
    const file = event.target.files[0]
    event.target.value = '' // allow choosing the same file again
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Ảnh vượt quá 5MB, vui lòng chọn ảnh nhỏ hơn')
      return
    }
    onChange(file)
  }

  return (
    <section className="bg-white rounded-xl border border-brand-soft/60 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-900">Hình ảnh đại diện &amp; bìa quán</h2>
        <span className="text-xs text-slate-500">Tỉ lệ khuyến nghị 16:9 (tối thiểu 1200 x 675px)</span>
      </div>

      <div className="relative aspect-[16/7] rounded-lg overflow-hidden bg-brand-light">
        {coverUrl ? (
          <img src={coverUrl} alt="Ảnh bìa quán" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <ImageIcon className="w-10 h-10" />
            <span className="text-sm">Chưa có ảnh bìa</span>
          </div>
        )}

        {/* Bottom gradient so the white text stays readable */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={() => coverInputRef.current.click()}
          className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 shadow hover:bg-brand-light"
        >
          <Camera className="w-4 h-4 text-brand" />
          Đổi ảnh bìa
        </button>

        <div className="absolute left-4 bottom-4 flex items-end gap-3">
          <button
            type="button"
            onClick={() => logoInputRef.current.click()}
            title="Đổi logo"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-white p-1.5 shadow-lg overflow-hidden hover:ring-2 hover:ring-brand"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo quán" className="w-full h-full object-cover rounded" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-slate-400">
                <Camera className="w-6 h-6" />
              </span>
            )}
          </button>
          <div className="pb-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            <p className="text-sm font-semibold text-white">Logo nhận diện</p>
            <p className="hidden sm:block text-xs text-white/90">Hiển thị tròn 1:1 trên danh sách tìm kiếm</p>
          </div>
        </div>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => handleFileChange(event, onCoverChange)}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => handleFileChange(event, onLogoChange)}
      />
    </section>
  )
}
