import { Landmark } from 'lucide-react'
import { BANK_OPTIONS } from '../constants.js'
import FieldLabel from './FieldLabel.jsx'
import FieldError from './FieldError.jsx'

const inputClass =
  'w-full rounded-md bg-brand-light border border-transparent px-4 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/15'

// Bank account that receives the weekly settlement. Fill all three fields or leave all empty.
export default function PayoutAccountSection({ account, error, onChange }) {
  const change = (field, value) => onChange({ ...account, [field]: value })

  return (
    <section className="bg-white rounded-xl border border-brand-soft/60 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-5 border-b border-brand-soft/60">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Landmark className="w-4 h-4 text-brand" />
          Tài khoản nhận tiền
        </h2>
        <span className="text-xs text-slate-500">Nhận quyết toán mỗi Thứ Hai · chỉ quán thấy</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="bankName" label="Ngân hàng" />
          <input
            id="bankName"
            list="bank-options"
            className={inputClass}
            value={account.bankName}
            maxLength={60}
            placeholder="VD: Vietcombank"
            onChange={(e) => change('bankName', e.target.value)}
          />
          <datalist id="bank-options">
            {BANK_OPTIONS.map((bank) => (
              <option key={bank} value={bank} />
            ))}
          </datalist>
        </div>

        <div>
          <FieldLabel htmlFor="accountNumber" label="Số tài khoản" hint="6–20 chữ số" />
          <input
            id="accountNumber"
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} tabular-nums`}
            value={account.accountNumber}
            maxLength={20}
            placeholder="VD: 0011001234567"
            onChange={(e) => change('accountNumber', e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel htmlFor="accountHolder" label="Tên chủ tài khoản" hint="Viết hoa không dấu, đúng như trên thẻ" />
          <input
            id="accountHolder"
            autoComplete="off"
            className={`${inputClass} uppercase`}
            value={account.accountHolder}
            maxLength={100}
            placeholder="VD: NGUYEN VAN AN"
            onChange={(e) => change('accountHolder', e.target.value.toUpperCase())}
          />
        </div>
      </div>
      <FieldError message={error} />
    </section>
  )
}
