import { useState, useRef, useEffect, useCallback } from 'react'
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
  Info,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import notificationApi from '../../api/notificationApi.js'
import { connectSocket } from '../../services/socket.js'
import { playNotificationSound } from '../../utils/playNotificationSound.js'

// Mẫu thông báo dự phòng khi chưa có dữ liệu từ Database
const DEFAULT_NOTIFICATIONS_BY_ROLE = {
  customer: [
    {
      id: 'cust-1',
      _id: 'cust-1',
      title: 'Đơn hàng đang trên đường giao! 🛵',
      message: 'Tài xế đang giao đơn hàng đến địa chỉ của bạn. Dự kiến 10 phút nữa tới nơi.',
      time: '5 phút trước',
      type: 'order',
      link: '/orders',
      read: false,
      isRead: false,
    },
    {
      id: 'cust-2',
      _id: 'cust-2',
      title: 'Voucher giảm giá 20.000đ 🎉',
      message: 'Nhập mã FREESHIP để được miễn phí vận chuyển cho đơn hàng từ 100.000đ hôm nay.',
      time: '1 giờ trước',
      type: 'promo',
      link: '/',
      read: false,
      isRead: false,
    },
  ],
  restaurant_owner: [
    {
      id: 'rest-1',
      _id: 'rest-1',
      title: 'Đơn hàng mới cần chuẩn bị! 🔔',
      message: 'Khách hàng vừa đặt đơn món ăn. Vui lòng kiểm tra và xác nhận vào bếp.',
      time: 'Vừa xong',
      type: 'order',
      link: '/restaurant/orders',
      read: false,
      isRead: false,
    },
  ],
  shipper: [
    {
      id: 'ship-1',
      _id: 'ship-1',
      title: 'Đơn hàng mới sẵn sàng giao! ⚡',
      message: 'Có đơn hàng đã chuẩn bị xong quanh khu vực của bạn, sẵn sàng nhận cuốc.',
      time: 'Vừa xong',
      type: 'order',
      link: '/shipper',
      read: false,
      isRead: false,
    },
  ],
  admin: [
    {
      id: 'adm-1',
      _id: 'adm-1',
      title: 'Đối tác mới chờ kiểm duyệt 🏪',
      message: 'Có hồ sơ đăng ký đối tác mới đang chờ quản trị viên xác thực.',
      time: '10 phút trước',
      type: 'admin',
      link: '/admin',
      read: false,
      isRead: false,
    },
  ],
}

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Vừa xong'
  const diff = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diff)) return dateStr
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

