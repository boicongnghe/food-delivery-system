import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'

// Shown when the owner has not created a restaurant profile yet (UC19 required first)
export default function NoRestaurantNotice() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Store className="mx-auto h-12 w-12 text-brand" />
      <h1 className="mt-4 font-serif text-2xl font-semibold text-slate-900">Bạn chưa có hồ sơ quán</h1>
      <p className="mt-2 text-sm text-slate-600">
        Hãy tạo hồ sơ nhà hàng trước, sau đó quay lại đây để xây dựng thực đơn.
      </p>
      <Link
        to="/restaurant/profile"
        className="mt-6 inline-flex rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover hover:text-white"
      >
        Tạo hồ sơ quán
      </Link>
    </div>
  )
}
