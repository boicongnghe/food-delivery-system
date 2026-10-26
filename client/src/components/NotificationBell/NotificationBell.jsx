import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Store,
  Bike,
  Sparkles,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

// Mẫu thông báo thực tế theo từng vai trò (role)
const DEFAULT_NOTIFICATIONS_BY_ROLE = {
  customer: [
    {
      id: 'cust-1',
      title: 'Đơn hàng đang trên đường giao! 🛵',
      message: 'Tài xế Nguyễn Văn A đang giao đơn hàng #GN-0042 đến địa chỉ của bạn. Dự kiến 10 phút nữa tới nơi.',
      time: '5 phút trước',
      type: 'order',
      link: '/orders',
      read: false,
    },
    {
      id: 'cust-2',
      title: 'Voucher giảm giá 20.000đ 🎉',
      message: 'Nhập mã FREESHIP để được miễn phí vận chuyển cho đơn hàng từ 100.000đ hôm nay.',
      time: '1 giờ trước',
      type: 'promo',
      link: '/',
      read: false,
    },
    {
      id: 'cust-3',
      title: 'Đặt hàng thành công ✅',
      message: 'Đơn hàng #GN-0038 của bạn tại Quán Ăn Ngon đã được bếp xác nhận và chuẩn bị.',
      time: 'Hôm qua',
      type: 'order',
      link: '/orders',
      read: true,
    },
  ],
  restaurant_owner: [
    {
      id: 'rest-1',
      title: 'Đơn hàng mới cần chuẩn bị! 🔔',
      message: 'Khách hàng vừa đặt đơn #GN-0045 (2x Phở bò tái, 1x Quẩy giòn). Vui lòng xác nhận vào bếp.',
      time: 'Vừa xong',
      type: 'order',
      link: '/restaurant/orders',
      read: false,
    },
    {
      id: 'rest-2',
      title: 'Tài xế đã nhận đơn 🛵',
      message: 'Tài xế Lê Văn B đang tới quán để lấy đơn hàng #GN-0042.',
      time: '15 phút trước',
      type: 'shipper',
      link: '/restaurant/orders',
      read: false,
    },
    {
      id: 'rest-3',
      title: 'Đánh giá 5 sao từ khách hàng ⭐',
      message: 'Khách hàng Đạt Nguyễn đã để lại đánh giá 5 sao: "Món ăn nóng hổi, rất ngon và đóng gói cẩn thận!".',
      time: '2 giờ trước',
      type: 'review',
      link: '/restaurant/profile',
      read: true,
    },
  ],
  shipper: [
    {
      id: 'ship-1',
      title: 'Đơn hàng mới sẵn sàng giao! ⚡',
      message: 'Quán Ăn Ngon Phố Cổ (cách bạn 600m) có đơn #GN-0048 đã làm xong, cần tài xế nhận giao.',
      time: 'Vừa xong',
      type: 'order',
      link: '/shipper',
      read: false,
    },
    {
      id: 'ship-2',
      title: 'Tiền công đã cộng vào ví 💰',
      message: 'Bạn đã hoàn thành giao đơn #GN-0041. +25.000đ đã được cộng vào số dư thu nhập.',
      time: '35 phút trước',
      type: 'finance',
      link: '/shipper',
      read: false,
    },
    {
      id: 'ship-3',
      title: 'Thưởng cao điểm trưa nay 🔥',
      message: 'Thưởng thêm 5.000đ cho mỗi đơn hoàn thành trong khung giờ 11:30 - 13:00 hôm nay.',
      time: '2 giờ trước',
      type: 'promo',
      link: '/shipper',
      read: true,
    },
  ],
  admin: [
    {
      id: 'adm-1',
      title: 'Quán ăn mới đăng ký chờ duyệt 🏪',
      message: 'Quán "Bún Bò Huế Cố Đô" vừa nộp hồ sơ đăng ký kinh doanh và đang chờ Admin phê duyệt.',
      time: '10 phút trước',
      type: 'admin',
      link: '/admin',
      read: false,
    },
    {
      id: 'adm-2',
      title: 'Hồ sơ tài xế mới nộp 🪪',
      message: 'Tài xế Trần Văn C vừa tải lên giấy phép lái xe và CCCD. Vui lòng xác thực tài khoản.',
      time: '45 phút trước',
      type: 'admin',
      link: '/admin',
      read: false,
    },
    {
      id: 'adm-3',
      title: 'Báo cáo doanh thu tuần 📊',
      message: 'Doanh thu sàn đạt mốc 125.000.000đ trong tuần này, tăng 14.5% so với tuần trước.',
      time: '3 giờ trước',
      type: 'finance',
      link: '/admin',
      read: true,
    },
  ],
}

