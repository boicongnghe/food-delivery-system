import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UtensilsCrossed,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Star,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  ToggleLeft,
  ToggleRight,
  LogOut,
  MapPin,
  FileText,
  ShieldCheck,
  Camera,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import AvatarModal from '../../components/AvatarModal/AvatarModal.jsx'

export default function RestaurantDashboard() {
  const { user, logout } = useAuth()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'menu'
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: 'Cơm Tấm Sườn Bì Chả Đặc Biệt', price: 65000, category: 'Cơm tấm', inStock: true, orders: 142 },
    { id: 2, name: 'Cơm Sườn Non Nướng Muối Ớt', price: 70000, category: 'Cơm tấm', inStock: true, orders: 98 },
    { id: 3, name: 'Canh Khổ Qua Nhồi Thịt', price: 25000, category: 'Món canh', inStock: true, orders: 64 },
    { id: 4, name: 'Chả Trứng Hấp Hoàng Kim', price: 15000, category: 'Món thêm', inStock: false, orders: 45 },
    { id: 5, name: 'Trà Tắc Xí Muội Khổng Lồ', price: 20000, category: 'Đồ uống', inStock: true, orders: 110 },
  ])

  const [orders, setOrders] = useState([
    {
      id: 'DH-8921',
      customer: 'Nguyễn Văn Khách',
      phone: '0901234567',
      items: '2x Cơm Tấm Sườn Bì Chả, 1x Canh Khổ Qua',
      total: 155000,
      time: '5 phút trước',
      status: 'pending', // pending, preparing, ready
      address: 'Phòng 402, Tòa Nhà Bitexco, Q.1',
    },
    {
      id: 'DH-8920',
      customer: 'Lê Minh Tuấn',
      phone: '0918889999',
      items: '1x Cơm Sườn Non Nướng, 1x Trà Tắc Xí Muội',
      total: 90000,
      time: '12 phút trước',
      status: 'preparing',
      address: '123 Nguyễn Thị Minh Khai, Q.3',
    },
    {
      id: 'DH-8919',
      customer: 'Hoàng Mai Lan',
      phone: '0933445566',
      items: '3x Cơm Tấm Sườn Bì Chả',
      total: 195000,
      time: '25 phút trước',
      status: 'ready',
      address: '77 Lê Lợi, Bến Nghé, Q.1',
    },
  ])

  const handleToggleStock = (id) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, inStock: !item.inStock } : item))
    )
  }

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
  }

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div
              className="relative group cursor-pointer flex-shrink-0"
              onClick={() => setAvatarModalOpen(true)}
              title="Bấm để đổi ảnh đại diện quán"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80'}
                alt={user?.fullName || 'Quán ăn'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-amber-400/20 shadow-md group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
                  🍳 Bảng Quản Lý Quán Ăn
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  ● Đang mở cửa nhận đơn
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {user?.restaurantDetails?.restaurantName || user?.fullName || 'Cơm Tấm Ba Ghiền'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Chủ quán: {user?.fullName || user?.email} | SĐT: {user?.phone || '0912345678'}
              </p>
              {user?.restaurantDetails?.restaurantAddress && (
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  {user.restaurantDetails.restaurantAddress}
                </p>
              )}

              {/* Chỉnh ảnh trực tiếp ở trang quản lý */}
              <div className="mt-2.5">
                <button
                  type="button"
                  id="restaurant-edit-avatar-btn"
                  onClick={() => setAvatarModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  📸 Chỉnh sửa ảnh quán
                </button>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Homepage button - requirement: "vẫn có thể xem được homepage chính của trang" */}
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

        {/* Thông tin hồ sơ & Giấy phép kinh doanh đã đăng ký */}
        {user?.restaurantDetails && (user?.restaurantDetails?.businessItems || user?.restaurantDetails?.businessLicense?.fileName) && (
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 bg-amber-200/60 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-amber-700" /> Hồ Sơ Pháp Lý Nhà Hàng Đã Xác Minh
                </span>
                {user.restaurantDetails.ownerCitizenId && (
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-white border border-amber-200 text-slate-700 font-mono font-bold">
                    CCCD Chủ Quán: {user.restaurantDetails.ownerCitizenId}
                  </span>
                )}
              </div>
              {user.restaurantDetails.businessItems && (
                <p className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Mặt hàng kinh doanh:</span> {user.restaurantDetails.businessItems}
                </p>
              )}
            </div>

            {user.restaurantDetails.businessLicense?.fileName && (
              <div className="flex items-center gap-2 flex-shrink-0 bg-white p-2.5 rounded-2xl border border-amber-200">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left text-xs pr-2">
                  <p className="font-bold text-slate-900 max-w-[160px] truncate">
                    {user.restaurantDetails.businessLicense.fileName}
                  </p>
                  <span className="text-[10px] text-slate-400">Giấy phép kinh doanh (PDF)</span>
                </div>
                {user.restaurantDetails.businessLicense.fileData && (
                  <button
                    type="button"
                    onClick={() => {
                      const win = window.open('')
                      if (win) {
                        win.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head><title>Giấy phép KD: ${user.restaurantDetails.businessLicense.fileName}</title></head>
                            <body style="margin:0; height:100vh; overflow:hidden;">
                              <iframe src="${user.restaurantDetails.businessLicense.fileData}" style="width:100%; height:100%; border:none;"></iframe>
                            </body>
                          </html>
                        `)
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mở File PDF
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-primary flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Doanh thu hôm nay</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">3.850.000 đ</p>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> +18.4% so với hôm qua
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Tổng đơn hôm nay</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">48 đơn hàng</p>
              <span className="text-[11px] font-semibold text-blue-600">3 đơn đang chờ duyệt</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Món trong thực đơn</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">24 món ăn</p>
              <span className="text-[11px] font-semibold text-slate-500">22 món đang bật bán</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Star className="w-6 h-6 fill-emerald-500 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Đánh giá quán</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">4.9 / 5.0</p>
              <span className="text-[11px] font-semibold text-emerald-600">Dựa trên 382 lượt đánh giá</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-2 px-4 text-sm font-bold transition-all relative ${
              activeTab === 'orders'
                ? 'text-primary after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đơn Hàng Cần Xử Lý ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`pb-2 px-4 text-sm font-bold transition-all relative ${
              activeTab === 'menu'
                ? 'text-primary after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Quản Lý Thực Đơn ({menuItems.length})
          </button>
        </div>

        {/* Tab 1: Orders Management */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                      {order.id}
                    </span>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {order.time}
                    </span>
                    {order.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Chờ nhận đơn
                      </span>
                    )}
                    {order.status === 'preparing' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        Đang nấu món
                      </span>
                    )}
                    {order.status === 'ready' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Sẵn sàng giao cho shipper
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {order.customer} - <span className="text-slate-500 font-normal">{order.phone}</span>
                    </p>
                    <p className="text-xs text-slate-500">{order.address}</p>
                  </div>

                  <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-900">Món:</span> {order.items}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-end justify-between gap-3 min-w-[200px]">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Tổng tiền đơn</span>
                    <span className="text-xl font-black text-primary">{formatPrice(order.total)}</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {order.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors"
                      >
                        Tiếp nhận & Nấu
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                      >
                        Báo xong món
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đang đợi tài xế đến lấy
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Menu Management */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Danh sách món ăn của quán</h3>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" /> Thêm món mới
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {menuItems.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                    <span className="text-xs text-slate-400">
                      Danh mục: {item.category} | Đã bán: {item.orders} suất
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-sm font-extrabold text-primary">{formatPrice(item.price)}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleStock(item.id)}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                        item.inStock
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {item.inStock ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" /> Đang bán
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-rose-500" /> Tạm hết món
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Đổi Ảnh Đại Diện Quán */}
      <AvatarModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
    </div>
  )
}
