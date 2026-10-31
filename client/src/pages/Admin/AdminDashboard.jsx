import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  Users,
  Bike,
  FileSearch,
  AlertTriangle,
  Shield,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi from '../../api/adminApi.js'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalShippers: 0,
    pendingRestaurants: 0,
    pendingShippers: 0,
  })
  const [pendingRestaurants, setPendingRestaurants] = useState([])
  const [pendingShippers, setPendingShippers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('restaurants') // 'restaurants' | 'shippers'

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsRes, approvalsRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getPendingApprovals(),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data)
      }

      if (approvalsRes.status === 'fulfilled' && approvalsRes.value?.data) {
        setPendingRestaurants(approvalsRes.value.data.restaurants || [])
        setPendingShippers(approvalsRes.value.data.shippers || [])
      }
    } catch {
      toast.error('Không tải được dữ liệu quản trị')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            Bảng Điều Khiển Quản Trị Hệ Thống
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Giám sát vận hành sàn giao đồ ăn, kiểm duyệt đối tác và quản lý người dùng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-crave-border hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30">
            Hệ thống quản trị thời gian thực
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-crave-surface p-6 rounded-3xl border border-slate-100 dark:border-crave-border shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tổng Tài Khoản</span>
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalUsers} người dùng</p>
          <p className="text-xs text-primary flex items-center gap-1 mt-2 font-semibold">
            Tất cả vai trò đã đăng ký
          </p>
        </div>

        <div className="bg-white dark:bg-crave-surface p-6 rounded-3xl border border-slate-100 dark:border-crave-border shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nhà Hàng Đối Tác</span>
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalRestaurants} quán</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2 font-semibold">
            {stats.pendingRestaurants} quán đang chờ duyệt
          </p>
        </div>

        <div className="bg-white dark:bg-crave-surface p-6 rounded-3xl border border-slate-100 dark:border-crave-border shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Đội Ngũ Tài Xế</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bike className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalShippers} shipper</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2 font-semibold">
            {stats.pendingShippers} hồ sơ đang chờ duyệt
          </p>
        </div>

        <div className="bg-white dark:bg-crave-surface p-6 rounded-3xl border border-slate-100 dark:border-crave-border shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tổng Chờ Phê Duyệt</span>
            <span className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {pendingRestaurants.length + pendingShippers.length} hồ sơ
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-2 font-semibold">
            Cần xử lý kiểm duyệt giấy tờ
          </p>
        </div>
      </div>

      {/* Pending Approvals Table Section */}
      <div className="bg-white dark:bg-crave-surface rounded-3xl p-6 border border-slate-100 dark:border-crave-border shadow-sm dark:shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-crave-border">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Hồ sơ đối tác đang chờ duyệt</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hồ sơ cũ nhất ở trên cùng. Mở hồ sơ để đối chiếu thông tin đăng ký trước khi duyệt</p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-crave-dark p-1 rounded-2xl border border-slate-100 dark:border-crave-border">
            <button
              type="button"
              onClick={() => setActiveTab('restaurants')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'restaurants'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Quán ăn ({pendingRestaurants.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shippers')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'shippers'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tài xế ({pendingShippers.length})
            </button>
          </div>
        </div>

        {/* TAB 1: PENDING RESTAURANTS */}
        {activeTab === 'restaurants' && (
          pendingRestaurants.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm bg-slate-50/70 dark:bg-crave-dark/40 rounded-2xl border border-dashed border-slate-100 dark:border-crave-border">
              🎉 Không có hồ sơ nhà hàng nào đang chờ duyệt!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRestaurants.map((item) => (
                <div
                  key={item._id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-crave-dark border border-slate-100 dark:border-crave-border flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        CHỜ DUYỆT
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.name}</h4>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Chủ quán: <span className="font-bold text-slate-900 dark:text-white">{item.owner?.fullName || 'Chưa cập nhật'}</span>
                      {item.owner?.email && ` • Email: ${item.owner.email}`}
                      {item.phone && ` • SĐT: ${item.phone}`}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Địa chỉ: <span className="text-slate-700 dark:text-slate-300">{item.address}</span>
                    </p>

                    {item.description && (
                      <p className="text-xs text-slate-500 italic">Mặt hàng: {item.description}</p>
                    )}
                  </div>

                  <Link
                    to={`/admin/restaurants?review=${item._id}`}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/30 transition-colors"
                  >
                    <FileSearch className="w-3.5 h-3.5" /> Xem hồ sơ & duyệt
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 2: PENDING SHIPPERS */}
        {activeTab === 'shippers' && (
          pendingShippers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm bg-slate-50/70 dark:bg-crave-dark/40 rounded-2xl border border-dashed border-slate-100 dark:border-crave-border">
              🎉 Không có hồ sơ tài xế nào đang chờ duyệt!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingShippers.map((item) => (
                <div
                  key={item._id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-crave-dark border border-slate-100 dark:border-crave-border flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                        CHỜ DUYỆT TÀI XẾ
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.fullName || item.user?.fullName}</h4>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      SĐT: <span className="font-bold text-slate-900 dark:text-white">{item.phone || item.user?.phone}</span>
                      {item.citizenId && ` • CCCD: ${item.citizenId}`}
                      {item.dateOfBirth && ` • Ngày sinh: ${item.dateOfBirth}`}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Phương tiện: <span className="text-emerald-600 dark:text-emerald-300 font-medium">{item.vehicleInfo}</span>
                    </p>

                    {item.vehicleInsurance?.insuranceInfo && (
                      <p className="text-xs text-slate-500">Bảo hiểm: {item.vehicleInsurance.insuranceInfo}</p>
                    )}
                  </div>

                  <Link
                    to={`/admin/shippers?review=${item._id}`}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/30 transition-colors"
                  >
                    <FileSearch className="w-3.5 h-3.5" /> Xem hồ sơ & duyệt
                  </Link>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
