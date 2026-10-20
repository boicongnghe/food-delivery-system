import { useState } from 'react'
import {
  TrendingUp,
  Store,
  Users,
  Bike,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [pendingRestaurants, setPendingRestaurants] = useState([
    {
      id: 'REST-109',
      name: 'Bếp Cơm Niêu Singapore',
      owner: 'Trần Đình Trọng',
      phone: '0938123456',
      address: '220 Lê Văn Sỹ, Q.3, TP.HCM',
      category: 'Cơm & Món Á',
      date: 'Hôm nay 09:30',
    },
    {
      id: 'REST-110',
      name: 'Trà Sữa Matcha Kyoto Authentic',
      owner: 'Vũ Thảo Vy',
      phone: '0977889900',
      address: '45 Nguyễn Đình Chiểu, Q.1, TP.HCM',
      category: 'Đồ uống & Tráng miệng',
      date: 'Hôm qua 16:45',
    },
  ])

  const handleApprove = (id, name) => {
    setPendingRestaurants((prev) => prev.filter((r) => r.id !== id))
    toast.success(`Đã phê duyệt hoạt động cho quán "${name}"!`)
  }

  const handleReject = (id, name) => {
    setPendingRestaurants((prev) => prev.filter((r) => r.id !== id))
    toast.error(`Đã từ chối đơn đăng ký của "${name}".`)
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-400" />
            Bảng Điều Khiển Quản Trị Hệ Thống
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Giám sát vận hành sàn giao đồ ăn, kiểm duyệt đối tác và quản lý người dùng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
            Hệ thống: Tách biệt hoàn toàn với trang khách hàng
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng GMV Toàn Sàn</span>
            <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-white">482.500.000 đ</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> +24.8% so với tháng trước
          </p>
        </div>

        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Khách Hàng Đăng Ký</span>
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-white">12.840</p>
          <p className="text-xs text-blue-400 flex items-center gap-1 mt-2 font-semibold">
            +180 tài khoản mới tuần này
          </p>
        </div>

        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nhà Hàng Đối Tác</span>
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-white">428 quán</p>
          <p className="text-xs text-amber-400 flex items-center gap-1 mt-2 font-semibold">
            2 quán đang chờ duyệt
          </p>
        </div>

        <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Đội Ngũ Tài Xế</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-white">850 shipper</p>
          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2 font-semibold">
            214 shipper đang online
          </p>
        </div>
      </div>

      {/* Pending Approvals Table */}
      <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Hồ sơ đối tác nhà hàng chờ duyệt</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kiểm tra thông tin giấy phép vệ sinh an toàn thực phẩm</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">
            {pendingRestaurants.length} yêu cầu
          </span>
        </div>

        {pendingRestaurants.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Tất cả hồ sơ đăng ký quán ăn đã được xử lý xong! ✨
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRestaurants.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded-lg border border-purple-800/50">
                      {item.id}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <span className="text-xs text-slate-500">({item.category})</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Chủ sở hữu: <span className="text-slate-300">{item.owner}</span> | SĐT: {item.phone}
                  </p>
                  <p className="text-xs text-slate-500">{item.address}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id, item.name)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Phê duyệt quán
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item.id, item.name)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 font-bold text-xs transition-colors border border-slate-700"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Warning / Security Logs */}
      <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-3">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Nhật Ký Bảo Mật & Hệ Thống (System Logs)
        </h3>
        <div className="text-xs font-mono text-slate-400 space-y-1.5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/60">
          <p className="text-emerald-400">[INFO] 12:35:10 - JWT Security Guard: Active and enforcing token validation</p>
          <p className="text-blue-400">[INFO] 12:30:22 - MongoDB Cluster connection synchronized (Pool: 10 connections)</p>
          <p className="text-slate-400">[AUDIT] 12:20:15 - Role-Based Access Control verified: 4 roles configured</p>
        </div>
      </div>
    </div>
  )
}
