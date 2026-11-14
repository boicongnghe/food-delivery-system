import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import driverApi from '../../../api/driverApi'
import Pagination from '../../../components/Pagination/Pagination.jsx'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { formatDateTime } from '../../../utils/formatDate.js'
import SectionCard from './SectionCard.jsx'

const PAGE_SIZE = 5

// Same statuses as the server (models/ShipperWithdrawal.js)
const STATUS = {
  requested: { label: 'Chờ quản trị viên chuyển khoản', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  completed: { label: 'Đã chuyển tiền', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Bị từ chối – đã hoàn ví', className: 'bg-red-50 text-red-800 border-red-200' },
}

/**
 * Withdrawal requests of the shipper and what the admin did with them (transfer reference or rejection reason).
 * The parent remounts it (key) after a new request, so it starts again from the first page.
 */
export default function ShipperWithdrawalHistory() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    driverApi
      .getWithdrawals({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (active) {
          setData(result)
          setError('')
        }
      })
      .catch(() => active && setError('Không tải được lịch sử rút tiền'))
    return () => {
      active = false
    }
  }, [page])

  return (
    <SectionCard title="Lịch sử rút tiền" icon={History} className="lg:col-span-2" bodyClassName="">
      {error && <p className="px-5 py-6 text-sm text-red-700">{error}</p>}
      {!error && !data && <p className="px-5 py-6 text-sm text-slate-500">Đang tải…</p>}
      {!error && data && data.items.length === 0 && (
        <p className="px-5 py-6 text-sm text-slate-500">Chưa có yêu cầu rút tiền nào.</p>
      )}
      {!error && data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-brand-light/50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Mã yêu cầu</th>
                  <th scope="col" className="px-4 py-2.5">Thời gian</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Số tiền</th>
                  <th scope="col" className="px-4 py-2.5">Tài khoản nhận</th>
                  <th scope="col" className="px-4 py-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => {
                  const status = STATUS[item.status] || STATUS.requested
                  return (
                    <tr key={item._id} className="align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.transactionCode}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.bankAccount?.bankName} · ****{String(item.bankAccount?.accountNumber || '').slice(-4)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                        {item.status === 'completed' && item.reference && (
                          <p className="mt-1 text-xs text-slate-500">Mã giao dịch: {item.reference}</p>
                        )}
                        {item.status === 'rejected' && item.rejectionReason && (
                          <p className="mt-1 text-xs text-red-700">Lý do: {item.rejectionReason}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data.pagination} onPageChange={setPage} unit="yêu cầu" />
        </>
      )}
    </SectionCard>
  )
}
