import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Lock, MapPin, Navigation, Package, Phone, Power, RefreshCw, ShieldAlert, WifiOff, X } from 'lucide-react'
import deliveryIssueApi from '../../../api/deliveryIssueApi.js'
import orderApi from '../../../api/orderApi.js'
import uploadApi from '../../../api/uploadApi.js'
import OrderChat from '../../../components/OrderChat/OrderChat.jsx'
import useAuth from '../../../hooks/useAuth.js'
import { connectSocket } from '../../../services/socket.js'

const ISSUE_TYPES = [
  ['customer_unreachable', 'Không liên lạc được với khách'],
  ['wrong_address', 'Sai địa chỉ'],
  ['customer_refused', 'Khách từ chối nhận đơn'],
  ['restaurant_delay', 'Nhà hàng chậm chuẩn bị đơn'],
  ['accident', 'Sự cố phương tiện / tai nạn'],
  ['damaged_items', 'Hàng hóa bị hư hỏng'],
  ['other', 'Sự cố khác'],
]
const AVAILABLE_ORDERS_PAGE_SIZE = 50
const EMPTY_PAGINATION = { page: 1, limit: AVAILABLE_ORDERS_PAGE_SIZE, totalItems: 0, totalPages: 0 }

// Identify error categories from HTTP response
const ERROR_CATEGORY = {
  OFFLINE: 'offline',          // 409 "Hãy chuyển trạng thái sang Đang trực"
  NOT_APPROVED: 'not_approved',// 403 from requireApprovedShipper
  OTHER: 'other',
}

const formatMoney = amount => `${Number(amount || 0).toLocaleString('vi-VN')}đ`
const formatAddress = order =>
  order.delivery?.address || order.deliveryAddress?.addressLine || 'Chưa có địa chỉ giao hàng'
const recipientPhone = order => order.delivery?.phone || order.deliveryAddress?.phone || ''
const getMapDirectionsUrl = location => {
  const lat = Number(location?.lat)
  const lng = Number(location?.lng)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return ''
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
const hasWaitingRequirement = type => ['customer_unreachable', 'customer_refused'].includes(type)
const POOL_STATUS_LABELS = {
  confirmed: 'Quán đã nhận · chờ bạn để nấu',
  preparing: 'Bếp đang nấu',
  ready_for_pickup: 'Sẵn sàng lấy hàng',
}
const AT_RESTAURANT_STATUSES = ['preparing', 'ready_for_pickup']
const formatTime = value => (value
  ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  : '')

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể thực hiện thao tác.'
}

function categorizeError(error) {
  const status = error?.response?.status
  const message = error?.response?.data?.message || ''
  if (status === 403 || message.includes('chưa được duyệt') || message.includes('bị đình chỉ') || message.includes('chưa có hồ sơ')) {
    return ERROR_CATEGORY.NOT_APPROVED
  }
  if (status === 409 && (message.includes('Đang trực') || message.includes('trực tuyến') || message.includes('online'))) {
    return ERROR_CATEGORY.OFFLINE
  }
  return ERROR_CATEGORY.OTHER
}

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-md border border-brand-soft bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50'
const fieldLabelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-700'
const fieldInputClass =
  'mt-1 w-full rounded-md border border-transparent bg-brand-light px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-800 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15'
const statusBadgeClass = tone => `shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
  tone === 'transit' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'
}`
const stepClass = state => `flex-1 rounded-md px-2 py-1.5 text-center text-xs font-semibold ${
  state === 'complete'
    ? 'bg-emerald-50 text-emerald-700'
    : state === 'current'
      ? 'bg-brand text-white'
      : 'bg-slate-100 text-slate-500'
}`

// --- Status banner shown when shipper can't see orders ---
function StatusBanner({ category, errorMessage }) {
  if (category === ERROR_CATEGORY.OFFLINE) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700" role="alert">
        <WifiOff size={22} className="mt-0.5 shrink-0" />
        <div className="text-sm">
          <strong className="block text-slate-900">Bạn đang ở trạng thái Ngoại tuyến</strong>
          <p>Hãy bật công tắc <strong>Nhận đơn</strong> ở thanh phía trên để bắt đầu nhận đơn.</p>
        </div>
      </div>
    )
  }
  if (category === ERROR_CATEGORY.NOT_APPROVED) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900" role="alert">
        <ShieldAlert size={22} className="mt-0.5 shrink-0" />
        <div className="text-sm">
          <strong className="block">Tài khoản chưa đủ điều kiện nhận đơn</strong>
          <p>{errorMessage || 'Hồ sơ tài xế chưa được Admin duyệt hoặc đang bị tạm đình chỉ. Vui lòng liên hệ quản trị viên.'}</p>
        </div>
      </div>
    )
  }
  return null
}

