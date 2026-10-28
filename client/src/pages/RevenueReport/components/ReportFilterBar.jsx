import { CalendarDays, Download, Printer } from 'lucide-react'
import { RANGE_PRESETS } from '../constants.js'

/**
 * Period presets + custom range, with the export / print actions of the current tab on the right.
 * @param {{ from: string, to: string }} customRange - draft values of the date inputs
 */
export default function ReportFilterBar({
  preset,
  customRange,
  today,
  onPresetChange,
  onCustomRangeChange,
  onApplyCustomRange,
  exportLabel,
  onExport,
  exporting,
  onPrint,
  printing,
}) {
  const inputClass =
    'h-9 rounded-md border border-brand-soft bg-white px-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-soft/70 bg-white p-3 shadow-sm">
      <CalendarDays className="hidden h-5 w-5 text-brand sm:block" aria-hidden="true" />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Khoảng thời gian">
        {RANGE_PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={preset === item.value}
            onClick={() => onPresetChange(item.value)}
            className={`h-9 rounded-md px-3 text-sm font-semibold transition-colors ${
              preset === item.value ? 'bg-brand text-white' : 'text-slate-700 hover:bg-brand-light'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <form onSubmit={onApplyCustomRange} className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="report-from">
            Từ ngày
          </label>
          <input
            id="report-from"
            type="date"
            value={customRange.from}
            max={customRange.to || today}
            onChange={(event) => onCustomRangeChange({ from: event.target.value })}
            className={inputClass}
          />
          <span className="text-slate-400">–</span>
          <label className="sr-only" htmlFor="report-to">
            Đến ngày
          </label>
          <input
            id="report-to"
            type="date"
            value={customRange.to}
            min={customRange.from}
            max={today}
            onChange={(event) => onCustomRangeChange({ to: event.target.value })}
            className={inputClass}
          />
          <button type="submit" className="h-9 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800">
            Xem
          </button>
        </form>
      )}

      <div className="ml-auto flex flex-wrap gap-2">
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-soft bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-brand-light disabled:cursor-wait disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exportLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          disabled={printing}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
        >
          <Printer className="h-4 w-4" />
          In sao kê
        </button>
      </div>
    </div>
  )
}
