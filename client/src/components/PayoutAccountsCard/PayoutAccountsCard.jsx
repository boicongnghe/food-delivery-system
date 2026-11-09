import { useState } from 'react'
import toast from 'react-hot-toast'
import { Landmark, Plus, Star, Trash2 } from 'lucide-react'
import { BANK_OPTIONS } from '../../utils/bankOptions.js'
import { confirmToast } from '../../utils/confirmToast.jsx'

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

const EMPTY_FORM = { bankName: '', accountNumber: '', accountHolder: '', makeDefault: false }

// Same rules as payoutAccountSchema on the server
const validateAccount = ({ bankName, accountNumber, accountHolder }) => {
  const errors = {}
  if (bankName.trim().length < 2) errors.bankName = 'Vui lòng nhập ngân hàng'
  if (!/^\d{6,20}$/.test(accountNumber)) errors.accountNumber = 'Số tài khoản gồm 6–20 chữ số'
  if (!accountHolder.trim()) errors.accountHolder = 'Vui lòng nhập tên chủ tài khoản'
  return errors
}

/**
 * Bank accounts that receive the wallet withdrawals: several can be saved, the default one receives the money.
 * Shared by the restaurant, customer and shipper wallets; each one passes its own API.
 * @param {{ _id, bankName, accountNumber (masked), accountHolder, isDefault }[]} accounts - default first
 * @param {{ add: (payload) => Promise, setDefault: (id) => Promise, remove: (id) => Promise }} api - each resolves
 *   with the API response ({ message })
 * @param {() => void} onChanged - reload the wallet after a change
 * @param {string} lockedMessage - shown when locked (e.g. suspended restaurant)
 */
export default function PayoutAccountsCard({ accounts, maxAccounts = 5, api, locked = false, lockedMessage = '', onChanged }) {
  const [adding, setAdding] = useState(accounts.length === 0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const isFirst = accounts.length === 0
  const isFull = accounts.length >= maxAccounts

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const closeForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setAdding(false)
  }

  const add = async (event) => {
    event.preventDefault()
    const payload = { ...form, bankName: form.bankName.trim(), accountHolder: form.accountHolder.trim() }
    const fieldErrors = validateAccount(payload)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    setSaving(true)
    try {
      const response = await api.add(payload)
      toast.success(response.message)
      closeForm()
      onChanged()
    } catch (error) {
      const data = error.response?.data
      setErrors(Object.fromEntries((data?.errors || []).map(({ field, message }) => [field, message])))
      if (!data?.errors?.length) toast.error(data?.message || 'Không thêm được tài khoản')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (account, request) => {
    setBusyId(account._id)
    try {
      const response = await request()
      toast.success(response.message)
      onChanged()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác không thành công')
    } finally {
      setBusyId('')
    }
  }

  const makeDefault = async (account) => {
    // Changing where the money goes deserves an explicit confirmation
    const label = `${account.bankName} ${account.accountNumber}`
    if (!(await confirmToast(`Đặt ${label} làm tài khoản mặc định? Các lệnh rút từ bây giờ sẽ chuyển về tài khoản này.`, { confirmLabel: 'Đặt mặc định' }))) return
    runAction(account, () => api.setDefault(account._id))
  }

  const remove = async (account) => {
    if (!(await confirmToast(`Xóa tài khoản ${account.bankName} ${account.accountNumber}?`, { confirmLabel: 'Xóa', danger: true }))) return
    runAction(account, () => api.remove(account._id))
  }

  return (
    <section className="rounded-xl border border-brand-soft/70 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
          <Landmark className="h-4 w-4 text-brand" aria-hidden="true" />
          Tài khoản nhận tiền
        </h2>
        <span className="text-xs text-slate-500">
          {accounts.length}/{maxAccounts}
        </span>
      </div>

      {accounts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {accounts.map((account) => {
            // The default account can only be removed when it is the last one (pick another default first)
            const canRemove = !account.isDefault || accounts.length === 1
            return (
              <li
                key={account._id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  account.isDefault ? 'border-emerald-300 bg-emerald-50/60' : 'border-brand-soft/70 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-bold text-slate-900">
                      {account.bankName}
                      {account.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          <Star className="h-3 w-3" aria-hidden="true" />
                          Mặc định
                        </span>
                      )}
                    </p>
                    <p className="tabular-nums text-slate-700">{account.accountNumber}</p>
                    <p className="truncate text-xs text-slate-500">{account.accountHolder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(account)}
                    disabled={locked || busyId === account._id || !canRemove}
                    title={canRemove ? 'Xóa tài khoản' : 'Hãy đặt tài khoản khác làm mặc định trước khi xóa'}
                    aria-label={`Xóa tài khoản ${account.bankName}`}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {account.isDefault ? (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">Tiền rút từ ví chuyển về tài khoản này</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => makeDefault(account)}
                    disabled={locked || busyId === account._id}
                    className="mt-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                  >
                    Đặt làm mặc định
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={locked || isFull}
          title={isFull ? `Tối đa ${maxAccounts} tài khoản` : undefined}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-brand-soft py-2 text-sm font-semibold text-brand hover:bg-brand-light disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isFull ? `Đã đủ ${maxAccounts} tài khoản` : 'Thêm ngân hàng'}
        </button>
      ) : (
        <form onSubmit={add} className="mt-3 space-y-3 rounded-lg border border-brand-soft/70 p-3" noValidate>
          {isFirst && <p className="text-xs text-slate-500">Khai báo tài khoản ngân hàng để rút tiền từ ví. Chỉ quán thấy.</p>}
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isFirst || form.makeDefault}
              disabled={isFirst}
              onChange={(event) => change('makeDefault', event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Đặt làm tài khoản mặc định {isFirst && <span className="text-xs text-slate-400">(tài khoản đầu tiên)</span>}
          </label>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={closeForm}
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
      {locked && lockedMessage && <p className="mt-2 text-xs text-amber-800">{lockedMessage}</p>}
    </section>
  )
}