export default function NotificationBell({ isDark = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  const role = user?.role || 'customer'
  const storageKey = `notifications_${user?._id || role}`

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return DEFAULT_NOTIFICATIONS_BY_ROLE[role] || DEFAULT_NOTIFICATIONS_BY_ROLE.customer
  })

  // Sync back to storage on update
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications))
    } catch {
      // ignore
    }
  }, [notifications, storageKey])

  // Reload role-specific default if user role changes
  useEffect(() => {
    const list = DEFAULT_NOTIFICATIONS_BY_ROLE[role] || DEFAULT_NOTIFICATIONS_BY_ROLE.customer
    try {
      const saved = localStorage.getItem(storageKey)
      setNotifications(saved ? JSON.parse(saved) : list)
    } catch {
      setNotifications(list)
    }
  }, [role, storageKey])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (item) => {
    handleMarkAsRead(item.id)
    setIsOpen(false)
    if (item.link) {
      navigate(item.link)
    }
  }

  const displayedList =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  // Icon type badge
  const renderIcon = (type) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-orange-500" />
      case 'promo':
        return <Sparkles className="w-4 h-4 text-amber-500" />
      case 'shipper':
        return <Bike className="w-4 h-4 text-emerald-500" />
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-purple-500" />
      case 'review':
      case 'finance':
        return <Store className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-slate-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        id="navbar-notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-full transition-all flex items-center justify-center focus:outline-none ${
          isDark
            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200'
        }`}
        title="Thông báo"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform hover:rotate-12 duration-200" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="absolute -inset-0.5 rounded-full bg-red-400 opacity-75 animate-ping -z-10" />
          </span>
        )}
      </button>

      {/* Popover Danh Sách Thông Báo */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2.5 w-84 sm:w-96 rounded-2xl shadow-2xl border transition-all z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-100'
              : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          {/* Header */}
          <div
            className={`p-3.5 px-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800/80' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Thông báo</h3>
                <span className="text-[11px] text-slate-400">
                  {unreadCount > 0
                    ? `Bạn có ${unreadCount} thông báo mới`
                    : 'Không có thông báo chưa đọc'}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Filter tabs: Tất cả / Chưa đọc */}
          <div
            className={`px-3 py-1.5 border-b flex items-center gap-2 text-xs font-semibold ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filter === 'all'
                  ? isDark
                    ? 'bg-purple-600/30 text-purple-300 font-bold'
                    : 'bg-white text-primary shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                filter === 'unread'
                  ? isDark
                    ? 'bg-purple-600/30 text-purple-300 font-bold'
                    : 'bg-white text-primary shadow-xs font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* List items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100/10">
            {displayedList.length > 0 ? (
              displayedList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 px-4 flex items-start gap-3 cursor-pointer transition-colors relative group ${
                    !item.read
                      ? isDark
                        ? 'bg-purple-950/25 hover:bg-purple-950/40'
                        : 'bg-orange-50/50 hover:bg-orange-50'
                      : isDark
                      ? 'hover:bg-slate-900/80'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'
                    }`}
                  >
                    {renderIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs font-bold truncate ${
                          !item.read
                            ? isDark
                              ? 'text-white'
                              : 'text-slate-900'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Dot unread */}
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 self-center" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Không có thông báo nào!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`p-2.5 px-4 border-t text-center ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50/50'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-400">
              🔔 Thông báo tự động theo vai trò: {role}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
