import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bike,
  DollarSign,
  Navigation,
  ExternalLink,
  LogOut,
  Power,
  Sparkles,
  ShieldCheck,
  Calendar,
  CreditCard,
  Camera,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import AvatarModal from '../../components/AvatarModal/AvatarModal.jsx'

export default function ShipperDashboard() {
  const { user, logout } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const [availableOrders, setAvailableOrders] = useState([
    {
      id: 'DH-8921',
      restaurant: 'Cơm Tấm Ba Ghiền',
      pickupAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận',
      deliveryAddress: 'Phòng 402, Tòa Nhà Bitexco, Q.1',
      distance: '3.4 km',
      shippingFee: 32000,
      customerName: 'Nguyễn Văn Khách',
      customerPhone: '0901234567',
      items: '2x Cơm Tấm Sườn Bì Chả, 1x Canh Khổ Qua',
      paymentMethod: 'Tiền mặt khi nhận hàng (COD)',
    },
    {
      id: 'DH-8925',
      restaurant: 'The Grill Burger House',
      pickupAddress: '150 Hai Bà Trưng, P.Bến Nghé, Q.1',
      deliveryAddress: 'Chung cư Masteri Thảo Điền, Q.2',
      distance: '4.8 km',
      shippingFee: 45000,
      customerName: 'Trần Thảo Ly',
      customerPhone: '0988776655',
      items: '1x Burger Bò Double, 1x Khoai tây chiên',
      paymentMethod: 'Đã thanh toán Online',
    },
  ])

  const [activeOrder, setActiveOrder] = useState(null)

  const handleToggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev
      toast(next ? 'Đã bật chế độ sẵn sàng nhận đơn! 🛵' : 'Đã tạm dừng nhận đơn! ⏸️')
      return next
    })
  }

  const handleAcceptOrder = (order) => {
    setActiveOrder({ ...order, step: 1 }) // 1: Đến quán lấy món, 2: Đang giao khách
    setAvailableOrders((prev) => prev.filter((o) => o.id !== order.id))
    toast.success(`Đã nhận đơn ${order.id}! Hãy di chuyển đến quán lấy món.`)
  }

  const handleNextStep = () => {
    if (activeOrder.step === 1) {
      setActiveOrder((prev) => ({ ...prev, step: 2 }))
      toast.success('Đã lấy món từ quán thành công! Tiến hành giao tới khách.')
    } else if (activeOrder.step === 2) {
      toast.success(`Hoàn thành đơn ${activeOrder.id}! Tiền cước đã cộng vào ví. 🎉`, {
        icon: '💵',
        duration: 4000,
      })
      setActiveOrder(null)
    }
  }

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {user?.shipperDetails?.status === 'pending' && (
          <div className="bg-amber-500 text-white p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-3 shadow-sm animate-in fade-in">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-bold">Hồ sơ đối tác tài xế đang CHỜ XÉT DUYỆT</p>
              <p className="text-xs text-amber-100 mt-0.5">
                Ban quản trị đang tiến hành xác minh giấy đăng ký xe và CCCD của bạn. Sau khi được duyệt, bạn sẽ có thể nhận đơn và giao hàng.
              </p>
            </div>
          </div>
        )}

        {user?.shipperDetails?.status === 'rejected' && (
          <div className="bg-red-600 text-white p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-3 shadow-sm animate-in fade-in">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-bold">Hồ sơ đối tác tài xế ĐÃ BỊ TỪ CHỐI</p>
              <p className="text-xs text-red-100 mt-0.5">
                Giấy tờ đăng ký xe hoặc CCCD chưa hợp lệ. Vui lòng liên hệ tổng đài để được hỗ trợ kiểm tra lại.
              </p>
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div
              className="relative group cursor-pointer flex-shrink-0"
              onClick={() => setAvatarModalOpen(true)}
              title="Bấm để đổi ảnh đại diện tài xế"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80'}
                alt={user?.fullName || 'Tài xế'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-emerald-500/20 shadow-md group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                  🛵 Tài Xế Giao Hàng Thần Tốc
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  ● {isOnline ? 'Đang trực tuyến' : 'Đang tạm nghỉ'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {user?.fullName || 'Lê Văn Tài Xế'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                SĐT: {user?.phone || '0923456789'} | Phương tiện: {user?.shipperDetails?.vehicleInfo || 'Honda Wave Alpha - 59-P1 888.88'}
              </p>

              {/* Chỉnh ảnh trực tiếp ở trang quản lý */}
              <div className="mt-2.5">
                <button
                  type="button"
                  id="shipper-edit-avatar-btn"
                  onClick={() => setAvatarModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  📸 Chỉnh sửa ảnh tài xế
                </button>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleOnline}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Power className="w-4 h-4" />
              {isOnline ? 'Đang Bật Nhận Đơn' : 'Bật Trực Tuyến'}
            </button>

            {/* View Homepage button - requirement: "tương tự như delivery cũng như thế" */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white text-sm font-bold shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Xem Trang Chủ Khách Hàng
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-bold transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Thông tin giấy tờ tài xế & tình trạng bảo hiểm xe */}
        {user?.shipperDetails && (user?.shipperDetails?.citizenId || user?.shipperDetails?.dateOfBirth) && (
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 bg-emerald-200/60 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> Hồ Sơ Tài Xế Đã Kích Hoạt
                </span>
                {user.shipperDetails.citizenId && (
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 text-slate-700 font-mono font-bold flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> CCCD: {user.shipperDetails.citizenId}
                  </span>
                )}
                {user.shipperDetails.dateOfBirth && (
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white border border-emerald-200 text-slate-700 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Ngày sinh: {user.shipperDetails.dateOfBirth}
                  </span>
                )}
              </div>
              {user.shipperDetails.vehicleInfo && (
                <p className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Giấy tờ & Phương tiện:</span> {user.shipperDetails.vehicleInfo}
                </p>
              )}
            </div>

            {/* Trạng thái bảo hiểm xe */}
            <div className="flex items-center gap-2 flex-shrink-0 bg-white p-2.5 rounded-2xl border border-emerald-200">
              {user.shipperDetails.vehicleInsurance?.submitLater ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <div className="text-left text-xs">
                    <p className="font-bold text-amber-800">Chờ bổ sung bảo hiểm</p>
                    <span className="text-[10px] text-slate-400">Cho phép nộp sau khi nhận việc</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <div className="text-left text-xs">
                    <p className="font-bold text-emerald-800">Đã nộp bảo hiểm xe</p>
                    <span className="text-[10px] text-slate-400">
                      {user.shipperDetails.vehicleInsurance?.insuranceInfo || 'Đã xác thực hợp lệ'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shipper Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Thu nhập ca hôm nay</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">385.000 đ</p>
              <span className="text-[11px] font-semibold text-emerald-600">Đã cộng vào ví tài xế</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Số cuốc hoàn thành</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">12 chuyến</p>
              <span className="text-[11px] font-semibold text-blue-600">Hiệu suất 100%</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Quãng đường chạy</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">38.5 km</p>
              <span className="text-[11px] font-semibold text-slate-500">Trung bình 3.2 km/cuốc</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Điểm đánh giá uy tín</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">5.0 ⭐</p>
              <span className="text-[11px] font-semibold text-emerald-600">Tài xế chuẩn 5 sao</span>
            </div>
          </div>
        </div>

        {/* Active Order in Progress (if any) */}
        {activeOrder && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/20">
              <div>
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                  Đơn hàng đang thực hiện: {activeOrder.id}
                </span>
                <h3 className="text-xl font-black mt-2">
                  {activeOrder.step === 1 ? 'Bước 1: Di chuyển tới quán lấy món' : 'Bước 2: Giao món tận tay khách'}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-100 block">Tiền cước cuốc xe</span>
                <span className="text-2xl font-black text-amber-200">{formatPrice(activeOrder.shippingFee)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <p className="text-xs font-bold text-emerald-200">Điểm lấy món (Quán ăn):</p>
                <p className="text-sm font-black mt-0.5">{activeOrder.restaurant}</p>
                <p className="text-xs text-white/80">{activeOrder.pickupAddress}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl">
                <p className="text-xs font-bold text-emerald-200">Điểm giao tới khách:</p>
                <p className="text-sm font-black mt-0.5">{activeOrder.customerName} - {activeOrder.customerPhone}</p>
                <p className="text-xs text-white/80">{activeOrder.deliveryAddress}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 font-black text-sm shadow-lg transition-transform active:scale-95"
              >
                {activeOrder.step === 1 ? '✓ Đã lấy món từ quán' : '✓ Hoàn thành giao đơn'}
              </button>
            </div>
          </div>
        )}

        {/* Available Orders List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Đơn hàng mới quanh khu vực bạn</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cập nhật realtime theo vị trí GPS</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {availableOrders.length} đơn sẵn sàng
            </span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">Hiện tại không có đơn mới quanh khu vực bạn.</p>
              <p className="text-xs mt-1">Hệ thống sẽ tự động quét đơn khi có khách đặt món.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-black bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                        {order.id}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        Khoảng cách: {order.distance}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block">Quán ăn:</span>
                        <span className="font-bold text-slate-800">{order.restaurant}</span>
                        <span className="text-slate-500 block truncate">{order.pickupAddress}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Khách nhận:</span>
                        <span className="font-bold text-slate-800">{order.customerName}</span>
                        <span className="text-slate-500 block truncate">{order.deliveryAddress}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <span className="font-bold">Món giao:</span> {order.items}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 min-w-[180px]">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Thu nhập cuốc</span>
                      <span className="text-xl font-black text-emerald-600">{formatPrice(order.shippingFee)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAcceptOrder(order)}
                      disabled={!isOnline}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40"
                    >
                      Nhận cuốc xe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Đổi Ảnh Đại Diện Tài Xế */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
    </div>
  )
}
