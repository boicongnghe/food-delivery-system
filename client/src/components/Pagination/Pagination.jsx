/**
 * Simple pagination bar: "Hiển thị 1 - 10 / 42 món"  [Trước] 1 2 3 [Sau]
 *
 * @param {{ page: number, limit: number, totalItems: number, totalPages: number }} pagination
 * @param {(page: number) => void} onPageChange
 * @param {string} unit - item unit in the summary text, e.g. "món"
 */
export default function Pagination({ pagination, onPageChange, unit = 'mục' }) {
  const { page, limit, totalItems, totalPages } = pagination
  if (totalItems === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, totalItems)
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  const buttonClass = 'min-w-8 h-8 rounded px-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm text-slate-600">
      <span>
        Hiển thị {from} - {to} / {totalItems} {unit}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={`${buttonClass} bg-brand-light text-slate-600 hover:bg-brand-soft`}
          >
            Trước
          </button>
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`${buttonClass} ${
                pageNumber === page ? 'bg-brand text-white' : 'text-slate-700 hover:bg-brand-light'
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={`${buttonClass} bg-brand-light text-slate-600 hover:bg-brand-soft`}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  )
}
