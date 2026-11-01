import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { addressApi } from '../../api/addressApi.js'
import { authApi } from '../../api/authApi.js'
import { promotionApi } from '../../api/promotionApi.js'
import { orderApi } from '../../api/orderApi.js'
import { useCart } from '../../context/CartContext.jsx'
import useAuth from '../../hooks/useAuth.js'

function Checkout() {
  const { user } = useAuth()
  const { cart, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const isOrderPlaced = useRef(false)

  // Addresses (UC12)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [newAddressForm, setNewAddressForm] = useState({
    recipientName: '',
    phone: '',
    addressLine: '',
    note: '',
    isDefault: true,
    location: null,
  })
  const [isLocating, setIsLocating] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  // Promotions (UC14)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [activePromotions, setActivePromotions] = useState([])

  // Payment Method (UC15) - Only Bank Transfer
  const paymentMethod = 'banking'

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Distance & Shipping states
  const [shippingFee, setShippingFee] = useState(15000)
  const [distanceKm, setDistanceKm] = useState(null)
  const [durationMinutes, setDurationMinutes] = useState(null)
  const [isDeliverable, setIsDeliverable] = useState(true)
  const [shippingError, setShippingError] = useState('')
  const [loadingShipping, setLoadingShipping] = useState(false)

  const totalPrice = Math.max(0, subtotal + shippingFee - discountAmount)

  // Redirect if cart is empty (chỉ chuyển về trang chủ nếu chưa đặt đơn hàng)
  useEffect(() => {
    if (!isOrderPlaced.current && cart.items.length === 0) {
      navigate('/')
    }
  }, [cart.items.length, navigate])

  // Fetch addresses & active promos
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const [addrRes, promoRes] = await Promise.allSettled([
          addressApi.getAddresses(),
          promotionApi.getPromotions({ activeOnly: true }),
        ])
        let addrs = []
        if (addrRes.status === 'fulfilled' && addrRes.value?.data?.data) {
          addrs = addrRes.value.data.data
        }
        // If empty in Address collection, check user's saved addresses in authApi
        if (addrs.length === 0) {
          try {
            const userAddrsRes = await authApi.getAddresses()
            const userAddrs = userAddrsRes?.data || []
            if (Array.isArray(userAddrs) && userAddrs.length > 0) {
              addrs = userAddrs.map((ua) => ({
                _id: ua._id,
                recipientName: ua.receiverName || user?.fullName || 'Khách hàng',
                phone: ua.receiverPhone || user?.phone || '',
                addressLine: [ua.street, ua.ward, ua.district, ua.city].filter(Boolean).join(', '),
                isDefault: ua.isDefault,
                note: '',
                location: ua.location || null,
              }))
            }
          } catch {
            // ignore
          }
        }
        setAddresses(addrs)
        if (addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0]
          setSelectedAddressId(defaultAddr._id)
        }
        if (promoRes.status === 'fulfilled' && promoRes.value?.data?.data) {
          setActivePromotions(promoRes.value.data.data)
        }
      } catch (err) {
        console.error('Failed to load checkout data', err)
      }
    }
    fetchCheckoutData()
  }, [user])

  // Tự động tính phí vận chuyển dựa trên khoảng cách GPS từ nhà hàng đến địa chỉ nhận
  useEffect(() => {
    const fetchShippingFee = async () => {
      const restaurantId = cart?.restaurant?.id || cart?.restaurant?._id
      if (!restaurantId || !selectedAddressId) return

      const chosenAddr = addresses.find((a) => a._id === selectedAddressId)
      const params = { restaurantId, addressId: selectedAddressId }
      if (chosenAddr?.location?.lat && chosenAddr?.location?.lng) {
        params.lat = chosenAddr.location.lat
        params.lng = chosenAddr.location.lng
      }

      setLoadingShipping(true)
      try {
        const res = await orderApi.estimateShipping(params)
        const info = res.data?.data
        if (info) {
          setDistanceKm(info.distanceKm)
          setDurationMinutes(info.durationMinutes || null)
          setShippingFee(info.shippingFee || 15000)
          setIsDeliverable(info.isDeliverable !== false)
          if (!info.isDeliverable) {
            setShippingError(
              info.message ||
                `Khoảng cách giao hàng (${info.distanceKm} km) vượt quá bán kính tối đa cho phép (${info.maxDistanceKm} km).`
            )
          } else {
            setShippingError('')
          }
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Không thể tính phí giao hàng'
        const data = err.response?.data?.data
        if (data?.distanceKm) {
          setDistanceKm(data.distanceKm)
        }
        setIsDeliverable(false)
        setShippingError(msg)
      } finally {
        setLoadingShipping(false)
      }
    }

    fetchShippingFee()
  }, [selectedAddressId, cart?.restaurant?.id, cart?.restaurant?._id, addresses])

  const handleOpenAddAddressModal = () => {
    setNewAddressForm({
      recipientName: user?.fullName || '',
      phone: user?.phone || '',
      addressLine: '',
      note: '',
      isDefault: addresses.length === 0,
      location: null,
    })
    setIsAddressModalOpen(true)
  }

  // Lấy vị trí GPS hiện tại từ thiết bị
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt của bạn không hỗ trợ định vị GPS')
      return
    }

    setIsLocating(true)
    toast.loading('Đang lấy tọa độ GPS...', { id: 'gps-loading' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setNewAddressForm((prev) => ({
          ...prev,
          location: { lat: latitude, lng: longitude },
        }))

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`
          )
          const data = await res.json()
          if (data && data.display_name) {
            setNewAddressForm((prev) => ({
              ...prev,
              addressLine: prev.addressLine || data.display_name,
            }))
          }
        } catch {
          // ignore geocoding lookup failures
        }

        toast.success(`Đã lấy vị trí GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, {
          id: 'gps-loading',
        })
        setIsLocating(false)
      },
      (error) => {
        let msg = 'Không thể lấy vị trí GPS'
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Bạn đã từ chối cấp quyền truy cập vị trí'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Thông tin vị trí không khả dụng'
        } else if (error.code === error.TIMEOUT) {
          msg = 'Thời gian định vị hết hạn'
        }
        toast.error(msg, { id: 'gps-loading' })
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Thêm địa chỉ mới vào sổ địa chỉ (UC12)
  const handleSaveNewAddress = async (e) => {
    if (e) e.preventDefault()
    if (!newAddressForm.recipientName.trim() || !newAddressForm.phone.trim() || !newAddressForm.addressLine.trim()) {
      toast.error('Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ nhận hàng')
      return null
    }

    setSavingAddress(true)
    try {
      const res = await addressApi.createAddress({
        recipientName: newAddressForm.recipientName.trim(),
        phone: newAddressForm.phone.trim(),
        addressLine: newAddressForm.addressLine.trim(),
        note: newAddressForm.note.trim(),
        isDefault: newAddressForm.isDefault,
        location: newAddressForm.location,
      })
      const created = res.data.data
      const updated = created.isDefault
        ? [created, ...addresses.map((a) => ({ ...a, isDefault: false }))]
        : [...addresses, created]

      setAddresses(updated)
      setSelectedAddressId(created._id)
      setIsAddressModalOpen(false)
      toast.success('Đã lưu địa chỉ nhận hàng thành công!')
      return created
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu địa chỉ')
      return null
    } finally {
      setSavingAddress(false)
    }
  }

  // Đặt làm địa chỉ mặc định
  const handleSetDefaultAddress = async (e, addressId) => {
    e.stopPropagation()
    try {
      await addressApi.setDefaultAddress(addressId)
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          isDefault: a._id === addressId,
        }))
      )
      setSelectedAddressId(addressId)
      toast.success('Đã đặt làm địa chỉ mặc định')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi đặt địa chỉ mặc định')
    }
  }

  // Xóa địa chỉ khỏi sổ
  const handleDeleteAddress = async (e, addressId) => {
    e.stopPropagation()
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này khỏi danh bạ?')) return
    try {
      await addressApi.deleteAddress(addressId)
      const updated = addresses.filter((a) => a._id !== addressId)
      setAddresses(updated)
      if (selectedAddressId === addressId) {
        setSelectedAddressId(updated[0]?._id || '')
      }
      toast.success('Đã xóa địa chỉ')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa địa chỉ')
    }
  }

  // Handle Apply Promotion (UC14)
  const handleApplyPromo = async (codeToApply = null) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase()
    if (!code) return
    setPromoError('')
    try {
      const res = await promotionApi.applyPromotion({ code, subtotal })
      const data = res.data.data
      setDiscountAmount(data.discountAmount)
      setAppliedPromo(data.promotion)
      setPromoCodeInput(code)
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Mã khuyến mãi không hợp lệ')
      setAppliedPromo(null)
      setDiscountAmount(0)
    }
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setDiscountAmount(0)
    setPromoCodeInput('')
    setPromoError('')
  }

  // Handle Place Order (UC13)
  const handlePlaceOrder = async () => {
    setErrorMsg('')
    let deliveryAddress = null

    if (addresses.length === 0) {
      setErrorMsg('Vui lòng thêm địa chỉ nhận hàng để tiếp tục đặt hàng.')
      handleOpenAddAddressModal()
      return
    }

    const chosenAddress = addresses.find((a) => a._id === selectedAddressId) || addresses[0]
    if (!chosenAddress) {
      setErrorMsg('Vui lòng chọn một địa chỉ nhận hàng từ danh sách.')
      return
    }

    if (!isDeliverable) {
      setErrorMsg(
        shippingError ||
          `Khoảng cách giao hàng (${distanceKm} km) vượt quá bán kính phục vụ tối đa (10 km). Vui lòng chọn địa chỉ khác gần hơn.`
      )
      return
    }

    deliveryAddress = {
      recipientName: chosenAddress.recipientName,
      phone: chosenAddress.phone,
      addressLine: chosenAddress.addressLine,
      note: chosenAddress.note || '',
      addressId: chosenAddress._id,
      location: chosenAddress.location || null,
    }

    try {
      setIsSubmitting(true)
      const payload = {
        restaurantId: cart.restaurant.id,
        items: cart.items.map((item) => ({
          foodId: item.food._id || item.food.id,
          quantity: item.quantity,
          note: item.note || '',
        })),
        deliveryAddress,
        paymentMethod,
        promotionCode: appliedPromo?.code || null,
      }

      const res = await orderApi.createOrder(payload)
      const createdOrder = res.data.data

      // Đánh dấu đơn đã đặt xong trước khi clear cart để tránh bị useEffect redirect về home
      isOrderPlaced.current = true
      clearCart()

      // Chuyển thẳng sang trang quét mã VietQR thanh toán
      navigate(`/payment-result?orderId=${createdOrder._id}&method=banking`)
    } catch (err) {
      console.error('Order creation failed:', err)
      setErrorMsg(err.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: 60 }}>
      <div style={{ marginBottom: 28 }}>
        <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          ← Quay lại chọn thêm món
        </Link>
        <h1 style={{ margin: '8px 0 0', fontSize: '1.8rem', fontWeight: 800 }}>
          Xác nhận đặt hàng & Thanh toán
        </h1>
      </div>

      {errorMsg && (
        <div style={{
          padding: '14px 20px',
          background: 'var(--danger-light)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          fontWeight: 600,
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* Left Column: Delivery Address & Payment Method */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* UC12: Enter / Select Delivery Address */}
          <div className="card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📍</span> 1. Địa chỉ nhận hàng
                </h2>
                {addresses.length > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Chọn địa chỉ giao hàng từ danh sách ({addresses.length} địa chỉ đã lưu)
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddAddressModal}
                style={{
                  fontSize: '0.85rem',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>➕</span>
                <span>Thêm địa chỉ mới</span>
              </button>
            </div>

            {/* If addresses.length > 0: Show list of selectable addresses */}
            {addresses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr._id
                  return (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      style={{
                        padding: '16px',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--primary-light)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <input
                          type="radio"
                          name="deliveryAddress"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr._id)}
                          style={{
                            marginTop: 4,
                            accentColor: 'var(--primary)',
                            width: 18,
                            height: 18,
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                              {addr.recipientName}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              • {addr.phone}
                            </span>
                            {addr.isDefault && (
                              <span
                                style={{
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginTop: 6, lineHeight: 1.4 }}>
                            {addr.addressLine}
                          </div>
                          {addr.note && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              💬 Ghi chú: {addr.note}
                            </div>
                          )}

                          {/* Action links */}
                          <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={(e) => handleSetDefaultAddress(e, addr._id)}
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--primary)',
                                  fontWeight: 600,
                                  background: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                }}
                              >
                                ⭐ Đặt làm mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(e, addr._id)}
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--danger)',
                                fontWeight: 600,
                                background: 'none',
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              🗑️ Xóa địa chỉ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* If addresses.length === 0: Clean empty state box with prominent button */
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--border)',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📍</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
                  Bạn chưa có địa chỉ nhận hàng nào được lưu
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 18px', maxWidth: 420, marginInline: 'auto' }}>
                  Vui lòng thêm địa chỉ nhận hàng của bạn để hoàn tất đơn hàng. Bạn có thể lưu lại để dùng cho các lần đặt sau.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenAddAddressModal}
                  style={{
                    padding: '12px 28px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-full)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  + Thêm địa chỉ nhận hàng ngay
                </button>
              </div>
            )}
          </div>

          {/* UC15: Payment Method Selection */}
          <div className="card">
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 700 }}>
              💳 2. Phương thức thanh toán
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 16,
                border: '2px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                    Chuyển khoản Ngân hàng / Quét mã VietQR
                  </span>
                  <span className="badge badge-confirmed" style={{ fontSize: '0.75rem' }}>
                    Duy nhất
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Quét mã QR tự động qua ứng dụng ngân hàng hoặc Internet Banking
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Promotion Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Items Summary (UC13) */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                📦 Tóm tắt đơn hàng ({cart.items.length} món)
              </h2>
              {cart.restaurant?.name && (
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--primary, #FF4B2B)',
                  background: '#FFF0EB',
                  border: '1px solid #FFE0D6',
                  padding: '4px 10px',
                  borderRadius: 12,
                }}>
                  🏪 {cart.restaurant.name}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {cart.items.map((item) => (
                <div
                  key={item.food._id || item.food.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <span style={{ fontWeight: 700 }}>{item.quantity}x</span>{' '}
                    <span>{item.food.name}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>
                    {(item.food.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>

            {/* UC14: Promotion Code Input & Suggestion Chips */}
            <div style={{
              paddingTop: 16,
              borderTop: '1px dashed var(--border)',
              marginBottom: 16,
            }}>
              <label className="form-label">🎟️ Mã khuyến mãi (Voucher)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập mã voucher..."
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  disabled={!!appliedPromo}
                  style={{ textTransform: 'uppercase' }}
                />
                {appliedPromo ? (
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={handleRemovePromo}
                  >
                    Bỏ mã
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleApplyPromo()}
                  >
                    Áp dụng
                  </button>
                )}
              </div>

              {promoError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 8 }}>
                  {promoError}
                </div>
              )}

              {appliedPromo && (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--secondary-light)',
                  color: '#047857',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}>
                  ✓ Đã áp dụng mã {appliedPromo.code}: Giảm {discountAmount.toLocaleString('vi-VN')}đ
                </div>
              )}

              {/* Suggestions chips */}
              {!appliedPromo && activePromotions.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Gợi ý mã hot: </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {activePromotions.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => handleApplyPromo(p.code)}
                        style={{
                          fontSize: '0.75rem',
                          background: 'var(--bg-main)',
                          border: '1px dashed var(--primary)',
                          color: 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        {p.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bill Breakdown */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              fontSize: '0.95rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tiền món:</span>
                <span>{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Phí vận chuyển {distanceKm != null ? `(${distanceKm} km${durationMinutes ? ` · ~${durationMinutes} phút` : ''})` : ''}:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {loadingShipping ? 'Đang tính...' : `${shippingFee.toLocaleString('vi-VN')}đ`}
                </span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary)', fontWeight: 700 }}>
                  <span>Giảm giá voucher:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 12,
                marginTop: 6,
                borderTop: '2px solid var(--border)',
                fontSize: '1.25rem',
                fontWeight: 800,
              }}>
                <span>Tổng thanh toán:</span>
                <span style={{ color: !isDeliverable ? '#dc2626' : 'var(--primary)' }}>
                  {!isDeliverable ? 'Không thể giao' : `${totalPrice.toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            </div>

            {shippingError && (
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#dc2626',
                fontSize: '0.88rem',
                fontWeight: 600,
                lineHeight: 1.4,
              }}>
                ⚠️ {shippingError}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                marginTop: 20,
                backgroundColor: !isDeliverable ? '#94a3b8' : undefined,
                cursor: !isDeliverable ? 'not-allowed' : undefined,
              }}
              disabled={isSubmitting || !isDeliverable || loadingShipping}
              onClick={handlePlaceOrder}
            >
              {isSubmitting
                ? 'Đang tạo đơn hàng...'
                : !isDeliverable
                ? 'Quá bán kính phục vụ (tối đa 10km)'
                : 'Xác nhận Đặt hàng ➔'}
            </button>
          </div>
        </div>
      </div>
      {/* Box / Modal Popup for adding new address */}
      {isAddressModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddressModalOpen(false)
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  📍 Thêm địa chỉ nhận hàng mới
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Nhập thông tin bên dưới và bấm Lưu để chọn địa chỉ này
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewAddress} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                  Tên người nhận (*)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={newAddressForm.recipientName}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, recipientName: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                  Số điện thoại liên hệ (*)
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Ví dụ: 0987654321"
                  value={newAddressForm.phone}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>
                    Địa chỉ chi tiết (*)
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isLocating ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{isLocating ? '⏳' : '📍'}</span>
                    <span>{isLocating ? 'Đang định vị GPS...' : 'Lấy vị trí GPS hiện tại'}</span>
                  </button>
                </div>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Ví dụ: Số 25, Ngõ 10 Tạ Quang Bửu, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội"
                  value={newAddressForm.addressLine}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, addressLine: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
                {newAddressForm.location && (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>✓ Tọa độ GPS:</span>
                    <span>{newAddressForm.location.lat.toFixed(4)}, {newAddressForm.location.lng.toFixed(4)}</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>
                  Ghi chú cho tài xế giao hàng
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Gọi trước khi đến, gửi bảo vệ tầng 1"
                  value={newAddressForm.note}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, note: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={newAddressForm.isDefault}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, isDefault: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                />
                <span style={{ fontWeight: 600, color: '#334155' }}>⭐ Đặt làm địa chỉ mặc định ưu tiên</span>
              </label>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: savingAddress ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3)',
                    opacity: savingAddress ? 0.7 : 1,
                  }}
                >
                  {savingAddress ? 'Đang lưu...' : '💾 Lưu địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Checkout
