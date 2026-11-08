import { useState } from 'react'
import driverApi from '../../api/driverApi.js'
import orderApi from '../../api/orderApi.js'

const LOG_COLORS = { info: 'text-slate-700', success: 'text-emerald-700', error: 'text-red-600' }

/**
 * Dev-only tool (route registered only when import.meta.env.DEV): runs the whole shipper flow with the
 * logged-in shipper on the oldest order of the pickup pool: go online -> accept -> pick up -> deliver.
 * It changes real data of the connected database, so it only runs when the button is pressed.
 */
function DebugShipperFlow() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)

  const add = (type, message) => setLog((previous) => [...previous, { type, message }])

  const runFlow = async () => {
    setLog([])
    setRunning(true)
    try {
      await driverApi.updateOnlineStatus(true)
      add('success', 'Đã bật trạng thái trực tuyến')

      const active = (await orderApi.getShipperActiveOrders()).data || []
      if (active.length > 0) {
        add('error', `Đang giữ đơn ${active[0].orderCode}: hoàn tất đơn đó trước khi chạy lại`)
        return
      }

      const pool = (await orderApi.getAvailableForPickup({ page: 1, limit: 1 })).data?.items || []
      if (pool.length === 0) {
        add('info', 'Không có đơn nào đang chờ shipper (chạy npm run seed:shipper-orders ở server để tạo đơn mẫu)')
        return
      }
      const order = pool[0]
      add('info', `Đơn chờ nhận: ${order.orderCode}`)

      await orderApi.acceptDeliveryOrder(order._id)
      add('success', 'Đã nhận đơn')
      await orderApi.confirmDeliveryPickup(order._id)
      add('success', 'Đã lấy hàng (đang giao)')
      const delivered = await orderApi.confirmDeliveryDelivered(order._id)
      add('success', delivered.message || 'Đã giao hàng')
    } catch (error) {
      add('error', error.response?.data?.message || error.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold text-slate-900">Kiểm tra luồng shipper (chỉ môi trường dev)</h1>
      <p className="text-sm text-slate-600">
        Dùng tài khoản shipper đang đăng nhập để nhận, lấy và giao đơn cũ nhất trong danh sách chờ. Thao tác ghi dữ liệu thật vào
        database đang kết nối.
      </p>
      <button
        type="button"
        onClick={runFlow}
        disabled={running}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {running ? 'Đang chạy...' : 'Chạy luồng giao hàng'}
      </button>
      <ol className="space-y-1 text-sm">
        {log.map((entry, index) => (
          <li key={index} className={LOG_COLORS[entry.type]}>
            {entry.message}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default DebugShipperFlow
