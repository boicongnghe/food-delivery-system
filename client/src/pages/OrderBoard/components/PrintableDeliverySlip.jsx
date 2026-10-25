import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatClock } from '../../../utils/formatTime.js'
import { DELIVERY_TYPE_LABELS } from '../constants.js'

// 80mm slip attached to the bag for the shipper. Phone stays masked (the shipper app has the contact).
export default function PrintableDeliverySlip({ order, restaurantName, printedAt }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const amountToCollect = order.payment.method === 'cod' && order.payment.status === 'unpaid' ? order.total : 0

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 13, width: '72mm' }}>
      <p style={{ textAlign: 'center', fontWeight: 700 }}>PHIẾU GIAO HÀNG</p>
      <p style={{ textAlign: 'center', fontSize: 20, fontWeight: 800 }}>{order.orderCode}</p>
      <hr />
      <p>
        Từ quán: <b>{restaurantName}</b>
      </p>
      <p>
        Người nhận: <b>{order.delivery.recipientName}</b> ({order.delivery.phone})
      </p>
      <p>Địa chỉ: {order.delivery.address}</p>
      <p>
        {DELIVERY_TYPE_LABELS[order.delivery.type]}
        {order.delivery.expectedAt && ` · Hẹn giao ${formatClock(order.delivery.expectedAt)}`}
      </p>
      <hr />
      <p>Số món: {itemCount}</p>
      <p style={{ fontSize: 16, fontWeight: 800 }}>
        {amountToCollect > 0 ? `THU HỘ COD: ${formatCurrency(amountToCollect)}` : 'ĐÃ THANH TOÁN ONLINE – KHÔNG THU TIỀN'}
      </p>
      {order.customerNote && <p>Ghi chú: {order.customerNote}</p>}
      <hr />
      <p style={{ fontSize: 10, textAlign: 'center' }}>In lúc {formatClock(printedAt, true)}</p>
    </div>
  )
}
