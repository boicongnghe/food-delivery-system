import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js'

/**
 * Centered form dialog of the admin pages, rendered in document.body (see AdminDrawer).
 * Children usually contain a <form id=...>; the footer buttons submit it with form="..."
 * so they stay visible while the body scrolls.
 */
export default function AdminModal({ title, subtitle, footer, closeDisabled = false, onClose, children }) {
  const close = () => {
    if (!closeDisabled) onClose()
  }
  useKeyboardShortcuts({ Escape: close })

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-100 dark:border-crave-border bg-white dark:bg-crave-surface text-slate-800 dark:text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-crave-border px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
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

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <footer className="flex justify-end gap-2 border-t border-slate-100 dark:border-crave-border px-6 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
