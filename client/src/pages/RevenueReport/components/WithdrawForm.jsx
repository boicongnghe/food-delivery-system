import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDownToLine } from 'lucide-react'
import walletApi from '../../../api/walletApi.js'
import { formatCurrency, formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'
import { formatDay } from '../../../utils/formatDate.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'

// One key per withdrawal: a double click or a retry after a timeout never sends a second transfer
const newIdempotencyKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const QUICK_AMOUNTS = [100000, 500000, 1000000]

/**
 * Withdraw from the wallet to the bank account set in the wallet (PayoutAccountCard).
 * The server re-checks every rule; the checks here only give the owner an answer before sending.
 */
export default function WithdrawForm({ wallet, onDone }) {
  const [amountText, setAmountText] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { balance, limits, payoutAccount, canWithdraw, blockedReason } = wallet
  const amount = Number(amountText) || 0

  const changeAmount = (value) => {
    setAmountText(parseNumberInput(value))
    setError('')
  }

  const validate = () => {
    if (amount < limits.minAmount) return `Số tiền rút tối thiểu ${formatCurrency(limits.minAmount)}`
    if (amount > balance.available) return `Vượt quá số dư khả dụng (${formatCurrency(balance.available)})`
    return ''
  }

  const submit = async (event) => {
    event.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    const target = `${payoutAccount.bankName} ${payoutAccount.accountNumber} – ${payoutAccount.accountHolder}`
    if (!(await confirmToast(`Rút ${formatCurrency(amount)} về tài khoản ${target}?`, { confirmLabel: 'Rút tiền' }))) return

    setSubmitting(true)
    try {
      const response = await walletApi.createWithdrawal({ amount, idempotencyKey })
      if (response.data.status === 'failed') toast.error(response.message)
      else toast.success(response.message)
      setAmountText('')
      setIdempotencyKey(newIdempotencyKey())
      onDone()
    } catch (requestError) {
      const data = requestError.response?.data
      // 400: wrong amount (stay on the form). 409: the wallet changed (limit, balance): reload it.
      setError(data?.errors?.[0]?.message || data?.message || 'Không gửi được lệnh rút tiền')
      if (requestError.response?.status === 409) onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Rút tiền về ngân hàng</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            limits.remainingThisWeek > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          Còn {limits.remainingThisWeek}/{limits.maxPerWeek} lượt tuần này
        </span>
      </div>

      <div>
        <label htmlFor="withdraw-amount" className="text-sm font-semibold text-slate-800">
          Số tiền rút
        </label>
        <div className="relative mt-1">
          <input
            id="withdraw-amount"
            inputMode="numeric"
            autoComplete="off"
            value={formatNumber(amountText)}
            onChange={(event) => changeAmount(event.target.value)}
            disabled={!canWithdraw || submitting}
            placeholder={`Tối thiểu ${formatNumber(limits.minAmount)}`}
            aria-invalid={Boolean(error)}
            aria-describedby="withdraw-amount-help"
            className="w-full rounded-md border border-transparent bg-brand-light px-4 py-2.5 pr-10 text-lg font-bold tabular-nums text-slate-900 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">đ</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.filter((value) => value <= balance.available).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeAmount(String(value))}
              disabled={!canWithdraw || submitting}
              className="rounded-md border border-brand-soft px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-brand-light disabled:opacity-50"
            >
              {formatNumber(value)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => changeAmount(String(balance.available))}
            disabled={!canWithdraw || submitting}
            className="rounded-md border border-brand-soft px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50"
          >
            Rút tất cả
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <p id="withdraw-amount-help" className="mt-2 text-xs text-slate-500">
          Tối thiểu {formatCurrency(limits.minAmount)} · tối đa {limits.maxPerWeek} lần mỗi tuần (Thứ Hai – Chủ Nhật), lượt làm mới
          Thứ Hai {formatDay(limits.resetsOn)}. Lệnh thất bại được hoàn tiền và không tính lượt.
        </p>
      </div>

      {blockedReason && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{blockedReason}</p>}

      <button
        type="submit"
        disabled={!canWithdraw || submitting || amount === 0}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
      >
        {submitting ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <ArrowDownToLine className="h-4 w-4" />
        )}
        {amount > 0 ? `Rút ${formatCurrency(amount)}` : 'Rút tiền'}
      </button>
    </form>
  )
}
