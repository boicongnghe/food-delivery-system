import { Plus, Trash2, X } from 'lucide-react'
import { createKey } from '../../../utils/createKey.js'
import { formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'
import { MAX_OPTION_GROUPS, MAX_OPTIONS_PER_GROUP } from '../constants.js'

const inputClass =
  'rounded-md border border-brand-soft bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20'

const createOption = () => ({ _key: createKey(), name: '', price: 0 })
const createGroup = () => ({ _key: createKey(), name: '', isRequired: false, maxSelect: 1, options: [createOption()] })

// Section 10: option groups such as "Loại bánh phở" (required, pick 1) or "Topping" (optional, up to N)
export default function OptionGroupEditor({ groups, error, onChange }) {
  const updateGroup = (groupIndex, changes) => {
    onChange(groups.map((group, index) => (index === groupIndex ? { ...group, ...changes } : group)))
  }

  const updateOption = (groupIndex, optionIndex, changes) => {
    const options = groups[groupIndex].options.map((option, index) =>
      index === optionIndex ? { ...option, ...changes } : option,
    )
    updateGroup(groupIndex, { options })
  }

  const removeOption = (groupIndex, optionIndex) => {
    const group = groups[groupIndex]
    const options = group.options.filter((_, index) => index !== optionIndex)
    // Keep maxSelect valid when options are removed
    updateGroup(groupIndex, { options, maxSelect: Math.max(1, Math.min(group.maxSelect, options.length)) })
  }

  return (
    <section className="rounded-lg border border-brand-soft/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-800">10. Nhóm tùy chọn &amp; topping</p>
          <p className="text-xs text-slate-500">Topping, kích cỡ, định lượng...</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...groups, createGroup()])}
          disabled={groups.length >= MAX_OPTION_GROUPS}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-soft bg-white px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm nhóm
        </button>
      </div>

      {groups.length === 0 && (
        <p className="rounded-md bg-brand-light px-3 py-4 text-center text-xs text-slate-500">
          Món chưa có tùy chọn. Bấm "Thêm nhóm" nếu khách cần chọn loại bánh, size hoặc topping.
        </p>
      )}

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {groups.map((group, groupIndex) => (
          <div key={group._key} className="rounded-md border border-brand-soft bg-brand-light/40 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{String.fromCharCode(65 + groupIndex)}.</span>
              <input
                value={group.name}
                onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                placeholder="Tên nhóm (VD: Loại bánh phở)"
                maxLength={50}
                className={`${inputClass} min-w-0 flex-1 font-semibold`}
              />
              <button
                type="button"
                onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}
                title="Xóa nhóm"
                className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-700">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={group.isRequired}
                  onChange={(e) => updateGroup(groupIndex, { isRequired: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                Bắt buộc chọn
              </label>
              <label className="inline-flex items-center gap-1.5">
                Chọn tối đa
                <input
                  type="number"
                  min={1}
                  max={group.options.length || 1}
                  value={group.maxSelect}
                  onChange={(e) => updateGroup(groupIndex, { maxSelect: Math.max(1, Number(e.target.value) || 1) })}
                  className={`${inputClass} w-16 py-1`}
                />
              </label>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                {group.isRequired ? `Bắt buộc: chọn ${group.maxSelect}` : `Tùy chọn: tối đa ${group.maxSelect}`}
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {group.options.map((option, optionIndex) => (
                <div key={option._key} className="flex items-center gap-2">
                  <input
                    value={option.name}
                    onChange={(e) => updateOption(groupIndex, optionIndex, { name: e.target.value })}
                    placeholder="Tên lựa chọn"
                    maxLength={60}
                    className={`${inputClass} min-w-0 flex-1`}
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">+</span>
                    <input
                      inputMode="numeric"
                      value={formatNumber(option.price)}
                      onChange={(e) =>
                        updateOption(groupIndex, optionIndex, { price: Number(parseNumberInput(e.target.value)) || 0 })
                      }
                      className={`${inputClass} w-full pl-5 pr-6 text-right`}
                      aria-label="Giá cộng thêm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">đ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(groupIndex, optionIndex)}
                    disabled={group.options.length === 1}
                    title="Xóa lựa chọn"
                    className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => updateGroup(groupIndex, { options: [...group.options, createOption()] })}
              disabled={group.options.length >= MAX_OPTIONS_PER_GROUP}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm lựa chọn
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  )
}
