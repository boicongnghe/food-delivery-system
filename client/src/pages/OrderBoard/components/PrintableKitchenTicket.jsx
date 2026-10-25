import { formatClock } from '../../../utils/formatTime.js'
import { DELIVERY_TYPE_LABELS } from '../constants.js'

// 80mm kitchen ticket: big, high-contrast text for the cooks. Printed through PrintPortal.
export default function PrintableKitchenTicket({ order, restaurantName, printedAt }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 13, width: '72mm' }}>
      <p style={{ textAlign: 'center', fontWeight: 700 }}>{restaurantName}</p>
      <p style={{ textAlign: 'center', fontSize: 11 }}>PHIẾU BẾP</p>
      <hr />
      <p style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }}>
        {order.kitchenTicketNo ? `#${String(order.kitchenTicketNo).padStart(2, '0')}` : '--'} · {order.orderCode}
      </p>
      <p>{order.acceptedAt ? `Nhận: ${formatClock(order.acceptedAt)}` : `Đặt: ${formatClock(order.createdAt)}`}</p>
      {order.kitchenDueAt && <p style={{ fontWeight: 700 }}>Bàn giao trước: {formatClock(order.kitchenDueAt)}</p>}
      <p>{DELIVERY_TYPE_LABELS[order.delivery.type]}</p>
      <hr />
      {order.items.map((item, index) => (
        <div key={index} style={{ marginBottom: 6 }}>
          <p style={{ fontSize: 16, fontWeight: 800 }}>
            {item.quantity} x {item.name}
          </p>
          {item.options.map((option) => (
            <p key={`${option.groupName}-${option.name}`} style={{ paddingLeft: 12 }}>
              + {option.name}
            </p>
          ))}
          {item.note && <p style={{ paddingLeft: 12, fontWeight: 700 }}>! {item.note}</p>}
        </div>
      ))}
      {order.customerNote && (
        <>
          <hr />
          <p style={{ fontWeight: 700 }}>GHI CHÚ KHÁCH:</p>
          <p>{order.customerNote}</p>
        </>
      )}
      <hr />
      <p style={{ fontSize: 10, textAlign: 'center' }}>In lúc {formatClock(printedAt, true)}</p>
    </div>
  )
}
