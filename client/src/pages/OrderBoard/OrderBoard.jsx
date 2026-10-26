import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BellRing, ChefHat, CircleCheckBig, CookingPot, Store, WifiOff } from 'lucide-react'
import orderApi from '../../api/orderApi.js'
import NoRestaurantNotice from '../../components/NoRestaurantNotice/NoRestaurantNotice.jsx'
import useInterval from '../../hooks/useInterval.js'
import useNow from '../../hooks/useNow.js'
import { formatClock } from '../../utils/formatTime.js'
import { isOpenNow } from '../../utils/openingHours.js'
import { playNotificationSound } from '../../utils/playNotificationSound.js'
import { ACCEPT_BLOCKED_MESSAGES, POLL_INTERVAL_MS, SOUND_STORAGE_KEY } from './constants.js'
import BoardHeaderBar from './components/BoardHeaderBar.jsx'
import BoardNotice from './components/BoardNotice.jsx'
import CancelledOrderCard from './components/CancelledOrderCard.jsx'
import OrderColumn from './components/OrderColumn.jsx'
import OrderDetailDrawer from './components/OrderDetailDrawer.jsx'
import PendingOrderCard from './components/PendingOrderCard.jsx'
import PreparingOrderCard from './components/PreparingOrderCard.jsx'
import ReadyOrderCard from './components/ReadyOrderCard.jsx'
import RejectOrderDialog from './components/RejectOrderDialog.jsx'

const EMPTY_BOARD = {
  pending: [],
  preparing: [],
  readyForPickup: [],
  recentlyCancelled: [],
  stats: { todayOrders: 0, processing: 0, completedToday: 0 },
}

