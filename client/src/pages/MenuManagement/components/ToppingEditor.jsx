import { Plus, X } from 'lucide-react'
import { createKey } from '../../../utils/createKey.js'
import { formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'
import { MAX_TOPPINGS } from '../constants.js'

const inputClass =
  'rounded-md border border-brand-soft bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20'

const createTopping = () => ({ _key: createKey(), name: '', price: 0, stock: 50 })

// Section 10: one simple list of extras the customer may add (any number of them, none required)
export default function ToppingEditor({ toppings, error, onChange }) {
  const updateTopping = (index, changes) =>
    onChange(toppings.map((topping, current) => (current === index ? { ...topping, ...changes } : topping)))

  return (
    <section className="rounded-lg border border-brand-soft/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-800">10. Topping</p>
          <p className="text-xs text-slate-500">Món thêm kèm (quản lý giá &amp; số lượng kho, cảnh báo khi còn ≤ 5)</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...toppings, createTopping()])}
          disabled={toppings.length >= MAX_TOPPINGS}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-soft bg-white px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm topping
        </button>
      </div>

      {toppings.length === 0 ? (
        <p className="rounded-md bg-brand-light px-3 py-4 text-center text-xs text-slate-500">
          Món chưa có topping. Bấm "Thêm topping" nếu muốn cho khách chọn thêm (VD: trứng, quẩy, thêm thịt).
        </p>
      ) : (
        <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
          {toppings.map((topping, index) => {
            const currentStock = topping.stock !== undefined ? topping.stock : 50
            const isLowStock = currentStock <= 5

            return (
              <div key={topping._key} className="flex items-center gap-2">
                <input
                  value={topping.name}
                  onChange={(e) => updateTopping(index, { name: e.target.value })}
                  placeholder="Tên topping"
                  maxLength={60}
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <div className="relative w-28 shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">+</span>
                  <input
                    inputMode="numeric"
                    value={formatNumber(topping.price)}
                    onChange={(e) => updateTopping(index, { price: Number(parseNumberInput(e.target.value)) || 0 })}
                    className={`${inputClass} w-full pl-5 pr-6 text-right`}
                    aria-label="Giá cộng thêm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">đ</span>
                </div>
                <div
                  className="relative w-24 shrink-0"
                  title="Số lượng topping còn trong kho (tự động cảnh báo khi ≤ 5)"
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                    Kho:
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={currentStock}
                    onChange={(e) =>
                      updateTopping(index, { stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                    }
                    className={`${inputClass} w-full pl-9 pr-1.5 text-right text-xs font-semibold ${
                      isLowStock ? 'border-amber-400 bg-amber-50 text-amber-700' : ''
                    }`}
                    aria-label="Số lượng còn lại trong kho"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(toppings.filter((_, current) => current !== index))}
                  title="Xóa topping"
                  className="rounded p-1 text-slate-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  )
}