export default function NotificationBell({ isDark = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  const role = user?.role || 'customer'
  const token = localStorage.getItem('token')

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // 1. Tải danh sách thông báo từ API Backend
  const loadNotifications = useCallback(async () => {
    if (!token) {
      const fallback = DEFAULT_NOTIFICATIONS_BY_ROLE[role] || DEFAULT_NOTIFICATIONS_BY_ROLE.customer
      setNotifications(fallback)
      setUnreadCount(fallback.filter((n) => !n.read && !n.isRead).length)
      return
    }

    try {
      const res = await notificationApi.getNotifications({ limit: 30 })
      const items = res.data?.items || []
      const count = res.data?.unreadCount || 0

      if (items.length > 0) {
        setNotifications(
          items.map((item) => ({
            ...item,
            id: item._id,
            read: item.isRead,
            time: formatTimeAgo(item.createdAt),
          }))
        )
        setUnreadCount(count)
      } else {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch {
      const fallback = DEFAULT_NOTIFICATIONS_BY_ROLE[role] || DEFAULT_NOTIFICATIONS_BY_ROLE.customer
      setNotifications(fallback)
      setUnreadCount(fallback.filter((n) => !n.read && !n.isRead).length)
    }
  }, [role, token])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // 2. Kết nối Socket.io và lắng nghe sự kiện Realtime 'new_notification'
  useEffect(() => {
    if (!token) return

    const socket = connectSocket(token)
    if (!socket) return

    const handleNewNotification = (data) => {
      try {
        playNotificationSound()
      } catch {
        // ignore audio block
      }

      toast(data.title || 'Thông báo mới', {
        icon: '🔔',
        duration: 4000,
      })

      const newNotif = {
        ...data,
        id: data._id || `notif-${Date.now()}`,
        read: false,
        isRead: false,
        time: 'Vừa xong',
      }

      setNotifications((prev) => [newNotif, ...prev.filter((n) => (n._id || n.id) !== newNotif.id)])
      setUnreadCount((prev) => prev + 1)
    }

    socket.on('new_notification', handleNewNotification)

    return () => {
      socket.off('new_notification', handleNewNotification)
    }
  }, [token])

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

  // Đánh dấu 1 thông báo là đã đọc
  const handleMarkAsRead = async (item) => {
    const itemId = item._id || item.id
    setNotifications((prev) =>
      prev.map((n) => ((n._id || n.id) === itemId ? { ...n, read: true, isRead: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    if (token && item._id && !item._id.startsWith('cust-') && !item._id.startsWith('rest-')) {
      try {
        await notificationApi.markAsRead(item._id)
      } catch (err) {
        console.error('Failed to mark read on server:', err)
      }
    }
  }

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })))
    setUnreadCount(0)

    if (token) {
      try {
        await notificationApi.markAllAsRead()
      } catch (err) {
        console.error('Failed to mark all read on server:', err)
      }
    }
  }

  // Xóa 1 thông báo
  const handleDeleteNotification = async (item, e) => {
    e.stopPropagation()
    const itemId = item._id || item.id
    setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== itemId))
    if (!item.read && !item.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    if (token && item._id && !item._id.startsWith('cust-') && !item._id.startsWith('rest-')) {
      try {
        await notificationApi.deleteNotification(item._id)
      } catch (err) {
        console.error('Failed to delete notification:', err)
      }
    }
  }

  // Xóa tất cả thông báo
  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) return
    setNotifications([])
    setUnreadCount(0)

    if (token) {
      try {
        await notificationApi.clearAll()
      } catch (err) {
        console.error('Failed to clear all notifications:', err)
      }
    }
  }

  const handleNotificationClick = (item) => {
    handleMarkAsRead(item)
    setIsOpen(false)
    if (item.link) {
      navigate(item.link)
    }
  }

  const displayedList =
    filter === 'unread'
      ? notifications.filter((n) => !n.read && !n.isRead)
      : notifications

  // Icon type badge
  const renderIcon = (type) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-orange-500" />
      case 'promo':
        return <Sparkles className="w-4 h-4 text-amber-500" />
      case 'shipper':
      case 'delivery':
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
        title="Thông báo Realtime"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform hover:rotate-12 duration-200" />

        {/* Realtime ping dot & unread badge */}
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
          className={`absolute right-0 mt-2.5 w-[360px] sm:w-[420px] rounded-2xl shadow-2xl border transition-all z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Header */}
          <div
            className={`p-3.5 px-4 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-slate-800/80' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight">Thông báo</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Socket.io Realtime Online" />
                </div>
                <span className="text-[11px] text-slate-400 truncate block">
                  {unreadCount > 0
                    ? `Bạn có ${unreadCount} thông báo mới`
                    : 'Không có thông báo chưa đọc'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:underline flex items-center gap-1 ml-1"
                  title="Xóa tất cả thông báo"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa hết</span>
                </button>
              )}
            </div>
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

          {/* List items with customized slim scrollbar (no bulky Windows scrollbar arrows) */}
          <div className="max-h-88 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] dark:[scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 divide-y divide-slate-100 dark:divide-slate-800/40">
            {displayedList.length > 0 ? (
              displayedList.map((item) => (
                <div
                  key={item._id || item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 px-4 flex items-start gap-3 cursor-pointer transition-colors relative group ${
                    !item.read && !item.isRead
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
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p
                        className={`text-xs font-bold leading-snug break-words ${
                          !item.read && !item.isRead
                            ? isDark
                              ? 'text-white'
                              : 'text-slate-900'
                            : isDark
                            ? 'text-slate-400'
                            : 'text-slate-600'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-medium whitespace-nowrap mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {item.time || formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                      {item.message}
                    </p>
                  </div>

                  {/* Action on hover & Unread dot */}
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(item, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {!item.read && !item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
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
            <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Socket.io Realtime · {role.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