const readSoundSetting = () => {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback

// Kitchen order board: accept / reject new orders, mark them ready for shippers
export default function OrderBoard() {
  const { restaurant } = useOutletContext()

  const [board, setBoard] = useState(EMPTY_BOARD)
  const [lastSyncedAt, setLastSyncedAt] = useState(null) // null = never loaded successfully
  const [syncError, setSyncError] = useState('') // last load failed (connection / server problem)
  const [refreshing, setRefreshing] = useState(false)
  const [busyIds, setBusyIds] = useState(() => new Set()) // orders with an action running
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectState, setRejectState] = useState({ submitting: false, error: '' })
  const [soundEnabled, setSoundEnabled] = useState(readSoundSetting)
  const [lastOwnChange, setLastOwnChange] = useState(null) // { orderId, status } of the owner's last action

  // Open order detail lives in the URL (?order=<id>): survives F5, can be shared, Back closes it
  const [searchParams, setSearchParams] = useSearchParams()
  const detailOrderId = searchParams.get('order')

  const openDetail = useCallback(
    (orderId) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('order', orderId)
        return next
      })
    },
    [setSearchParams],
  )

  const closeDetail = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('order')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  // applyBoard is created once: it reaches the latest openDetail through this ref
  const openDetailRef = useRef(openDetail)
  useEffect(() => {
    openDetailRef.current = openDetail
  }, [openDetail])

  const now = useNow(1000) // one clock for every timer on the page
  // Every board request gets a number; only the response of the NEWEST request may update the screen
  const latestRequestIdRef = useRef(0)
  // Pending order IDs from the previous applied load (null = first load, do not ring)
  const knownPendingIdsRef = useRef(null)
  const soundEnabledRef = useRef(soundEnabled)

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  const applyBoard = useCallback((requestId, data) => {
    // A newer request was sent meanwhile (poll, refresh, reload after an action): drop this stale response
    if (requestId !== latestRequestIdRef.current) return

    const knownIds = knownPendingIdsRef.current
    const newOrders = knownIds ? data.pending.filter((order) => !knownIds.has(order._id)) : []
    if (newOrders.length > 0) {
      const newestOrderId = newOrders[newOrders.length - 1]._id // board is sorted oldest first
      toast(
        (t) => (
          <span className="flex items-center gap-3">
            Có {newOrders.length} đơn mới cần nhận
            <button
              type="button"
              onClick={() => {
                openDetailRef.current(newestOrderId)
                toast.dismiss(t.id)
              }}
              className="rounded bg-white px-2 py-0.5 text-xs font-bold text-slate-900"
            >
              Xem
            </button>
          </span>
        ),
        { icon: <BellRing className="h-4 w-4 text-amber-400" />, duration: 8000 },
      )
      if (soundEnabledRef.current) playNotificationSound()
    }
    knownPendingIdsRef.current = new Set(data.pending.map((order) => order._id))

    setBoard(data)
    setLastSyncedAt(Date.now())
    setSyncError('')
  }, [])

  const applyError = useCallback((requestId, error) => {
    if (requestId !== latestRequestIdRef.current) return
    // Keep the last good board on screen; the banner tells the owner it may be outdated
    setSyncError(getErrorMessage(error, 'Không kết nối được máy chủ'))
  }, [])

  // The ONLY way the board is loaded (first load, polling, manual refresh, after actions)
  const fetchBoard = useCallback(() => {
    latestRequestIdRef.current += 1
    const requestId = latestRequestIdRef.current
    return orderApi
      .getBoard()
      .then(({ data }) => applyBoard(requestId, data))
      .catch((error) => applyError(requestId, error))
  }, [applyBoard, applyError])

  useEffect(() => {
    if (restaurant) fetchBoard()
  }, [restaurant, fetchBoard])

  const isMutating = busyIds.size > 0 || rejectState.submitting

  // Auto refresh. Skipped while the tab is hidden or an action is running (its own reload follows).
  useInterval(() => {
    if (restaurant && !document.hidden && !isMutating) fetchBoard()
  }, POLL_INTERVAL_MS)

  const handleManualRefresh = () => {
    setRefreshing(true)
    fetchBoard().finally(() => setRefreshing(false))
  }

  const setBusy = (orderId, isBusy) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (isBusy) next.add(orderId)
      else next.delete(orderId)
      return next
    })
  }

  // Accept / ready: lock the card, call the API, then reload (also after 409 "status changed")
  const runAction = async (order, request) => {
    if (busyIds.has(order._id)) return
    setBusy(order._id, true)
    try {
      const response = await request()
      setLastOwnChange({ orderId: order._id, status: response.data.status })
      toast.success(response.message)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Thao tác không thành công'))
    } finally {
      setBusy(order._id, false)
      fetchBoard()
    }
  }

  const acceptOrder = (order) => runAction(order, () => orderApi.acceptOrder(order._id))
  const markReady = (order) => runAction(order, () => orderApi.markReady(order._id))

  // "GN-0042" -> open its detail. Returns true when found (the input is then cleared).
  const lookupOrder = async (code) => {
    try {
      const response = await orderApi.lookupOrder(code)
      openDetail(response.data._id)
      return true
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không tìm thấy đơn hàng'))
      return false
    }
  }

  const closeRejectDialog = () => {
    setRejectTarget(null)
    setRejectState({ submitting: false, error: '' })
  }

  const handleReject = async (data) => {
    setRejectState({ submitting: true, error: '' })
    try {
      const response = await orderApi.rejectOrder(rejectTarget._id, data)
      setLastOwnChange({ orderId: rejectTarget._id, status: response.data.status })
      toast.success(response.message)
      closeRejectDialog()
      fetchBoard()
    } catch (error) {
      const message = getErrorMessage(error, 'Không từ chối được đơn hàng')
      if (error.response?.status === 400) {
        setRejectState({ submitting: false, error: error.response.data.errors?.[0]?.message || message })
        return
      }
      // 409/404: the order changed meanwhile -> close the dialog and show the fresh board
      toast.error(message)
      closeRejectDialog()
      fetchBoard()
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // storage unavailable (private mode): keep the setting for this session only
    }
    if (next) playNotificationSound() // preview + unlocks audio in the browser
  }

  if (!restaurant) {
    return <NoRestaurantNotice message="Hãy tạo hồ sơ nhà hàng trước, sau đó quay lại đây để nhận đơn." />
  }

  const hasLoaded = lastSyncedAt !== null
  const acceptBlockedReason = restaurant.status === 'approved' ? '' : ACCEPT_BLOCKED_MESSAGES[restaurant.status]
  const pendingCount = board.pending.length

  return (
    <>
      <BoardHeaderBar
        isOpen={isOpenNow(restaurant.openingHours)}
        stats={board.stats}
        lastSyncedAt={lastSyncedAt}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        refreshing={refreshing}
        onRefresh={handleManualRefresh}
        onLookup={lookupOrder}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Loaded before but the latest refresh failed: keep data, warn that it may be outdated */}
        {hasLoaded && syncError && (
          <BoardNotice
            tone="danger"
            icon={WifiOff}
            title="Mất kết nối máy chủ – bảng đơn có thể đã cũ"
            actionLabel="Thử lại ngay"
            onAction={handleManualRefresh}
          >
            Cập nhật thành công lần cuối lúc {formatClock(lastSyncedAt, true)}. Hệ thống tự thử lại mỗi 15 giây.
            Đơn mới có thể chưa hiển thị. ({syncError})
          </BoardNotice>
        )}

        {acceptBlockedReason && (
          <BoardNotice tone="warning" icon={Store} title={acceptBlockedReason}>
            Bạn vẫn có thể từ chối đơn (hoàn tiền cho khách) và hoàn tất các đơn đang làm.
          </BoardNotice>
        )}

        {!hasLoaded && syncError ? (
          // First load failed: never show an empty board that looks like "no orders"
          <div className="rounded-lg border border-red-200 bg-white px-6 py-16 text-center">
            <WifiOff className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 font-bold text-slate-900">Không tải được bảng đơn</p>
            <p className="mt-1 text-sm text-slate-600">{syncError}. Vui lòng kiểm tra kết nối rồi thử lại.</p>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="mt-5 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {refreshing ? 'Đang thử lại...' : 'Thử lại'}
            </button>
          </div>
        ) : !hasLoaded ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div key={key} className="h-80 animate-pulse rounded-lg bg-brand-light" />
            ))}
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <OrderColumn
              title="Đơn mới (chờ nhận)"
              icon={BellRing}
              tone="red"
              count={pendingCount}
              isEmpty={pendingCount === 0 && board.recentlyCancelled.length === 0}
              emptyText="Chưa có đơn mới. Bảng tự cập nhật mỗi 15 giây."
            >
              {board.recentlyCancelled.map((order) => (
                <CancelledOrderCard key={order._id} order={order} onView={() => openDetail(order._id)} />
              ))}
              {board.pending.map((order) => (
                <PendingOrderCard
                  key={order._id}
                  order={order}
                  now={now}
                  busy={busyIds.has(order._id)}
                  acceptBlockedReason={acceptBlockedReason}
                  onAccept={() => acceptOrder(order)}
                  onReject={() => setRejectTarget(order)}
                  onView={() => openDetail(order._id)}
                />
              ))}
            </OrderColumn>

            <OrderColumn
              title="Đang chuẩn bị (bếp nấu)"
              icon={CookingPot}
              tone="amber"
              count={board.preparing.length}
              isEmpty={board.preparing.length === 0}
              emptyText="Bếp đang rảnh. Nhận đơn mới để bắt đầu nấu."
            >
              {board.preparing.map((order) => (
                <PreparingOrderCard
                  key={order._id}
                  order={order}
                  now={now}
                  busy={busyIds.has(order._id)}
                  onReady={() => markReady(order)}
                  onView={() => openDetail(order._id)}
                />
              ))}
            </OrderColumn>

            <OrderColumn
              title="Sẵn sàng lấy hàng"
              icon={CircleCheckBig}
              tone="green"
              count={board.readyForPickup.length}
              isEmpty={board.readyForPickup.length === 0}
              emptyText="Chưa có đơn chờ shipper."
            >
              {board.readyForPickup.map((order) => (
                <ReadyOrderCard key={order._id} order={order} onView={() => openDetail(order._id)} />
              ))}
            </OrderColumn>
          </div>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ChefHat className="h-3.5 w-3.5" />
          Đơn đã sẵn sàng sẽ hiển thị cho shipper. Đơn rời bảng khi shipper xác nhận đã lấy hàng.
        </p>
      </div>

      {rejectTarget && (
        <RejectOrderDialog
          order={rejectTarget}
          submitting={rejectState.submitting}
          error={rejectState.error}
          onSubmit={handleReject}
          onCancel={() => {
            if (!rejectState.submitting) closeRejectDialog()
          }}
        />
      )}

      {detailOrderId && (
        <OrderDetailDrawer
          key={detailOrderId}
          orderId={detailOrderId}
          now={now}
          refreshKey={lastSyncedAt}
          lastOwnChange={lastOwnChange}
          busy={busyIds.has(detailOrderId)}
          acceptBlockedReason={acceptBlockedReason}
          shortcutsEnabled={!rejectTarget}
          restaurantName={restaurant.name}
          onClose={closeDetail}
          onAccept={acceptOrder}
          onReject={setRejectTarget}
          onReady={markReady}
        />
      )}
    </>
  )
}
