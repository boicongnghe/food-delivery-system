import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Info, Plus, TicketPercent } from 'lucide-react'
import restaurantVoucherApi from '../../api/restaurantVoucherApi.js'
import NoRestaurantNotice from '../../components/NoRestaurantNotice/NoRestaurantNotice.jsx'
import { useKeyedRequest } from '../../hooks/useKeyedRequest.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import VoucherFormModal from './components/VoucherFormModal.jsx'
import VoucherRow from './components/VoucherRow.jsx'

const SummaryPill = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="rounded-xl border border-brand-soft/70 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className={`mt-0.5 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
)

// "Khuyến mãi": vouchers the restaurant runs with its own money (docs/restaurant-voucher.md)
export default function RestaurantVouchers() {
  const { restaurant } = useOutletContext()
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, voucher = edit
  const [busyId, setBusyId] = useState('')

  const request = useKeyedRequest(
    restaurant ? `vouchers_${version}` : null,
    () => restaurantVoucherApi.getMyVouchers().then((response) => response.data),
    'Không tải được danh sách mã giảm giá',
  )
  const reload = () => setVersion((value) => value + 1)

  if (!restaurant) {
    return <NoRestaurantNotice message="Hãy tạo hồ sơ nhà hàng trước, sau đó quay lại đây để tạo khuyến mãi." />
  }

  // Same rule as the server: a suspended restaurant reads its vouchers but cannot change them
  const readOnly = restaurant.status === 'suspended'
  const result = request.data

  const runAction = async (voucher, action) => {
    setBusyId(voucher._id)
    try {
      const response = await action()
      toast.success(response.message)
      reload()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác không thành công')
    } finally {
      setBusyId('')
    }
  }

  const toggle = (voucher) => runAction(voucher, () => restaurantVoucherApi.setVoucherActive(voucher._id, !voucher.isActive))
  const remove = (voucher) => {
    if (!window.confirm(`Xóa mã ${voucher.code}? Không thể hoàn tác.`)) return
    runAction(voucher, () => restaurantVoucherApi.deleteVoucher(voucher._id))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">Khuyến mãi của quán</h1>
          <p className="mt-1 text-sm text-slate-600">Tạo mã giảm giá để chạy chương trình riêng, khách chọn mã khi thanh toán.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({})}
          disabled={readOnly}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tạo mã giảm giá
        </button>
      </div>

      {readOnly && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Quán đang bị tạm ngưng hoạt động nên không thể tạo hoặc thay đổi khuyến mãi.
        </p>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-brand-soft/70 bg-brand-light/60 px-4 py-3 text-xs text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        Quán tự chịu tiền giảm của mã quán: khoản này được trừ vào thực nhận và nền tảng không tính hoa hồng trên phần đã giảm. Mỗi đơn
        dùng được 1 mã quán và 1 mã của nền tảng (mã quán trừ trước). Đơn bị hủy được trả lại lượt dùng.
      </p>

      {result && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryPill label="Chương trình đang chạy" value={result.summary.running} tone="text-emerald-700" />
          <SummaryPill label="Tổng lượt khách đã dùng" value={result.summary.totalUsed} />
          <SummaryPill label="Chi phí khuyến mãi (đơn đã giao)" value={`−${formatCurrency(result.summary.totalSpent)}`} tone="text-red-700" />
        </div>
      )}

      <section className="rounded-xl border border-brand-soft/70 bg-white shadow-sm">
        {!result ? (
          <p className="px-4 py-14 text-center text-sm text-slate-500">
            {request.error ? (
              <>
                {request.error}.{' '}
                <button type="button" onClick={request.retry} className="font-semibold text-brand underline">
                  Thử lại
                </button>
              </>
            ) : (
              'Đang tải…'
            )}
          </p>
        ) : result.items.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <TicketPercent className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="mt-2 font-semibold text-slate-800">Chưa có chương trình khuyến mãi nào</p>
            <p className="text-sm text-slate-500">Tạo mã đầu tiên, ví dụ "Giảm 20.000đ cho đơn từ 100.000đ".</p>
          </div>
        ) : (
          <ul className={`divide-y divide-slate-100 ${request.isCurrent ? '' : 'opacity-60'}`}>
            {result.items.map((voucher) => (
              <VoucherRow
                key={voucher._id}
                voucher={voucher}
                busy={busyId === voucher._id}
                readOnly={readOnly}
                onToggle={() => toggle(voucher)}
                onEdit={() => setEditing(voucher)}
                onDelete={() => remove(voucher)}
              />
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <VoucherFormModal
          voucher={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
