import { useState } from 'react'
import toast from 'react-hot-toast'
import { Landmark, Pencil } from 'lucide-react'
import walletApi from '../../../api/walletApi.js'
import { BANK_OPTIONS } from '../constants.js'

const inputClass =
  'w-full rounded-md border border-transparent bg-brand-light px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15'

// "Nguyễn Văn Ân" -> "NGUYEN VAN AN": the name printed on bank cards
const toCardName = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '')
    .replace(/\s{2,}/g, ' ')

const EMPTY_ACCOUNT = { bankName: '', accountNumber: '', accountHolder: '' }

// Same rules as payoutAccountSchema on the server
const validateAccount = ({ bankName, accountNumber, accountHolder }) => {
  const errors = {}
  if (bankName.trim().length < 2) errors.bankName = 'Vui lòng nhập ngân hàng'
  if (!/^\d{6,20}$/.test(accountNumber)) errors.accountNumber = 'Số tài khoản gồm 6–20 chữ số'
  if (!accountHolder.trim()) errors.accountHolder = 'Vui lòng nhập tên chủ tài khoản'
  return errors
}

/**
 * Bank account that receives the wallet withdrawals: shown masked, edited here only.
 * @param {object} account - full account of the restaurant (owner's own data, from the layout context)
 * @param {object} maskedAccount - same account with a masked number (wallet API)
 * @param {(restaurant: object) => void} onSaved - receives the updated restaurant
 */
export default function PayoutAccountCard({ account, maskedAccount, locked, onSaved }) {
  const isSet = maskedAccount.isSet
  const [editing, setEditing] = useState(!isSet)
  const [form, setForm] = useState(() => ({ ...EMPTY_ACCOUNT, ...account }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const cancel = () => {
    setForm({ ...EMPTY_ACCOUNT, ...account })
    setErrors({})
    setEditing(false)
  }

  const save = async (event) => {
    event.preventDefault()
    const payload = { ...form, bankName: form.bankName.trim(), accountHolder: form.accountHolder.trim() }
    const fieldErrors = validateAccount(payload)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    // Changing where the money goes deserves an explicit confirmation
    if (isSet && !window.confirm('Đổi tài khoản nhận tiền? Các lệnh rút từ bây giờ sẽ chuyển về tài khoản mới.')) return

    setSaving(true)
    try {
      const response = await walletApi.updatePayoutAccount(payload)
      toast.success(response.message)
      setEditing(false)
      onSaved(response.data)
    } catch (error) {
      const data = error.response?.data
      const apiErrors = Object.fromEntries((data?.errors || []).map(({ field, message }) => [field, message]))
      setErrors(apiErrors)
      if (!data?.errors?.length) toast.error(data?.message || 'Không lưu được tài khoản nhận tiền')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
          <Landmark className="h-4 w-4 text-brand" aria-hidden="true" />
          Tài khoản nhận tiền
        </h2>
        {isSet && !editing && !locked && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" />
            Sửa
          </button>
        )}
      </div>

      {!editing ? (
        <div className="mt-3 rounded-lg bg-brand-light/60 px-3 py-2.5 text-sm">
          <p className="font-bold text-slate-900">{maskedAccount.bankName}</p>
          <p className="tabular-nums text-slate-700">{maskedAccount.accountNumber}</p>
          <p className="text-slate-600">{maskedAccount.accountHolder}</p>
        </div>
      ) : (
        <form onSubmit={save} className="mt-3 space-y-3" noValidate>
          {!isSet && <p className="text-xs text-slate-500">Khai báo tài khoản ngân hàng để rút tiền từ ví. Chỉ quán thấy.</p>}
          <div>
            <label htmlFor="payout-bank" className="text-xs font-semibold text-slate-700">
              Ngân hàng
            </label>
            <input
              id="payout-bank"
              list="payout-bank-options"
              className={`${inputClass} mt-1`}
              value={form.bankName}
              maxLength={60}
              placeholder="VD: Vietcombank"
              onChange={(event) => change('bankName', event.target.value)}
              aria-invalid={Boolean(errors.bankName)}
            />
            <datalist id="payout-bank-options">
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank} />
              ))}
            </datalist>
            {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName}</p>}
          </div>
          <div>
            <label htmlFor="payout-number" className="text-xs font-semibold text-slate-700">
              Số tài khoản <span className="font-normal text-slate-400">(6–20 chữ số)</span>
            </label>
            <input
              id="payout-number"
              inputMode="numeric"
              autoComplete="off"
              className={`${inputClass} mt-1 tabular-nums`}
              value={form.accountNumber}
              maxLength={20}
              placeholder="VD: 0011001234567"
              onChange={(event) => change('accountNumber', event.target.value.replace(/\D/g, ''))}
              aria-invalid={Boolean(errors.accountNumber)}
            />
            {errors.accountNumber && <p className="mt-1 text-xs text-red-600">{errors.accountNumber}</p>}
          </div>
          <div>
            <label htmlFor="payout-holder" className="text-xs font-semibold text-slate-700">
              Tên chủ tài khoản <span className="font-normal text-slate-400">(viết hoa không dấu, đúng như trên thẻ)</span>
            </label>
            <input
              id="payout-holder"
              autoComplete="off"
              className={`${inputClass} mt-1 uppercase`}
              value={form.accountHolder}
              maxLength={100}
              placeholder="VD: NGUYEN VAN AN"
              onChange={(event) => change('accountHolder', toCardName(event.target.value))}
              aria-invalid={Boolean(errors.accountHolder)}
            />
            {errors.accountHolder && <p className="mt-1 text-xs text-red-600">{errors.accountHolder}</p>}
          </div>
          <div className="flex gap-2">
            {isSet && (
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="flex-1 rounded-md bg-brand-light py-2 text-sm font-semibold text-slate-700 hover:bg-brand-soft disabled:opacity-50"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={saving || locked}
              className="flex-1 rounded-md bg-slate-900 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu tài khoản'}
            </button>
          </div>
        </form>
      )}
      {locked && <p className="mt-2 text-xs text-amber-800">Quán đang bị tạm ngưng nên không thể đổi tài khoản nhận tiền.</p>}
    </section>
  )
}
