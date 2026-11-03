import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js'

/**
 * Right-side detail panel of the admin pages. Escape / click outside closes it.
 * Rendered in document.body: inside a page's space-y-* container it would get a top margin.
 * @param {boolean} closeDisabled - keep it open while an action or a confirm dialog is running
 */
export default function AdminDrawer({ title, subtitle, badge, footer, closeDisabled = false, onClose, children }) {
  const close = () => {
    if (!closeDisabled) onClose()
  }
  useKeyboardShortcuts({ Escape: close })

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60" onClick={close}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full max-w-2xl flex-col border-l border-slate-100 dark:border-crave-border bg-white dark:bg-crave-surface text-slate-800 dark:text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-crave-border px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            disabled={closeDisabled}
            aria-label="Đóng"
            className="rounded-xl p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* gap instead of space-y: margins would also shift a fixed child such as a ConfirmDialog */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <footer className="border-t border-slate-100 dark:border-crave-border px-6 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
