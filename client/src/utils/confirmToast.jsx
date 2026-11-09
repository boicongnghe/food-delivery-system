import toast from 'react-hot-toast'

const CONFIRM_TOAST_ID = 'confirm-toast'
let resolvePending = null // the question on screen, answered "no" if another one replaces it

/**
 * Ask the user to confirm an action in a toast (replaces window.confirm, which blocks the page and
 * cannot be styled). Resolves true on the confirm button, false on cancel.
 * Only one question at a time: asking again replaces the previous one.
 *
 * @param {string} message - question, may contain line breaks
 * @param {{ confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
 * @returns {Promise<boolean>}
 */
export function confirmToast(message, { confirmLabel = 'Đồng ý', cancelLabel = 'Hủy', danger = false } = {}) {
  resolvePending?.(false)

  return new Promise((resolve) => {
    resolvePending = resolve
    const answer = (value) => {
      if (resolvePending === resolve) resolvePending = null
      toast.dismiss(CONFIRM_TOAST_ID)
      resolve(value)
    }

    toast(
      () => (
        <div className="space-y-3" role="alertdialog" aria-live="assertive">
          <p className="whitespace-pre-line text-sm leading-relaxed">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => answer(false)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => answer(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                danger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      // Stays until answered; centred because it asks for a decision, not just informs
      { id: CONFIRM_TOAST_ID, duration: Infinity, position: 'top-center', style: { maxWidth: 420 } },
    )
  })
}
