import { useState } from 'react'
import { Copy, EllipsisVertical, Receipt } from 'lucide-react'

// "⋮" menu in the ticket header: secondary actions
export default function DrawerMoreMenu({ onCopyCode, onPrintSlip }) {
  const [open, setOpen] = useState(false)

  const run = (action) => {
    setOpen(false)
    action()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Thao tác khác"
        className="rounded-md bg-brand-light p-2 text-slate-700 hover:bg-brand-soft"
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-100 bg-white py-1 shadow-xl">
            <button
              type="button"
              onClick={() => run(onCopyCode)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4 text-slate-400" />
              Sao chép mã đơn
            </button>
            <button
              type="button"
              onClick={() => run(onPrintSlip)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Receipt className="h-4 w-4 text-slate-400" />
              In phiếu giao shipper
            </button>
          </div>
        </>
      )}
    </div>
  )
}
