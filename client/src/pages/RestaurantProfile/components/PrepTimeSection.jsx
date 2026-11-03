import { Timer } from 'lucide-react'
import { PREP_TIME_MAX, PREP_TIME_MIN } from '../constants.js'
import FieldLabel from './FieldLabel.jsx'
import FieldError from './FieldError.jsx'

const inputClass =
  'w-28 rounded-md bg-brand-light border border-transparent px-4 py-2.5 text-[15px] text-slate-800 tabular-nums focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/15'

// TO-04: average minutes the kitchen needs. Sets the shipper handover time of every accepted order;
// past it the restaurant is warned, then the order goes to the admin.
export default function PrepTimeSection({ prepTime, error, onChange }) {
  return (
    <section className="bg-white rounded-xl border border-brand-soft/60 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b border-brand-soft/60">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Timer className="w-4 h-4 text-brand" />
          Thời gian chuẩn bị món
        </h2>
        <span className="text-xs text-slate-500">Dùng để hẹn giờ bàn giao cho shipper</span>
      </div>

      <FieldLabel htmlFor="prepTime" label="Số phút trung bình từ lúc nhận đơn đến lúc món sẵn sàng" />
      <div className="flex items-center gap-2">
        <input
          id="prepTime"
          type="number"
          inputMode="numeric"
          min={PREP_TIME_MIN}
          max={PREP_TIME_MAX}
          step={1}
          className={inputClass}
          value={prepTime}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        <span className="text-sm text-slate-600">phút</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Quá thời gian này, quán và khách sẽ nhận cảnh báo; quá lâu nữa đơn sẽ được chuyển cho quản trị viên xử lý.
      </p>
      <FieldError message={error} />
    </section>
  )
}
