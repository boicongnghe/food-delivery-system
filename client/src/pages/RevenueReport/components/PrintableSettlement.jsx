import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime, formatDay } from '../../../utils/formatDate.js'
import { SETTLEMENT_STATUS } from '../constants.js'

const cell = { border: '1px solid #000', padding: '4px 6px' }
const numberCell = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' }

// A4 settlement statement of the period (masked bank account, same figures as the "Chi tiết hoa hồng" tab)
export default function PrintableSettlement({ settlement, restaurantName, printedAt }) {
  const { totals, payoutAccount, range } = settlement

  return (
    <div className="print-a4" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', margin: 0 }}>SAO KÊ DOANH THU & HOA HỒNG</h1>
      <p style={{ textAlign: 'center', margin: '4px 0 12px' }}>
        {restaurantName} · Từ {formatDay(range.from)} đến {formatDay(range.to)}
      </p>

      <p style={{ margin: '2px 0' }}>
        Tài khoản nhận tiền:{' '}
        {payoutAccount.isSet ? `${payoutAccount.bankName} ${payoutAccount.accountNumber} – ${payoutAccount.accountHolder}` : 'chưa khai báo'}
      </p>
      <p style={{ margin: '2px 0' }}>
        Doanh thu gộp {formatCurrency(totals.grossRevenue)} − phí nền tảng {formatCurrency(totals.platformFee)} (
        {totals.commissionRate}%) − voucher quán {formatCurrency(totals.restaurantVoucher)} ={' '}
        <b>thực nhận {formatCurrency(totals.netRevenue)}</b>
      </p>
      <p style={{ margin: '2px 0 10px' }}>
        Đã quyết toán {formatCurrency(totals.settledAmount)} · chờ chuyển khoản {formatCurrency(totals.pendingAmount)}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={cell}>Ngày</th>
            <th style={cell}>Số đơn</th>
            <th style={cell}>Doanh thu gộp</th>
            <th style={cell}>Tỉ lệ</th>
            <th style={cell}>Phí nền tảng</th>
            <th style={cell}>Voucher quán</th>
            <th style={cell}>Thực nhận</th>
            <th style={cell}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {settlement.days.map((day) => (
            <tr key={day.day} style={{ breakInside: 'avoid' }}>
              <td style={cell}>{formatDay(day.day)}</td>
              <td style={numberCell}>{day.deliveredOrders}</td>
              <td style={numberCell}>{formatCurrency(day.grossRevenue)}</td>
              <td style={numberCell}>{day.commissionRate}%</td>
              <td style={numberCell}>{formatCurrency(day.platformFee)}</td>
              <td style={numberCell}>{formatCurrency(day.restaurantVoucher)}</td>
              <td style={numberCell}>{formatCurrency(day.netRevenue)}</td>
              <td style={cell}>{SETTLEMENT_STATUS[day.status].label}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td style={cell}>Tổng</td>
            <td style={numberCell}>{totals.deliveredOrders}</td>
            <td style={numberCell}>{formatCurrency(totals.grossRevenue)}</td>
            <td style={numberCell}>{totals.commissionRate}%</td>
            <td style={numberCell}>{formatCurrency(totals.platformFee)}</td>
            <td style={numberCell}>{formatCurrency(totals.restaurantVoucher)}</td>
            <td style={numberCell}>{formatCurrency(totals.netRevenue)}</td>
            <td style={cell} />
          </tr>
        </tbody>
      </table>

      <p style={{ marginTop: 10, fontSize: 9 }}>
        Chu kỳ quyết toán Thứ Hai – Chủ Nhật, chuyển khoản Thứ Hai tuần sau. Phí giao hàng thuộc shipper, không nằm trong
        doanh thu của quán. In lúc {formatDateTime(printedAt)}.
      </p>
    </div>
  )
}
