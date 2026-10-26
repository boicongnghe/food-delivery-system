import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="text-8xl font-black text-primary tracking-tight mb-4 drop-shadow-sm">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
        Không tìm thấy trang yêu cầu
      </h1>
      <p className="text-slate-500 max-w-md text-sm sm:text-base mb-8">
        Trang bạn đang tìm kiếm có thể đã bị xóa, thay đổi tên hoặc tạm thời không khả dụng.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Về trang chủ
      </Link>
    </div>
  )
}
