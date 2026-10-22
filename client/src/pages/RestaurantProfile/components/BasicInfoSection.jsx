import { Check, MapPin, Phone, Plus } from 'lucide-react'
import {
  CATEGORY_OPTIONS,
  DESCRIPTION_MAX_LENGTH,
  MAX_CATEGORIES,
  NAME_MAX_LENGTH,
} from '../constants.js'
import FieldLabel from './FieldLabel.jsx'
import FieldError from './FieldError.jsx'

const inputClass =
  'w-full rounded-md bg-brand-light border border-transparent px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/15'

export default function BasicInfoSection({ form, errors, onFieldChange, onToggleCategory }) {
  // Show preset options plus any saved category that is not in the preset list
  const categoryOptions = [...new Set([...CATEGORY_OPTIONS, ...form.categories])]

  return (
    <section className="bg-white rounded-xl border border-brand-soft/60 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b border-brand-soft/60">
        <h2 className="text-base font-bold text-slate-900">Thông tin cơ bản</h2>
        <span className="text-xs text-slate-500">Hiển thị ưu tiên hàng đầu</span>
      </div>

      <div className="space-y-5">
        <div>
          <FieldLabel
            htmlFor="name"
            label="Tên Quán Ăn / Nhà Hàng"
            required
            hint={`${form.name.length}/${NAME_MAX_LENGTH} ký tự`}
          />
          <input
            id="name"
            className={inputClass}
            value={form.name}
            maxLength={NAME_MAX_LENGTH}
            required
            placeholder="VD: Phở Bò Gia Truyền 1986"
            onChange={(e) => onFieldChange('name', e.target.value)}
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <FieldLabel
            htmlFor="description"
            label="Mô tả ngắn gọn"
            hint={`${form.description.length}/${DESCRIPTION_MAX_LENGTH} ký tự`}
          />
          <textarea
            id="description"
            rows={2}
            className={`${inputClass} resize-none`}
            value={form.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Giới thiệu ngắn về món đặc trưng của quán"
            onChange={(e) => onFieldChange('description', e.target.value)}
          />
          <FieldError message={errors.description} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="address" label="Địa chỉ chính xác" required />
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="address"
                className={`${inputClass} pl-10`}
                value={form.address}
                required
                placeholder="Số nhà, đường, phường, quận"
                onChange={(e) => onFieldChange('address', e.target.value)}
              />
            </div>
            <FieldError message={errors.address} />
          </div>

          <div>
            <FieldLabel htmlFor="phone" label="Số điện thoại quán" required />
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="phone"
                type="tel"
                className={`${inputClass} pl-10`}
                value={form.phone}
                required
                placeholder="0912 345 678"
                onChange={(e) => onFieldChange('phone', e.target.value)}
              />
            </div>
            <FieldError message={errors.phone} />
          </div>
        </div>

        <div>
          <FieldLabel label="Phân loại món & nhãn tìm kiếm" hint={`Tối đa ${MAX_CATEGORIES}`} />
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => {
              const isSelected = form.categories.includes(category)
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onToggleCategory(category)}
                  className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-brand text-white hover:bg-brand-hover'
                      : 'bg-brand-light text-slate-600 hover:text-brand'
                  }`}
                >
                  {!isSelected && <Plus className="w-3 h-3" />}
                  {category}
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </div>
          <FieldError message={errors.categories} />
        </div>
      </div>
    </section>
  )
}
