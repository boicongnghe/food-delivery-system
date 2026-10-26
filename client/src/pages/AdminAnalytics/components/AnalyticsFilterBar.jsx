import { Download } from 'lucide-react'
import AdminFilterTabs from '../../../components/AdminFilterTabs/AdminFilterTabs.jsx'
import { ADMIN_BUTTON, ADMIN_INPUT } from '../../../utils/adminClassNames.js'
import { RANGE_PRESETS } from '../constants.js'

/**
 * The one filter row above the whole report: date range presets first, custom range, CSV export.
 * @param {{ from: string, to: string }} customRange - draft dates of the "Tùy chọn" preset
 */
export default function AnalyticsFilterBar({
  preset,
  customRange,
  today,
  canExport,
  onPresetChange,
  onCustomRangeChange,
  onApplyCustomRange,
  onExport,
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <AdminFilterTabs options={RANGE_PRESETS} value={preset} onChange={onPresetChange} />

        {preset === 'custom' && (
          <form onSubmit={onApplyCustomRange} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Từ ngày"
              value={customRange.from}
              max={customRange.to || today}
              onChange={(event) => onCustomRangeChange({ from: event.target.value })}
              className={`${ADMIN_INPUT} w-40 [color-scheme:dark]`}
            />
            <span className="text-slate-500">→</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={customRange.to}
              min={customRange.from}
              max={today}
              onChange={(event) => onCustomRangeChange({ to: event.target.value })}
              className={`${ADMIN_INPUT} w-40 [color-scheme:dark]`}
            />
            <button type="submit" className={ADMIN_BUTTON.primary}>
              Xem báo cáo
            </button>
          </form>
        )}
      </div>

      <button type="button" onClick={onExport} disabled={!canExport} className={ADMIN_BUTTON.secondary}>
        <Download className="h-3.5 w-3.5" /> Xuất CSV
      </button>
    </div>
  )
}
