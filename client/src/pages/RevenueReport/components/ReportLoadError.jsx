import { RefreshCw, WifiOff } from 'lucide-react'

/**
 * Load error of a report part, with a retry button.
 * @param {boolean} stale - older figures are still on screen: say they are not those of the chosen filters
 */
export default function ReportLoadError({ message, stale = false, onRetry }) {
  // Server and fallback messages may come without a final period
  const sentence = /[.!?]$/.test(message) ? message : `${message}.`

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {sentence}
        {stale && ' Số liệu đang hiển thị là của lần tải trước, không phải của bộ lọc đang chọn.'}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Thử lại
      </button>
    </div>
  )
}
