/**
 * Pagination bar for the dark admin pages: "Hiển thị 1 - 10 / 42 đánh giá"  [Trước] 1 2 3 [Sau]
 * @param {{ page: number, limit: number, totalItems: number, totalPages: number }} pagination
 */
export default function AdminPagination({ pagination, onPageChange, unit = 'mục' }) {
  const { page, limit, totalItems, totalPages } = pagination
  if (totalItems === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, totalItems)
  // Long lists: first, last and the pages around the current one
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 2,
  )

  const buttonClass =
    'min-w-8 h-8 rounded-lg px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
      <span>
        Hiển thị {from} - {to} / {totalItems} {unit}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={`${buttonClass} bg-slate-800 text-slate-300 hover:bg-slate-700`}
          >
            Trước
          </button>
          {pages.map((pageNumber, index) => (
            <span key={pageNumber} className="flex items-center gap-1">
              {index > 0 && pageNumber - pages[index - 1] > 1 && <span className="px-1 text-slate-600">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === page ? 'page' : undefined}
                className={`${buttonClass} ${
                  pageNumber === page ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {pageNumber}
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={`${buttonClass} bg-slate-800 text-slate-300 hover:bg-slate-700`}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  )
}