function SectionHeading({ title, description, count }) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-brand-soft/60 px-5 py-4">
      <div>
        <h2 className="font-serif text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {count !== undefined && (
        <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-sm font-bold text-brand">{count}</span>
      )}
    </header>
  )
}

function ItemChecklist({ title, items }) {
  return (
    <div className="rounded-lg bg-brand-light/60 px-4 py-3 text-sm">
      <strong className="text-slate-900">{title}</strong>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-700">
        {(items || []).map((item, index) => (
          <li key={item._id || `${item.name}-${index}`}>{item.name} × {item.quantity}</li>
        ))}
      </ul>
    </div>
  )
}

function DeliveryOrders({ onOrderChanged }) {
  const { user, token } = useAuth()
  const [availableOrders, setAvailableOrders] = useState([])
  const [availablePagination, setAvailablePagination] = useState(EMPTY_PAGINATION)
  const [availablePage, setAvailablePage] = useState(1)
  const [activeOrders, setActiveOrders] = useState([])
  const [selectedDetails, setSelectedDetails] = useState('')
  const [acceptConfirmId, setAcceptConfirmId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [errorCategory, setErrorCategory] = useState(ERROR_CATEGORY.OTHER)
  const [actionError, setActionError] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
  const [deliveryProofOrderId, setDeliveryProofOrderId] = useState('')
  const [deliveryProofFile, setDeliveryProofFile] = useState(null)
  const [deliveryProofPreview, setDeliveryProofPreview] = useState('')
  const [issueOrder, setIssueOrder] = useState(null)
  const [issueType, setIssueType] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [issueFiles, setIssueFiles] = useState([])
  const [issueBusy, setIssueBusy] = useState(false)
  const [callCounts, setCallCounts] = useState({})
  const [now, setNow] = useState(0)

  const refreshOrders = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    setErrorCategory(ERROR_CATEGORY.OTHER)

    const activeResult = await Promise.allSettled([orderApi.getShipperActiveOrders()])
    if (activeResult[0].status === 'fulfilled') {
      setActiveOrders(activeResult[0].value.data || [])
    } else {
      setError(getErrorMessage(activeResult[0].reason))
    }

    const availableResult = await Promise.allSettled([
      orderApi.getAvailableForPickup({ page: availablePage, limit: AVAILABLE_ORDERS_PAGE_SIZE }),
    ])
    if (availableResult[0].status === 'fulfilled') {
      const result = availableResult[0].value.data
      const pagination = result?.pagination || EMPTY_PAGINATION
      setAvailableOrders(result?.items || [])
      setAvailablePagination(pagination)
      const lastPage = Math.max(1, pagination.totalPages)
      if (availablePage > lastPage) setAvailablePage(lastPage)
    } else {
      const err = availableResult[0].reason
      setAvailableOrders([])
      setAvailablePagination(EMPTY_PAGINATION)
      const cat = categorizeError(err)
      setErrorCategory(cat)
      // Only set error text for non-status-banner errors
      if (cat === ERROR_CATEGORY.OTHER) {
        setError(getErrorMessage(err))
      } else {
        setError(getErrorMessage(err))
      }
    }
    setLoading(false)
    setRefreshing(false)
  }, [availablePage])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => refreshOrders(), 0)
    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshOrders(true)
    }, 60 * 1000)
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
    }
  }, [refreshOrders])

  useEffect(() => {
    if (!token) return undefined

    const socket = connectSocket(token)
    if (!socket) return undefined

    const refreshIfVisible = () => {
      if (!document.hidden) refreshOrders(true)
    }
    const handleOrderNotification = notification => {
      if (notification?.orderId) refreshIfVisible()
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshOrders(true)
    }

    const handleOrderHeld = payload => {
      if (!payload?.orderId) return
      setAvailableOrders(orders => orders.map(order => {
        if (order._id !== payload.orderId) return order
        const isMe = user?._id && String(payload.holderId) === String(user._id)
        return {
          ...order,
          holdExpiresAt: payload.heldUntil,
          isHeldByMe: isMe,
          isHeldByOther: !isMe,
        }
      }))
    }

    const handleOrderReleased = payload => {
      if (!payload?.orderId) return
      setAvailableOrders(orders => orders.map(order => {
        if (order._id !== payload.orderId) return order
        return {
          ...order,
          holdExpiresAt: null,
          isHeldByMe: false,
          isHeldByOther: false,
        }
      }))
    }

    socket.on('connect', refreshIfVisible)
    socket.on('new_pickup_order', refreshIfVisible)
    socket.on('order_taken', refreshIfVisible)
    socket.on('new_notification', handleOrderNotification)
    socket.on('order_held', handleOrderHeld)
    socket.on('order_released', handleOrderReleased)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      socket.off('connect', refreshIfVisible)
      socket.off('new_pickup_order', refreshIfVisible)
      socket.off('order_taken', refreshIfVisible)
      socket.off('new_notification', handleOrderNotification)
      socket.off('order_held', handleOrderHeld)
      socket.off('order_released', handleOrderReleased)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [token, user?._id, refreshOrders])

  // While the kitchen cooks the shipper's order, check often so "Xác nhận đã lấy" unlocks soon after it is ready
  const hasCookingOrder = activeOrders.some(order => order.status === 'preparing')
  useEffect(() => {
    if (!hasCookingOrder) return undefined
    const cookingTimer = window.setInterval(() => refreshOrders(true), 15 * 1000)
    return () => window.clearInterval(cookingTimer)
  }, [hasCookingOrder, refreshOrders])

  const runOrderAction = async (orderId, action) => {
    setBusyOrderId(orderId)
    setActionError('')
    try {
      await action()
      onOrderChanged?.()
      await refreshOrders(true)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
      if (requestError.response?.status === 409) {
        await refreshOrders(true)
      }
    } finally {
      setBusyOrderId('')
    }
  }

  const handleDeliveryProofFile = event => {
    const [file] = event.target.files || []
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setActionError('Ảnh chứng minh phải có định dạng JPG, PNG hoặc WEBP.')
      setDeliveryProofFile(null)
      setDeliveryProofPreview('')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionError('Ảnh chứng minh không được vượt quá 5 MB.')
      setDeliveryProofFile(null)
      setDeliveryProofPreview('')
      event.target.value = ''
      return
    }
    setActionError('')
    setDeliveryProofFile(file)
    const reader = new FileReader()
    reader.onload = () => setDeliveryProofPreview(String(reader.result || ''))
    reader.onerror = () => {
      setDeliveryProofFile(null)
      setDeliveryProofPreview('')
      setActionError('Không thể đọc ảnh đã chọn. Vui lòng chọn ảnh khác.')
    }
    reader.readAsDataURL(file)
  }

  const submitDeliveryProof = async event => {
    event.preventDefault()
    if (!deliveryProofOrderId || !deliveryProofFile) {
      setActionError('Vui lòng chụp hoặc chọn ảnh chứng minh giao hàng.')
      return
    }

    setBusyOrderId(deliveryProofOrderId)
    setActionError('')
    try {
      const upload = await uploadApi.uploadImage(deliveryProofFile, 'delivery-proofs')
      await orderApi.confirmDeliveryDelivered(deliveryProofOrderId, {
        deliveryProofUrl: upload.data.url,
      })
      setDeliveryProofOrderId('')
      setDeliveryProofFile(null)
      setDeliveryProofPreview('')
      onOrderChanged?.()
      await refreshOrders(true)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyOrderId('')
    }
  }

  const handleReleaseHold = async (orderId) => {
    try {
      await orderApi.releaseOrderHold(orderId)
      setAvailableOrders(orders => orders.map(order =>
        order._id === orderId
          ? { ...order, holdExpiresAt: null, isHeldByMe: false, isHeldByOther: false }
          : order
      ))
    } catch {
      // ignore
    } finally {
      setSelectedDetails('')
      setAcceptConfirmId('')
    }
  }

  const handleShowDetails = async orderId => {
    if (selectedDetails === orderId) {
      await handleReleaseHold(orderId)
      return
    }
    setAcceptConfirmId('')
    setBusyOrderId(orderId)
    setActionError('')
    try {
      const response = await orderApi.getAvailableOrderDetail(orderId)
      const data = response.data
      setSelectedDetails(orderId)
      setAvailableOrders(orders => orders.map(order =>
        order._id === orderId
          ? {
              ...order,
              detail: data,
              isHeldByMe: true,
              isHeldByOther: false,
              holdExpiresAt: data?.holdExpiresAt,
            }
          : order,
      ))
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyOrderId('')
    }
  }

  // Model 2: If hold timer expires while user is viewing details, automatically close and notify
  useEffect(() => {
    if (!selectedDetails) return
    const currentOrder = availableOrders.find(o => o._id === selectedDetails)
    if (!currentOrder?.holdExpiresAt) return

    const diff = new Date(currentOrder.holdExpiresAt).getTime() - (now || Date.now())
    if (diff <= 0) {
      setSelectedDetails('')
      setAcceptConfirmId('')
      setActionError('Đã hết thời gian 20s giữ chỗ xem đơn. Đơn đã được mở lại cho các tài xế khác.')
    }
  }, [now, selectedDetails, availableOrders])

  const startIssueReport = order => {
    setIssueOrder(order)
    setIssueType('')
    setIssueDescription('')
    setIssueFiles([])
    setActionError('')
    setCallCounts(current => ({
      ...current,
      [order._id]: order.unansweredCallsAt?.length || 0,
    }))
  }

  const startWaiting = async order => {
    setBusyOrderId(order._id)
    setActionError('')
    try {
      const result = await orderApi.startCustomerWait(order._id)
      setActiveOrders(orders => orders.map(item =>
        item._id === order._id
          ? { ...item, customerWaitStartedAt: result.data.startedAt }
          : item,
      ))
      if (issueOrder?._id === order._id) {
        setIssueOrder(current => ({ ...current, customerWaitStartedAt: result.data.startedAt }))
      }
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyOrderId('')
    }
  }

  const logUnansweredCall = async order => {
    setBusyOrderId(order._id)
    setActionError('')
    try {
      const result = await orderApi.recordUnansweredCall(order._id)
      setCallCounts(current => ({ ...current, [order._id]: result.data.unansweredCalls }))
      setActiveOrders(orders => orders.map(item =>
        item._id === order._id
          ? { ...item, unansweredCallsAt: [...(item.unansweredCallsAt || []), new Date().toISOString()] }
          : item,
      ))
      setIssueOrder(current => current?._id === order._id
        ? { ...current, unansweredCallsAt: [...(current.unansweredCallsAt || []), new Date().toISOString()] }
        : current)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyOrderId('')
    }
  }

  const issueWaitMinutes = useMemo(() => {
    if (!issueOrder?.customerWaitStartedAt) return 0
    return Math.max(0, Math.floor((now - new Date(issueOrder.customerWaitStartedAt).getTime()) / 60000))
  }, [issueOrder, now])
  const issueWaitRemaining = issueOrder?.customerWaitStartedAt
    ? Math.max(0, 8 * 60 - (now
      ? Math.floor((now - new Date(issueOrder.customerWaitStartedAt).getTime()) / 1000)
      : 0))
    : 8 * 60

  const submitIssue = async event => {
    event.preventDefault()
    if (!issueOrder || !issueType) return
    if (hasWaitingRequirement(issueType)
      && (issueWaitMinutes < 8 || (callCounts[issueOrder._id] || 0) < 2)) {
      setActionError('Cần chờ đủ 8 phút và ghi nhận ít nhất 2 cuộc gọi không được trả lời.')
      return
    }
    setIssueBusy(true)
    setActionError('')
    try {
      const uploaded = await Promise.all(issueFiles.map(file =>
        uploadApi.uploadImage(file, 'delivery-issues'),
      ))
      await deliveryIssueApi.createDeliveryIssue(issueOrder._id, {
        type: issueType,
        description: issueDescription.trim(),
        images: uploaded.map(response => response.data.url),
      })
      onOrderChanged?.()
      setIssueOrder(null)
      await refreshOrders(true)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setIssueBusy(false)
    }
  }

  const handleIssueFiles = event => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => ['image/jpeg', 'image/png'].includes(file.type))
    if (validFiles.length !== files.length) {
      setActionError('Chỉ chấp nhận ảnh JPG hoặc PNG.')
    }
    if (validFiles.length > 3) {
      setActionError('Chỉ được tải tối đa 3 ảnh minh chứng.')
    }
    setIssueFiles(validFiles.slice(0, 3))
  }

  // Determine if the error prevents showing orders (offline / not approved)
  const isStatusError = errorCategory === ERROR_CATEGORY.OFFLINE || errorCategory === ERROR_CATEGORY.NOT_APPROVED

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Quản lý đơn giao hàng</h1>
          <p className="mt-1 text-sm text-slate-600">Nhận đơn nhà hàng đã xác nhận; bếp sẽ bắt đầu chuẩn bị sau khi có tài xế.</p>
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => refreshOrders(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Cập nhật
        </button>
      </div>

      {/* Status banners: offline / not approved */}
      {!loading && isStatusError && (
        <StatusBanner category={errorCategory} errorMessage={error} />
      )}

      {/* General error (network or unexpected) */}
      {!loading && error && !isStatusError && (
        <div className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{error}</div>
      )}

      {actionError && <div className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{actionError}</div>}
      {loading && (
        <div className="flex justify-center py-16" role="status" aria-label="Đang tải đơn giao hàng">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── ACTIVE ORDERS ── */}
          <section className="overflow-hidden rounded-xl border border-brand-soft/70 bg-white">
            <SectionHeading
              title="Đơn đang thực hiện"
              description="Tiếp tục theo từng bước sau khi đã nhận đơn"
              count={activeOrders.length}
            />
            {activeOrders.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">Bạn chưa có đơn giao đang hoạt động.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeOrders.map(order => {
                  const acceptedAt = new Date(order.shipperAcceptedAt || 0).getTime()
                  const isAtRestaurant = AT_RESTAURANT_STATUSES.includes(order.status)
                  const isCooking = order.status === 'preparing'
                  const cancelAvailable = isAtRestaurant
                    && (!now || now - acceptedAt <= 3 * 60 * 1000)
                  const waitMinutes = order.customerWaitStartedAt
                    ? Math.max(0, Math.floor((now - new Date(order.customerWaitStartedAt).getTime()) / 60000))
                    : 0
                  const loggedCalls = Math.max(
                    order.unansweredCallsAt?.length || 0,
                    callCounts[order._id] || 0,
                  )

                  return (
                    <article className="space-y-4 p-5" key={order._id}>
                      <div className="flex items-center justify-between gap-3">
                        <strong className="font-mono text-base text-slate-900">{order.orderCode}</strong>
                        <span className={statusBadgeClass(order.status === 'delivering' ? 'transit' : 'ready')}>
                          {order.status === 'delivering'
                            ? 'Bước 2 · Đang giao'
                            : isCooking
                              ? 'Bước 1 · Bếp đang nấu'
                              : 'Bước 1 · Chờ lấy hàng'}
                        </span>
                      </div>
                      <div className="flex gap-2" aria-label="Tiến độ giao hàng">
                        <span className={stepClass('complete')}>1. Nhận đơn</span>
                        <span className={stepClass(order.status === 'delivering' ? 'complete' : 'current')}>2. Lấy hàng</span>
                        <span className={stepClass(order.status === 'delivering' ? 'current' : '')}>3. Giao khách</span>
                      </div>
                      {isAtRestaurant ? (
                        <section className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-brand">Bước 2 · Lấy hàng tại nhà hàng</h3>
                          <div>
                            <h3 className="font-semibold text-slate-900">Nhận tại: {order.restaurant?.name}</h3>
                            <p className="text-sm text-slate-600">{order.restaurant?.address}</p>
                            {getMapDirectionsUrl(order.restaurant?.location) && (
                              <a
                                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                                href={getMapDirectionsUrl(order.restaurant.location)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Navigation size={14} /> Chỉ đường đến nhà hàng
                              </a>
                            )}
                            {order.restaurant?.phone && (
                              <a className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline" href={`tel:${order.restaurant.phone}`}>
                                <Phone size={14} /> Gọi nhà hàng: {order.restaurant.phone}
                              </a>
                            )}
                          </div>
                          <ItemChecklist title="Kiểm tra món trước khi rời quán" items={order.items} />
                          <p className="text-xs text-slate-500">
                            {isCooking
                              ? `Quán đang nấu${order.kitchenDueAt ? `, dự kiến xong lúc ${formatTime(order.kitchenDueAt)}` : ''}. Hãy đến quán; nút xác nhận mở khi quán báo xong món.`
                              : 'Chỉ xác nhận sau khi đã nhận và kiểm tra đủ món.'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {cancelAvailable && (
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                disabled={busyOrderId === order._id || isCooking}
                                onClick={() => runOrderAction(order._id, () =>
                                  orderApi.cancelDeliveryAcceptance(order._id),
                                )}
                              >
                                Hủy nhận đơn trong 3 phút
                              </button>
                            )}
                            <button
                              type="button"
                              className={`${primaryButtonClass} flex-1`}
                              disabled={busyOrderId === order._id || order.status !== 'ready_for_pickup'}
                              onClick={() => runOrderAction(order._id, () =>
                                orderApi.confirmDeliveryPickup(order._id),
                              )}
                            >
                              {busyOrderId === order._id
                                ? 'Đang xác nhận…'
                                : isCooking
                                  ? 'Chờ quán nấu xong'
                                  : 'Bước tiếp theo: Xác nhận đã lấy'}
                            </button>
                          </div>
                        </section>
                      ) : (
                        <section className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-brand">Bước 3 · Giao hàng cho khách</h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <h3 className="font-semibold text-slate-900">Địa chỉ nhận hàng: {order.delivery?.recipientName || order.customer?.fullName}</h3>
                              <p className="text-sm text-slate-600">{formatAddress(order)}</p>
                              {getMapDirectionsUrl(order.delivery?.location || order.deliveryAddress?.location) && (
                                <a
                                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                                  href={getMapDirectionsUrl(order.delivery?.location || order.deliveryAddress?.location)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Navigation size={14} /> Chỉ đường đến khách
                                </a>
                              )}
                              {Number.isFinite(Number(order.distanceKm)) && Number(order.distanceKm) > 0 && (
                                <p className="mt-2 text-xs text-slate-500">Quãng đường tính phí: {order.distanceKm} km</p>
                              )}
                              {recipientPhone(order) && (
                                <a className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline" href={`tel:${recipientPhone(order)}`}>
                                  <Phone size={14} /> Gọi khách: {recipientPhone(order)}
                                </a>
                              )}
                              {(order.delivery?.note || order.deliveryAddress?.note || order.customerNote) && (
                                <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                  Ghi chú: {order.delivery?.note || order.deliveryAddress?.note || order.customerNote}
                                </p>
                              )}
                            </div>
                            <ItemChecklist title="Đơn cần giao" items={order.items} />
                          </div>
                          <p className="text-xs text-slate-500">Khi giao xong cho khách, xác nhận để hoàn tất đơn và ghi nhận thu nhập {formatMoney(order.shippingFee)}.</p>
                          <button
                            type="button"
                            className={`${primaryButtonClass} w-full`}
                            disabled={busyOrderId === order._id}
                            onClick={() => {
                              setDeliveryProofOrderId(order._id)
                              setDeliveryProofFile(null)
                              setDeliveryProofPreview('')
                              setActionError('')
                            }}
                          >
                            Chụp ảnh và xác nhận đã giao
                          </button>
                          {deliveryProofOrderId === order._id && (
                            <form
                              className="space-y-3 rounded-lg border border-brand-soft bg-brand-light/40 p-4"
                              onSubmit={submitDeliveryProof}
                            >
                              <label className={fieldLabelClass} htmlFor={`delivery-proof-${order._id}`}>
                                Ảnh chứng minh đã giao *
                              </label>
                              <p className="text-xs text-slate-600">
                                Chụp ảnh món hàng tại điểm giao hoặc khách đã nhận. JPG, PNG, WEBP, tối đa 5 MB.
                              </p>
                              <input
                                id={`delivery-proof-${order._id}`}
                                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-brand"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                required
                                onChange={handleDeliveryProofFile}
                              />
                              {deliveryProofPreview && (
                                <img
                                  className="max-h-64 w-full rounded-lg object-contain"
                                  src={deliveryProofPreview}
                                  alt="Ảnh xem trước chứng minh giao hàng"
                                />
                              )}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  className={primaryButtonClass}
                                  disabled={busyOrderId === order._id || !deliveryProofFile}
                                >
                                  <Camera size={16} />
                                  {busyOrderId === order._id ? 'Đang tải ảnh và hoàn tất…' : 'Tải ảnh và hoàn tất đơn'}
                                </button>
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                  disabled={busyOrderId === order._id}
                                  onClick={() => {
                                    setDeliveryProofOrderId('')
                                    setDeliveryProofFile(null)
                                    setDeliveryProofPreview('')
                                    setActionError('')
                                  }}
                                >
                                  Hủy
                                </button>
                              </div>
                            </form>
                          )}
                        </section>
                      )}
                      <OrderChat
                        orderId={order._id}
                        status={order.status}
                        otherPartyLabel={order.customer?.fullName || 'khách hàng'}
                      />
                      {order.deliveryIssueFlagged && (
                        <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <ShieldAlert size={14} /> Đơn đang được Admin xem xét sự cố.
                        </p>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-sm font-semibold text-red-700 hover:underline"
                          onClick={() => {
                            if (issueOrder?._id === order._id) {
                              setIssueOrder(null)
                            } else {
                              startIssueReport(order)
                            }
                          }}
                        >
                          {issueOrder?._id === order._id ? 'Đóng báo cáo sự cố' : 'Bước riêng · Báo cáo sự cố'}
                        </button>
                      </div>
                      {issueOrder?._id === order._id && (
                        <form className="space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-4" onSubmit={submitIssue}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">Bước riêng · Hỗ trợ sự cố</span>
                              <h3 className="font-serif text-lg font-semibold text-slate-900">Báo cáo sự cố đơn {order.orderCode}</h3>
                            </div>
                            <button
                              type="button"
                              className="rounded p-1 text-slate-500 hover:bg-white"
                              onClick={() => setIssueOrder(null)}
                              aria-label="Đóng báo cáo"
                            >
                              <X size={18} />
                            </button>
                          </div>
                          <label className={fieldLabelClass}>
                            Loại sự cố *
                            <select
                              className={fieldInputClass}
                              value={issueType}
                              onChange={event => setIssueType(event.target.value)}
                              required
                            >
                              <option value="">Chọn loại sự cố</option>
                              {ISSUE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </label>
                          {hasWaitingRequirement(issueType) && (
                            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                              <strong>Quy trình xác minh khách không phản hồi</strong>
                              <p>Hệ thống yêu cầu chờ đủ 8 phút và ghi nhận ít nhất 2 cuộc gọi không được trả lời.</p>
                              {!issueOrder.customerWaitStartedAt ? (
                                <button
                                  type="button"
                                  className={secondaryButtonClass}
                                  disabled={busyOrderId === order._id}
                                  onClick={() => startWaiting(order)}
                                >
                                  Bắt đầu bộ đếm 8 phút
                                </button>
                              ) : (
                                <>
                                  <p className="font-semibold tabular-nums">Đã chờ {waitMinutes} phút · còn {Math.floor(issueWaitRemaining / 60)}:{String(issueWaitRemaining % 60).padStart(2, '0')} · {loggedCalls}/2 cuộc gọi đã ghi nhận</p>
                                  <button
                                    type="button"
                                    className={secondaryButtonClass}
                                    disabled={busyOrderId === order._id || !order.customerWaitStartedAt}
                                    onClick={() => logUnansweredCall(order)}
                                  >
                                    Ghi nhận cuộc gọi không được trả lời
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          <label className={fieldLabelClass}>
                            Mô tả thêm (không bắt buộc)
                            <textarea
                              className={fieldInputClass}
                              value={issueDescription}
                              maxLength={1000}
                              rows={3}
                              onChange={event => setIssueDescription(event.target.value)}
                              placeholder="Mô tả ngắn gọn tình huống xảy ra…"
                            />
                          </label>
                          <label className={fieldLabelClass}>
                            <span className="inline-flex items-center gap-1.5"><Camera size={15} /> Ảnh minh chứng (JPG/PNG, tối đa 3 ảnh)</span>
                            <input
                              className="mt-1 block w-full text-sm font-normal normal-case tracking-normal text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:bg-brand-soft"
                              type="file"
                              accept="image/jpeg,image/png"
                              multiple
                              onChange={handleIssueFiles}
                            />
                            {issueFiles.length > 0 && <small className="mt-1 block font-normal normal-case tracking-normal text-slate-500">{issueFiles.length} ảnh đã chọn</small>}
                          </label>
                          <button
                            type="submit"
                            className={`${primaryButtonClass} w-full`}
                            disabled={issueBusy || !issueType || (hasWaitingRequirement(issueType)
                              && (issueWaitMinutes < 8 || loggedCalls < 2))}
                          >
                            {issueBusy ? 'Đang gửi báo cáo…' : 'Gửi báo cáo sự cố'}
                          </button>
                        </form>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── AVAILABLE ORDERS ── show even when offline so the section heading is visible */}
          <section className="overflow-hidden rounded-xl border border-brand-soft/70 bg-white">
            <SectionHeading
              title="Đơn có thể nhận"
              description="Bước 1 · Chọn đơn quán đã nhận. Bếp bắt đầu nấu ngay khi bạn nhận đơn"
              count={isStatusError ? undefined : availablePagination.totalItems}
            />

            {/* When offline / not approved, don't attempt to show the empty list */}
            {isStatusError ? (
              <div className="flex items-center justify-center gap-2 px-5 py-10 text-center text-sm text-slate-500">
                {errorCategory === ERROR_CATEGORY.OFFLINE
                  ? <><Power size={16} className="text-brand" /> Bật trạng thái Nhận đơn để xem và nhận đơn hàng.</>
                  : <><Lock size={16} className="text-amber-600" /> Tài khoản chưa đủ điều kiện. Liên hệ Admin để được hỗ trợ.</>}
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">Hiện chưa có đơn nào chờ shipper nhận.</div>
            ) : (
              <>
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {availableOrders.map(order => {
                    const diffMs = order.holdExpiresAt ? new Date(order.holdExpiresAt).getTime() - (now || Date.now()) : 0
                    const holdSec = Math.max(0, Math.ceil(diffMs / 1000))
                    const isHeldByOther = Boolean(order.isHeldByOther && holdSec > 0)
                    const isHeldByMe = Boolean((order.isHeldByMe || selectedDetails === order._id) && holdSec > 0)

                    return (
                      <article
                        className={`flex flex-col gap-3 rounded-xl border p-4 transition ${
                          isHeldByOther
                            ? 'border-amber-200 bg-amber-50/40 opacity-75'
                            : isHeldByMe
                              ? 'border-brand bg-brand-light/30 ring-2 ring-brand/20'
                              : 'border-brand-soft/70 hover:shadow-md'
                        }`}
                        key={order._id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="font-mono text-sm text-slate-900">{order.orderCode}</strong>
                            {isHeldByOther && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 animate-pulse">
                                <Lock size={11} /> Đang có người xem ({holdSec}s)
                              </span>
                            )}
                            {isHeldByMe && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                ⏱️ Giữ chỗ cho bạn ({holdSec}s)
                              </span>
                            )}
                          </div>
                          <span className={statusBadgeClass('ready')}>{POOL_STATUS_LABELS[order.status] || 'Chờ shipper'}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{order.restaurant.name}</h3>
                          <p className="text-sm text-slate-600">{order.restaurant.address}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"><MapPin size={12} /> Điểm giao: {order.delivery.area}</span>
                          {Number.isFinite(Number(order.distanceKm)) && Number(order.distanceKm) > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Quãng đường tính phí: {order.distanceKm} km</span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700"><Package size={12} /> {order.itemCount} món</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">
                            Thu nhập dự kiến: <strong>{formatMoney(order.estimatedPay)}</strong>
                          </span>
                          {order.status === 'preparing' && order.kitchenDueAt && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">Bếp dự kiến xong lúc {formatTime(order.kitchenDueAt)}</span>
                          )}
                          {order.amountToCollect > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                              Thu hộ COD: <strong>{formatMoney(order.amountToCollect)}</strong>
                            </span>
                          )}
                        </div>
                        {selectedDetails === order._id && order.detail && (
                          <div className="space-y-2 rounded-lg bg-brand-light/60 p-3 text-sm text-slate-700 border border-brand/20">
                            {isHeldByMe && (
                              <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 border border-amber-200">
                                <span className="flex items-center gap-1.5 font-bold">
                                  <Lock size={14} className="text-amber-600" />
                                  Đang giữ chỗ cho bạn: còn {holdSec}s để quyết định!
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleReleaseHold(order._id)}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                                >
                                  Bỏ qua (nhả đơn)
                                </button>
                              </div>
                            )}
                            <strong className="block text-slate-900">Bước 2 · Xem chi tiết đơn</strong>
                            <p>Điểm nhận: {order.detail.restaurant?.address || order.restaurant.address}</p>
                            <p>Khu vực giao: {order.detail.delivery?.area || order.delivery.area}</p>
                            <p>Tiền thu hộ COD: {formatMoney(order.amountToCollect)}</p>
                            <p>Thu nhập chuyến dự kiến: {formatMoney(order.estimatedPay)}</p>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                className={`${primaryButtonClass} flex-1`}
                                disabled={Boolean(activeOrders.length)}
                                onClick={() => setAcceptConfirmId(order._id)}
                              >
                                Tiếp tục nhận đơn
                              </button>
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                onClick={() => handleReleaseHold(order._id)}
                              >
                                Bỏ qua
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="mt-auto flex justify-end">
                          {isHeldByOther ? (
                            <button
                              type="button"
                              disabled
                              className={`${secondaryButtonClass} opacity-60 cursor-not-allowed text-amber-800 bg-amber-50 border-amber-200`}
                              title="Tài xế khác đang mở xem xét đơn này"
                            >
                              <Lock size={14} className="mr-1 inline text-amber-600" />
                              Đang có người xem ({holdSec}s)
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={secondaryButtonClass}
                              disabled={busyOrderId === order._id}
                              onClick={() => handleShowDetails(order._id)}
                            >
                              {selectedDetails === order._id ? 'Thu gọn' : 'Chi tiết & Nhận'}
                            </button>
                          )}
                        </div>
                        {acceptConfirmId === order._id && (
                          <div className="space-y-1 rounded-lg border border-brand/30 bg-white px-3 py-3 text-sm text-slate-700">
                            <strong className="block text-slate-900">Bước 3 · Xác nhận nhận đơn</strong>
                            <p>Bạn sẽ phụ trách lấy đơn tại {order.restaurant.name}, giao đến {order.delivery.area}.</p>
                            <p>Sau khi nhận, bạn cần hoàn tất đơn hiện tại trước khi nhận đơn khác.</p>
                            <div className="flex flex-wrap justify-end gap-2 pt-2">
                              <button
                                type="button"
                                className={secondaryButtonClass}
                                onClick={() => setAcceptConfirmId('')}
                              >
                                Quay lại chi tiết
                              </button>
                              <button
                                type="button"
                                className={primaryButtonClass}
                                disabled={Boolean(activeOrders.length) || busyOrderId === order._id}
                                onClick={() => runOrderAction(order._id, async () => {
                                  await orderApi.acceptDeliveryOrder(order._id)
                                  setSelectedDetails('')
                                  setAcceptConfirmId('')
                                })}
                              >
                                {busyOrderId === order._id ? 'Đang nhận đơn…' : 'Xác nhận nhận đơn'}
                              </button>
                            </div>
                          </div>
                        )}
                        {activeOrders.length > 0 && (
                          <p className="text-xs text-slate-500">Hoàn tất đơn đang giao trước khi nhận đơn mới.</p>
                        )}
                      </article>
                    )
                  })}
                </div>
                {availablePagination.totalPages > 1 && (
                  <nav
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-600"
                    aria-label="Phân trang danh sách đơn có thể nhận"
                  >
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={availablePage <= 1 || refreshing}
                      onClick={() => {
                        setSelectedDetails('')
                        setAcceptConfirmId('')
                        setLoading(true)
                        setAvailablePage(page => Math.max(1, page - 1))
                      }}
                    >
                      Trang trước
                    </button>
                    <span>
                      Trang {availablePagination.page} / {availablePagination.totalPages}
                      {' · '}Tổng {availablePagination.totalItems} đơn
                    </span>
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={availablePage >= availablePagination.totalPages || refreshing}
                      onClick={() => {
                        setSelectedDetails('')
                        setAcceptConfirmId('')
                        setLoading(true)
                        setAvailablePage(page => Math.min(availablePagination.totalPages, page + 1))
                      }}
                    >
                      Trang sau
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default DeliveryOrders
