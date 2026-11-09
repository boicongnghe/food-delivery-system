import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDownToLine } from 'lucide-react'
import walletApi from '../../../api/walletApi.js'
import { confirmToast } from '../../../utils/confirmToast.jsx'
import { formatCurrency, formatNumber, parseNumberInput } from '../../../utils/formatCurrency.js'

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000]

/**
 * Customer withdrawal to the DEFAULT saved bank account (the admin then confirms the transfer).
 * The server re-checks the balance and the minimum.
 */
export default function CustomerWithdrawForm({ balance, minAmount, defaultAccount, onDone }) {
  const [amountText, setAmountText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const amount = Number(amountText) || 0
  const canWithdraw = Boolean(defaultAccount) && balance >= minAmount

  const changeAmount = (value) => {
    setAmountText(parseNumberInput(value))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (amount < minAmount) return setError(`Số tiền rút tối thiểu ${formatCurrency(minAmount)}`)
    if (amount > balance) return setError(`Vượt quá số dư ví (${formatCurrency(balance)})`)
    const target = `${defaultAccount.bankName} ${defaultAccount.accountNumber} – ${defaultAccount.accountHolder}`
    if (!(await confirmToast(`Rút ${formatCurrency(amount)} về tài khoản ${target}?`, { confirmLabel: 'Rút tiền' }))) return

    setSubmitting(true)
    try {
      const response = await walletApi.requestWithdrawal({ amount })
      toast.success(response.message || 'Đã gửi yêu cầu rút tiền')
      setAmountText('')
      onDone()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không gửi được yêu cầu rút tiền')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold text-slate-900">Rút tiền về ngân hàng</h2>

      <div>
        <label htmlFor="customer-withdraw-amount" className="text-sm font-semibold text-slate-800">
          Số tiền rút
        </label>
        <div className="relative mt-1">
          <input
            id="customer-withdraw-amount"
            inputMode="numeric"
            autoComplete="off"
            value={formatNumber(amountText)}
            onChange={(event) => changeAmount(event.target.value)}
            disabled={!canWithdraw || submitting}
            placeholder={`Tối thiểu ${formatNumber(minAmount)}`}
            aria-invalid={Boolean(error)}
            className="w-full rounded-md border border-transparent bg-brand-light px-4 py-2.5 pr-10 text-lg font-bold tabular-nums text-slate-900 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">đ</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.filter((value) => value <= balance).map((value) => (
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
            onClick={() => changeAmount(String(balance))}
            disabled={!canWithdraw || submitting}
            className="rounded-md border border-brand-soft px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-light disabled:opacity-50"
          >
            Rút tất cả
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {defaultAccount ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Tiền chuyển về tài khoản mặc định: <b>{defaultAccount.bankName}</b>{' '}
          <span className="tabular-nums">{defaultAccount.accountNumber}</span> – {defaultAccount.accountHolder}
        </p>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Hãy thêm tài khoản ngân hàng nhận tiền trước khi rút.</p>
      )}
      <p className="text-xs text-slate-500">
        Tối thiểu {formatCurrency(minAmount)}. Quản trị viên duyệt và chuyển khoản; nếu bị từ chối, tiền được hoàn lại vào ví.
      </p>

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
