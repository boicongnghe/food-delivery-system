import { ADMIN_TABLE_HEAD } from '../../../utils/adminClassNames.js'

/**
 * Table view of a chart (same numbers, readable without hovering).
 * @param {{ key: string, header: string, align?: 'right' }[]} columns
 * @param {Object<string, string|number>[]} rows - one object per period, keyed by column key
 */
export default function SeriesTable({ columns, rows }) {
  return (
    <div className="max-h-80 overflow-auto rounded-2xl border border-slate-100 dark:border-crave-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white dark:bg-crave-surface">
          <tr className="border-b border-slate-100 dark:border-crave-border">
            {columns.map((column) => (
              <th key={column.key} className={`${ADMIN_TABLE_HEAD} ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-crave-border">
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-2 tabular-nums text-slate-700 dark:text-slate-300 ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
