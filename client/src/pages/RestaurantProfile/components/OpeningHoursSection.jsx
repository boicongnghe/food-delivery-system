import { CircleMinus, CirclePlus, Copy } from 'lucide-react'
import { DEFAULT_SECOND_SHIFT, DEFAULT_SHIFT, WEEK_DAYS } from '../constants.js'
import ShiftInput from './ShiftInput.jsx'

export default function OpeningHoursSection({ openingHours, error, onChange }) {
  const updateDay = (dayOfWeek, updater) => {
    onChange(openingHours.map((day) => (day.dayOfWeek === dayOfWeek ? updater(day) : day)))
  }

  const toggleDay = (dayOfWeek) => {
    updateDay(dayOfWeek, (day) => ({
      ...day,
      isOpen: !day.isOpen,
      shifts: !day.isOpen && day.shifts.length === 0 ? [{ ...DEFAULT_SHIFT }] : day.shifts,
    }))
  }

  const updateShift = (dayOfWeek, shiftIndex, field, value) => {
    updateDay(dayOfWeek, (day) => ({
      ...day,
      shifts: day.shifts.map((shift, index) => (index === shiftIndex ? { ...shift, [field]: value } : shift)),
    }))
  }

  const addShift = (dayOfWeek) => {
    updateDay(dayOfWeek, (day) => ({ ...day, shifts: [...day.shifts, { ...DEFAULT_SECOND_SHIFT }] }))
  }

  const removeLastShift = (dayOfWeek) => {
    updateDay(dayOfWeek, (day) => ({ ...day, shifts: day.shifts.slice(0, 1) }))
  }

  const applyMondayToAll = () => {
    const monday = openingHours.find((day) => day.dayOfWeek === 1)
    onChange(
      openingHours.map((day) => ({
        ...day,
        isOpen: monday.isOpen,
        shifts: monday.shifts.map((shift) => ({ ...shift })),
      })),
    )
  }

  return (
    <section className="bg-white rounded-xl border border-brand-soft/60 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Giờ mở cửa hàng tuần</h2>
          <p className="text-xs text-slate-500">Tự động nhận đơn và tắt đơn theo lịch trình cài đặt</p>
        </div>
        <button
          type="button"
          onClick={applyMondayToAll}
          className="inline-flex items-center gap-1.5 rounded border border-brand-soft bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
        >
          <Copy className="w-3.5 h-3.5" />
          Áp dụng T2 cho cả tuần
        </button>
      </div>

      <div className="divide-y divide-brand-soft/50">
        {WEEK_DAYS.map(({ dayOfWeek, label }) => {
          const day = openingHours.find((item) => item.dayOfWeek === dayOfWeek)
          const canAddShift = day.isOpen && day.shifts.length < 2

          return (
            <div key={dayOfWeek} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex items-center gap-3 w-32 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  onChange={() => toggleDay(dayOfWeek)}
                  className="w-4 h-4 accent-brand cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-800">{label}</span>
              </label>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {day.isOpen ? (
                  day.shifts.map((shift, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index > 0 && <span className="text-xs text-slate-400">&amp;</span>}
                      <ShiftInput
                        shift={shift}
                        onChange={(field, value) => updateShift(dayOfWeek, index, field, value)}
                      />
                    </div>
                  ))
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Nghỉ cả ngày</span>
                )}

                <div className="w-6 flex justify-center">
                  {canAddShift && (
                    <button
                      type="button"
                      onClick={() => addShift(dayOfWeek)}
                      title="Thêm ca"
                      className="text-slate-500 hover:text-brand"
                    >
                      <CirclePlus className="w-5 h-5" />
                    </button>
                  )}
                  {day.isOpen && day.shifts.length === 2 && (
                    <button
                      type="button"
                      onClick={() => removeLastShift(dayOfWeek)}
                      title="Xóa ca thứ hai"
                      className="text-slate-500 hover:text-brand"
                    >
                      <CircleMinus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  )
}
