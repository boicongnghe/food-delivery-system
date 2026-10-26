import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Activity, CircleAlert, RefreshCw } from 'lucide-react'
import orderApi from '../../../api/orderApi.js'
import PrintPortal from '../../../components/PrintPortal/PrintPortal.jsx'
import useKeyboardShortcuts from '../../../hooks/useKeyboardShortcuts.js'
import { ORDER_STATUS_LABELS } from '../constants.js'
import BoardNotice from './BoardNotice.jsx'
import CancellationInfo from './CancellationInfo.jsx'
import CustomerAlert from './CustomerAlert.jsx'
import DrawerActionBar from './DrawerActionBar.jsx'
import OrderTimeline from './OrderTimeline.jsx'
import PaymentSummary from './PaymentSummary.jsx'
import PrintableDeliverySlip from './PrintableDeliverySlip.jsx'
import PrintableKitchenTicket from './PrintableKitchenTicket.jsx'
import TicketHeader from './TicketHeader.jsx'
import TicketItems from './TicketItems.jsx'

/**
 * Kitchen ticket drawer (UC23). Mount with key={orderId} so switching orders starts fresh.
 * - refreshKey: changes after every successful board load -> the drawer reloads the order too
 * - lastOwnChange: { orderId, status } of the owner's own last action (no "changed elsewhere" banner for it)
 * - actions (accept / reject / ready) are run by the board so both stay in sync
 */
export default function OrderDetailDrawer({
  orderId,
  now,
  refreshKey,
  lastOwnChange,
  busy,
  acceptBlockedReason,
  shortcutsEnabled,
  restaurantName,
  onClose,
  onAccept,
  onReject,
  onReady,
}) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [changedTo, setChangedTo] = useState('') // status changed by someone else while open
  const [printJob, setPrintJob] = useState(null) // { kind: 'ticket' | 'slip', at: timestamp }

  const latestRequestIdRef = useRef(0)
  const previousStatusRef = useRef(null)
  const lastOwnChangeRef = useRef(lastOwnChange)

  useEffect(() => {
    lastOwnChangeRef.current = lastOwnChange
  })

  // Load + reload with the board. Only the newest response is applied.
  useEffect(() => {
    latestRequestIdRef.current += 1
    const requestId = latestRequestIdRef.current

    orderApi
      .getOrder(orderId)
      .then(({ data }) => {
        if (requestId !== latestRequestIdRef.current) return
        const previous = previousStatusRef.current
        const own = lastOwnChangeRef.current
        const isOwnChange = own?.orderId === data._id && own.status === data.status
        if (previous && data.status !== previous && !isOwnChange) {
          setChangedTo(data.status)
        }
        previousStatusRef.current = data.status
        setOrder(data)
        setError('')
      })
      .catch((err) => {
        if (requestId !== latestRequestIdRef.current) return
        setError(err.response?.data?.message || 'Không tải được chi tiết đơn hàng')
      })
  }, [orderId, refreshKey])

  // Click / F4 -> render the sheet in the portal (time taken here, not during render) -> print
  const startPrint = (kind) => setPrintJob({ kind, at: Date.now() })

  // Print after the printable sheet is rendered in the portal
  useEffect(() => {
    if (!printJob) return undefined
    const reset = () => setPrintJob(null)
    window.addEventListener('afterprint', reset, { once: true })
    const timer = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', reset)
    }
  }, [printJob])

  const canAccept = order?.status === 'pending' && !acceptBlockedReason && !busy
  const canMarkReady = order?.status === 'preparing' && !busy

  useKeyboardShortcuts(
    {
      Escape: onClose,
      F4: () => order && startPrint('ticket'),
      // Only non-destructive actions have a shortcut (reject needs a reason)
      'Ctrl+Enter': () => {
        if (canAccept) onAccept(order)
        else if (canMarkReady) onReady(order)
      },
    },
    shortcutsEnabled,
  )

  const copyOrderCode = () => {
    navigator.clipboard
      ?.writeText(order.orderCode)
      .then(() => toast.success(`Đã sao chép mã ${order.orderCode}`))
      .catch(() => toast.error('Không sao chép được mã đơn'))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết đơn hàng"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col border-t-4 border-dashed border-brand-soft bg-cream shadow-2xl"
      >
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!order && !error && (
            <div className="space-y-3">
              {[1, 2, 3].map((key) => (
                <div key={key} className="h-28 animate-pulse rounded-xl bg-brand-light" />
              ))}
            </div>
          )}

          {!order && error && (
            <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
              <CircleAlert className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 font-semibold text-slate-900">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-md bg-brand-light px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-soft"
              >
                Đóng
              </button>
            </div>
          )}

          {order && (
            <>
              <TicketHeader
                order={order}
                now={now}
                onClose={onClose}
                onPrintTicket={() => startPrint('ticket')}
                onPrintSlip={() => startPrint('slip')}
                onCopyCode={copyOrderCode}
              />

              {changedTo && (
                <BoardNotice tone="danger" icon={RefreshCw} title={`Đơn vừa chuyển sang: ${ORDER_STATUS_LABELS[changedTo]}`}>
                  Trạng thái đơn đã thay đổi từ nơi khác (khách hàng hoặc shipper). Các thao tác đã được cập nhật theo.
                </BoardNotice>
              )}
              {error && (
                <BoardNotice tone="warning" icon={CircleAlert} title="Không cập nhật được chi tiết đơn">
                  Đang hiển thị dữ liệu lần tải trước. ({error})
                </BoardNotice>
              )}

              <CustomerAlert note={order.customerNote} insight={order.customerInsight} />
              <TicketItems items={order.items} />
              <CancellationInfo order={order} />
              <PaymentSummary order={order} />

              <section className="space-y-3 rounded-xl border border-brand-soft/60 bg-white p-4">
                <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Tiến trình đơn hàng
                  <Activity className="h-4 w-4 text-slate-400" />
                </p>
                <OrderTimeline history={order.statusHistory} status={order.status} />
              </section>
            </>
          )}
        </div>

        {order && (
          <div className="border-t border-brand-soft/60 bg-white p-4 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.25)]">
            <DrawerActionBar
              order={order}
              busy={busy}
              acceptBlockedReason={acceptBlockedReason}
              onAccept={() => onAccept(order)}
              onReject={() => onReject(order)}
              onReady={() => onReady(order)}
              onPrintSlip={() => startPrint('slip')}
            />
          </div>
        )}
      </aside>

      {order && printJob && (
        <PrintPortal>
          {printJob.kind === 'ticket' ? (
            <PrintableKitchenTicket order={order} restaurantName={restaurantName} printedAt={printJob.at} />
          ) : (
            <PrintableDeliverySlip order={order} restaurantName={restaurantName} printedAt={printJob.at} />
          )}
        </PrintPortal>
      )}
    </div>
  )
}
