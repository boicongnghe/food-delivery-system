import Pagination from '../../../components/Pagination/Pagination.jsx'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import { WITHDRAWAL_STATUS } from '../constants.js'

// Withdrawals of the restaurant, newest first (bank account shown masked)
export default function WithdrawalHistory({ result, loading, onPageChange }) {
  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-4 py-3 font-serif text-lg font-semibold text-slate-900">Lịch sử rút tiền</h2>
      {!result ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">Đang tải…</p>
      ) : result.items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">Chưa có lệnh rút tiền nào.</p>
      ) : (
        <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-brand-light/50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Mã lệnh</th>
                <th className="px-4 py-2.5">Thời gian</th>
                <th className="px-4 py-2.5 text-right">Số tiền</th>
                <th className="px-4 py-2.5">Tài khoản nhận</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((withdrawal) => {
                const status = WITHDRAWAL_STATUS[withdrawal.status]
                return (
                  <tr key={withdrawal._id}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{withdrawal.code}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDateTime(withdrawal.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">{formatCurrency(withdrawal.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {withdrawal.bankAccount.bankName} <span className="tabular-nums">{withdrawal.bankAccount.accountNumber}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {withdrawal.status === 'failed' ? withdrawal.failureReason : withdrawal.providerRef || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {result && (
        <div className="overflow-x-auto">
          <Pagination pagination={result.pagination} onPageChange={onPageChange} unit="lệnh rút" />
        </div>
      )}
    </section>
  )
}
