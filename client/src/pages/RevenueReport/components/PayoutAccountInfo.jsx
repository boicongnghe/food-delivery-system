import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'

// Masked bank account that receives the weekly transfer (full number only on the profile page)
export default function PayoutAccountInfo({ account }) {
  if (!account.isSet) {
    return (
      <p className="flex flex-wrap items-center gap-1 text-xs text-amber-800">
        <Landmark className="h-4 w-4" aria-hidden="true" />
        Chưa có tài khoản nhận tiền.
        <Link to="/restaurant/profile" className="font-bold underline">
          Thêm trong Hồ sơ quán
        </Link>
      </p>
    )
  }

  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
      <Landmark className="h-4 w-4 text-brand" aria-hidden="true" />
      Nhận tiền về <b className="text-slate-800">{account.bankName}</b>
      <span className="tabular-nums">{account.accountNumber}</span>· {account.accountHolder}
    </p>
  )
}
