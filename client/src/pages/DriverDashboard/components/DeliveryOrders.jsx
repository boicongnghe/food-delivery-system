import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Phone, RefreshCw, ShieldAlert } from 'lucide-react'
import deliveryIssueApi from '../../../api/deliveryIssueApi.js'
import orderApi from '../../../api/orderApi.js'
import uploadApi from '../../../api/uploadApi.js'

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

const formatMoney = amount => `${Number(amount || 0).toLocaleString('vi-VN')}đ`
const formatAddress = order =>
  order.delivery?.address || order.deliveryAddress?.addressLine || 'Chưa có địa chỉ giao hàng'
const recipientPhone = order => order.delivery?.phone || order.deliveryAddress?.phone || ''
const hasWaitingRequirement = type => ['customer_unreachable', 'customer_refused'].includes(type)

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Không thể thực hiện thao tác.'
}

function DeliveryOrders({ onOrderChanged }) {
  const [availableOrders, setAvailableOrders] = useState([])
  const [availablePagination, setAvailablePagination] = useState(EMPTY_PAGINATION)
  const [availablePage, setAvailablePage] = useState(1)
  const [activeOrders, setActiveOrders] = useState([])
  const [selectedDetails, setSelectedDetails] = useState('')
  const [acceptConfirmId, setAcceptConfirmId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
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
      setAvailableOrders([])
      setAvailablePagination(EMPTY_PAGINATION)
      setError(getErrorMessage(availableResult[0].reason))
    }
    setLoading(false)
    setRefreshing(false)
  }, [availablePage])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => refreshOrders(), 0)
    const refreshTimer = window.setInterval(() => refreshOrders(true), 5 * 60 * 1000)
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
    }
  }, [refreshOrders])

  const runOrderAction = async (orderId, action) => {
    setBusyOrderId(orderId)
    setActionError('')
    try {
      await action()
      onOrderChanged?.()
      await refreshOrders(true)
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyOrderId('')
    }
  }

  const handleShowDetails = async orderId => {
    if (selectedDetails === orderId) {
      setSelectedDetails('')
      setAcceptConfirmId('')
      return
    }
    setAcceptConfirmId('')
    setBusyOrderId(orderId)
    setActionError('')
    try {
      const response = await orderApi.getAvailableOrderDetail(orderId)
      setSelectedDetails(orderId)
      setAvailableOrders(orders => orders.map(order =>
        order._id === orderId ? { ...order, detail: response.data } : order,
      ))
    } catch (requestError) {
      setActionError(getErrorMessage(requestError))
    } finally {
      setBusyOrderId('')
    }
  }

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

  return (
    <div className="delivery-orders-page">
      <div className="delivery-orders-heading">
        <div>
          <h1>Quản lý đơn giao hàng</h1>
          <p>Danh sách đơn nhà hàng đã chuẩn bị xong và đang chờ tài xế nhận.</p>
        </div>
        <button
          type="button"
          className="delivery-refresh-button"
          onClick={() => refreshOrders(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw size={15} className={refreshing ? 'delivery-spin' : ''} />
          Cập nhật
        </button>
      </div>

      {error && <div className="delivery-alert" role="alert">{error}</div>}
      {actionError && <div className="delivery-alert" role="alert">{actionError}</div>}
      {loading && <div className="dashboard-message" role="status">Đang tải đơn giao hàng…</div>}

      {!loading && (
        <>
          <section className="delivery-orders-section">
            <header className="delivery-section-heading">
              <div>
                <h2>Đơn có thể nhận</h2>
                <p>Bước 1 · Xem danh sách đơn sẵn sàng, chọn đơn rồi xác nhận nhận</p>
              </div>
              <span className="delivery-count">{availablePagination.totalItems}</span>
            </header>
            {availableOrders.length === 0 ? (
              <div className="delivery-empty">Hiện chưa có đơn nào sẵn sàng để shipper nhận.</div>
            ) : (
              <>
                <div className="delivery-order-grid">
                  {availableOrders.map(order => (
                  <article className="delivery-order-card" key={order._id}>
                    <div className="delivery-order-card-top">
                      <strong>{order.orderCode}</strong>
                      <span className="delivery-status ready">Sẵn sàng lấy hàng</span>
                    </div>
                    <h3>{order.restaurant.name}</h3>
                    <p className="delivery-address">{order.restaurant.address}</p>
                    <div className="delivery-order-facts">
                      <span>Điểm giao: {order.delivery.area}</span>
                      <span>Thu nhập dự kiến: <strong>{formatMoney(order.estimatedPay)}</strong></span>
                      <span>{order.itemCount} món</span>
                    </div>
                    {selectedDetails === order._id && order.detail && (
                      <div className="delivery-detail-box">
                        <strong>Bước 2 · Xem chi tiết đơn</strong>
                        <p>Điểm nhận: {order.detail.restaurant?.address || order.restaurant.address}</p>
                        <p>Khu vực giao: {order.detail.delivery?.area || order.delivery.area}</p>
                        <p>Tiền thu hộ COD: {formatMoney(order.amountToCollect)}</p>
                        <p>Thu nhập chuyến dự kiến: {formatMoney(order.estimatedPay)}</p>
                        <button
                          type="button"
                          className="delivery-primary-button"
                          disabled={Boolean(activeOrders.length)}
                          onClick={() => setAcceptConfirmId(order._id)}
                        >
                          Tiếp tục nhận đơn
                        </button>
                      </div>
                    )}
                    <div className="delivery-card-actions">
                      <button
                        type="button"
                        className="delivery-secondary-button"
                        disabled={busyOrderId === order._id}
                        onClick={() => handleShowDetails(order._id)}
                      >
                        {selectedDetails === order._id ? 'Thu gọn' : 'Chi tiết'}
                      </button>
                    </div>
                    {acceptConfirmId === order._id && (
                      <div className="delivery-confirm-box">
                        <strong>Bước 3 · Xác nhận nhận đơn</strong>
                        <p>Bạn sẽ phụ trách lấy đơn tại {order.restaurant.name}, giao đến {order.delivery.area}.</p>
                        <p>Sau khi nhận, bạn cần hoàn tất đơn hiện tại trước khi nhận đơn khác.</p>
                        <div className="delivery-card-actions">
                          <button
                            type="button"
                            className="delivery-secondary-button"
                            onClick={() => setAcceptConfirmId('')}
                          >
                            Quay lại chi tiết
                          </button>
                          <button
                            type="button"
                            className="delivery-primary-button"
                            disabled={Boolean(activeOrders.length) || busyOrderId === order._id}
                            onClick={() => runOrderAction(order._id, () =>
                              orderApi.acceptDeliveryOrder(order._id),
                            )}
                          >
                            {busyOrderId === order._id ? 'Đang nhận đơn…' : 'Xác nhận nhận đơn'}
                          </button>
                        </div>
                      </div>
                    )}
                    {activeOrders.length > 0 && (
                      <p className="delivery-muted-note">Hoàn tất đơn đang giao trước khi nhận đơn mới.</p>
                    )}
                  </article>
                  ))}
                </div>
                {availablePagination.totalPages > 1 && (
                  <nav className="delivery-pagination" aria-label="Phân trang danh sách đơn có thể nhận">
                    <button
                      type="button"
                      className="delivery-secondary-button"
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
                      className="delivery-secondary-button"
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

          <section className="delivery-orders-section">
            <header className="delivery-section-heading">
              <div>
                <h2>Đơn đang thực hiện</h2>
                <p>Tiếp tục theo từng bước sau khi đã nhận đơn</p>
              </div>
              <span className="delivery-count">{activeOrders.length}</span>
            </header>
            {activeOrders.length === 0 ? (
              <div className="delivery-empty">Bạn chưa có đơn giao đang hoạt động.</div>
            ) : (
              <div className="delivery-active-list">
                {activeOrders.map(order => {
                  const acceptedAt = new Date(order.shipperAcceptedAt || 0).getTime()
                  const cancelAvailable = order.status === 'ready_for_pickup'
                    && (!now || now - acceptedAt <= 3 * 60 * 1000)
                  const waitMinutes = order.customerWaitStartedAt
                    ? Math.max(0, Math.floor((now - new Date(order.customerWaitStartedAt).getTime()) / 60000))
                    : 0
                  const loggedCalls = Math.max(
                    order.unansweredCallsAt?.length || 0,
                    callCounts[order._id] || 0,
                  )

                  return (
                    <article className="delivery-active-card" key={order._id}>
                      <div className="delivery-order-card-top">
                        <strong>{order.orderCode}</strong>
                        <span className={`delivery-status ${order.status === 'delivering' ? 'transit' : 'ready'}`}>
                          {order.status === 'delivering' ? 'Bước 2 · Đang giao' : 'Bước 1 · Chờ lấy hàng'}
                        </span>
                      </div>
                        <div className="delivery-stepper" aria-label="Tiến độ giao hàng">
                          <span className="complete">1. Nhận đơn</span>
                          <span className={order.status === 'delivering' ? 'complete' : 'current'}>2. Lấy hàng</span>
                          <span className={order.status === 'delivering' ? 'current' : ''}>3. Giao khách</span>
                        </div>
                        {order.status === 'ready_for_pickup' ? (
                          <section className="delivery-stage-panel">
                            <h3>Bước 2 · Lấy hàng tại nhà hàng</h3>
                            <div className="delivery-active-columns">
                              <div>
                            <h3>Nhận tại: {order.restaurant?.name}</h3>
                            <p className="delivery-address">{order.restaurant?.address}</p>
                            {order.restaurant?.phone && (
                            <a className="delivery-contact" href={`tel:${order.restaurant.phone}`}>
                              <Phone size={14} /> Gọi nhà hàng: {order.restaurant.phone}
                            </a>
                          )}
                            </div>
                          </div>
                          <div className="delivery-items">
                            <strong>Kiểm tra món trước khi rời quán</strong>
                            <ul>
                              {(order.items || []).map((item, index) => (
                                <li key={item._id || `${item.name}-${index}`}>{item.name} × {item.quantity}</li>
                              ))}
                            </ul>
                          </div>
                          <p className="delivery-muted-note">Chỉ xác nhận sau khi đã nhận và kiểm tra đủ món.</p>
                          {cancelAvailable && (
                            <button
                              type="button"
                              className="delivery-secondary-button"
                              disabled={busyOrderId === order._id}
                              onClick={() => runOrderAction(order._id, () =>
                                orderApi.cancelDeliveryAcceptance(order._id),
                              )}
                            >
                              Hủy nhận đơn trong 3 phút
                            </button>
                          )}
                          <button
                            type="button"
                            className="delivery-primary-button"
                            disabled={busyOrderId === order._id}
                            onClick={() => runOrderAction(order._id, () =>
                              orderApi.confirmDeliveryPickup(order._id),
                            )}
                          >
                            {busyOrderId === order._id ? 'Đang xác nhận…' : 'Bước tiếp theo: Xác nhận đã lấy'}
                          </button>
                        </section>
                      ) : (
                        <section className="delivery-stage-panel">
                          <h3>Bước 3 · Giao hàng cho khách</h3>
                          <div className="delivery-active-columns">
                            <div>
                              <h3>Địa chỉ nhận hàng: {order.delivery?.recipientName || order.customer?.fullName}</h3>
                              <p className="delivery-address">{formatAddress(order)}</p>
                              {recipientPhone(order) && (
                                <a className="delivery-contact" href={`tel:${recipientPhone(order)}`}>
                                  <Phone size={14} /> Gọi khách: {recipientPhone(order)}
                                </a>
                              )}
                              {(order.delivery?.note || order.deliveryAddress?.note || order.customerNote) && (
                                <p className="delivery-customer-note">
                                  Ghi chú: {order.delivery?.note || order.deliveryAddress?.note || order.customerNote}
                                </p>
                              )}
                            </div>
                            <div className="delivery-items">
                              <strong>Đơn cần giao</strong>
                              <ul>
                                {(order.items || []).map((item, index) => (
                                  <li key={item._id || `${item.name}-${index}`}>{item.name} × {item.quantity}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <p className="delivery-muted-note">Khi giao xong cho khách, xác nhận để hoàn tất đơn và ghi nhận thu nhập {formatMoney(order.shippingFee)}.</p>
                          <button
                            type="button"
                            className="delivery-primary-button"
                            disabled={busyOrderId === order._id}
                            onClick={() => runOrderAction(order._id, () => {
                              if (!window.confirm('Xác nhận đã giao đơn cho khách hàng?')) return Promise.resolve()
                              return orderApi.confirmDeliveryDelivered(order._id)
                            })}
                          >
                            {busyOrderId === order._id ? 'Đang hoàn tất…' : 'Xác nhận đã giao'}
                          </button>
                        </section>
                      )}
                      {order.deliveryIssueFlagged && (
                        <p className="delivery-flag-note"><ShieldAlert size={14} /> Đơn đang được Admin xem xét sự cố.</p>
                      )}
                      <div className="delivery-card-actions delivery-active-actions">
                        <button
                          type="button"
                          className="delivery-issue-button"
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
                        <form className="delivery-issue-form" onSubmit={submitIssue}>
                          <div className="delivery-issue-form-heading">
                            <div>
                              <span>BƯỚC RIÊNG · HỖ TRỢ SỰ CỐ</span>
                              <h3>Báo cáo sự cố đơn {order.orderCode}</h3>
                            </div>
                            <button type="button" onClick={() => setIssueOrder(null)} aria-label="Đóng báo cáo">×</button>
                          </div>
                          <label>
                            Loại sự cố *
                            <select
                              value={issueType}
                              onChange={event => setIssueType(event.target.value)}
                              required
                            >
                              <option value="">Chọn loại sự cố</option>
                              {ISSUE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </label>
                          {hasWaitingRequirement(issueType) && (
                            <div className="delivery-wait-box">
                              <strong>Quy trình xác minh khách không phản hồi</strong>
                              <p>Hệ thống yêu cầu chờ đủ 8 phút và ghi nhận ít nhất 2 cuộc gọi không được trả lời.</p>
                              {!issueOrder.customerWaitStartedAt ? (
                                <button
                                  type="button"
                                  className="delivery-secondary-button"
                                  disabled={busyOrderId === order._id}
                                  onClick={() => startWaiting(order)}
                                >
                                  Bắt đầu bộ đếm 8 phút
                                </button>
                              ) : (
                                <>
                                  <p>Đã chờ {waitMinutes} phút · còn {Math.floor(issueWaitRemaining / 60)}:{String(issueWaitRemaining % 60).padStart(2, '0')} · {loggedCalls}/2 cuộc gọi đã ghi nhận</p>
                                  <button
                                    type="button"
                                    className="delivery-secondary-button"
                                    disabled={busyOrderId === order._id || !order.customerWaitStartedAt}
                                    onClick={() => logUnansweredCall(order)}
                                  >
                                    Ghi nhận cuộc gọi không được trả lời
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          <label>
                            Mô tả thêm (không bắt buộc)
                            <textarea
                              value={issueDescription}
                              maxLength={1000}
                              rows={3}
                              onChange={event => setIssueDescription(event.target.value)}
                              placeholder="Mô tả ngắn gọn tình huống xảy ra…"
                            />
                          </label>
                          <label className="delivery-upload-field">
                            <span><Camera size={15} /> Ảnh minh chứng (JPG/PNG, tối đa 3 ảnh)</span>
                            <input type="file" accept="image/jpeg,image/png" multiple onChange={handleIssueFiles} />
                            {issueFiles.length > 0 && <small>{issueFiles.length} ảnh đã chọn</small>}
                          </label>
                          <button
                            type="submit"
                            className="delivery-primary-button"
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
        </>
      )}
    </div>
  )
}

export default DeliveryOrders
