import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FlaskConical, Info } from 'lucide-react'
import walletApi from '../../../api/walletApi.js'
import { useKeyedRequest } from '../../../hooks/useKeyedRequest.js'
import { formatCurrency } from '../../../utils/formatCurrency.js'
import { WITHDRAWAL_PAGE_SIZE } from '../constants.js'
import PayoutAccountsCard from '../../../components/PayoutAccountsCard/PayoutAccountsCard.jsx'
import ReportLoadError from './ReportLoadError.jsx'
import WithdrawalHistory from './WithdrawalHistory.jsx'
import WithdrawForm from './WithdrawForm.jsx'

const RESTAURANT_ACCOUNT_API = {
  add: walletApi.addPayoutAccount,
  setDefault: walletApi.setDefaultPayoutAccount,
  remove: walletApi.removePayoutAccount,
}

const Figure = ({ label, value, hint, tone = 'text-slate-900' }) => (
  <div className="rounded-lg border border-slate-100 bg-white/70 px-3 py-2.5">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className={`mt-0.5 text-base font-bold tabular-nums ${tone}`}>{value}</p>
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
  </div>
)

// "Ví & rút tiền" tab: balance credited from delivered orders, withdrawal form and history (not tied to the date filter)
export default function WalletTab() {
  const { restaurant } = useOutletContext()
  const [version, setVersion] = useState(0) // bumped after a withdrawal: reloads balance and history
  const [page, setPage] = useState(1)

  const walletRequest = useKeyedRequest(`wallet_${version}`, () => walletApi.getWallet().then((r) => r.data), 'Không tải được ví')
  const historyRequest = useKeyedRequest(
    `history_${version}_${page}`,
    () => walletApi.getWithdrawals({ page, limit: WITHDRAWAL_PAGE_SIZE }).then((r) => r.data),
    'Không tải được lịch sử rút tiền',
  )
  const wallet = walletRequest.data

  const reload = () => {
    setPage(1)
    setVersion((value) => value + 1)
  }

  if (!wallet) {
    return walletRequest.error ? (
      <ReportLoadError message={walletRequest.error} onRetry={walletRequest.retry} />
    ) : (
      <p className="py-16 text-center text-sm text-slate-500">Đang tải ví…</p>
    )
  }

  const { balance } = wallet

  return (
    <div className="space-y-6">
      {walletRequest.error && <ReportLoadError message={walletRequest.error} stale onRetry={walletRequest.retry} />}
      {wallet.mode === 'demo' && (
        <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Chế độ demo: lệnh rút được duyệt ngay và không chuyển tiền thật. Khi tích hợp cổng chi hộ, kết quả chuyển khoản sẽ về
          qua webhook.
        </p>
      )}

      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-5 ${walletRequest.isCurrent ? '' : 'opacity-60'}`}>
        <section className="space-y-4 rounded-xl border border-brand-soft/70 bg-gradient-to-br from-brand-light/70 to-white p-5 shadow-sm lg:col-span-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">Số dư khả dụng</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums text-slate-900">{formatCurrency(balance.available)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Chờ đối soát" value={formatCurrency(balance.pendingSettlement)} hint="Đơn hôm nay, vào ví sau 0h" tone="text-amber-700" />
            <Figure label="Đang xử lý" value={formatCurrency(balance.processing)} hint="Lệnh rút chờ ngân hàng" tone="text-sky-700" />
            <Figure label="Đã rút" value={formatCurrency(balance.withdrawn)} tone="text-emerald-700" />
            <Figure label="Tổng thu nhập" value={formatCurrency(balance.totalEarned)} hint="Thực nhận từ đơn hoàn thành" />
          </div>
          {balance.penalties > 0 && (
            <p className="text-sm text-red-700">
              Đã trừ <strong className="tabular-nums">{formatCurrency(balance.penalties)}</strong> tiền phạt (khiếu nại, sự cố giao
              hàng) khỏi số dư khả dụng.
            </p>
          )}
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Thực nhận mỗi đơn hoàn thành = tiền món + phí đóng gói − phí nền tảng (tỉ lệ hoa hồng của ngày đặt đơn). Tiền được cộng
            vào ví sau đối soát cuối ngày, khớp với tab Chi tiết hoa hồng.
          </p>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <PayoutAccountsCard
            accounts={wallet.payoutAccounts || []}
            maxAccounts={wallet.maxPayoutAccounts}
            api={RESTAURANT_ACCOUNT_API}
            locked={restaurant.status === 'suspended'}
            lockedMessage="Quán đang bị tạm ngưng nên không thể thay đổi tài khoản nhận tiền."
            onChanged={() => setVersion((value) => value + 1)}
          />
          <WithdrawForm wallet={wallet} onDone={reload} />
        </div>
      </div>

      {historyRequest.error && <ReportLoadError message={historyRequest.error} stale={Boolean(historyRequest.data)} onRetry={historyRequest.retry} />}
      <WithdrawalHistory result={historyRequest.data} loading={!historyRequest.isCurrent} onPageChange={setPage} />
    </div>
  )
}
