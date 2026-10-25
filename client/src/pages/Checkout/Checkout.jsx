import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addressApi } from '../../api/addressApi.js'
import { promotionApi } from '../../api/promotionApi.js'
import { orderApi } from '../../api/orderApi.js'
import { useCart } from '../../context/CartContext.jsx'

function Checkout() {
  const { cart, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const isOrderPlaced = useRef(false)

  // Addresses (UC12)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    recipientName: '',
    phone: '',
    addressLine: '',
    note: '',
    isDefault: false,
  })
  const [saveToAddressBook, setSaveToAddressBook] = useState(true)

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

  const shippingFee = 15000
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
        const [addrRes, promoRes] = await Promise.all([
          addressApi.getAddresses(),
          promotionApi.getPromotions({ activeOnly: true }),
        ])
        const addrs = addrRes.data.data || []
        setAddresses(addrs)
        if (addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0]
          setSelectedAddressId(defaultAddr._id)
          setShowNewAddressForm(false)
        } else {
          setShowNewAddressForm(true)
        }
        setActivePromotions(promoRes.data.data || [])
      } catch (err) {
        console.error('Failed to load checkout data', err)
      }
    }
    fetchCheckoutData()
  }, [])

  // Thêm địa chỉ mới vào sổ địa chỉ (UC12)
  const handleCreateAddress = async (e) => {
    if (e) e.preventDefault()
    if (!newAddress.recipientName || !newAddress.phone || !newAddress.addressLine) {
      alert('Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ nhận hàng')
      return null
    }
    try {
      const res = await addressApi.createAddress(newAddress)
      const created = res.data.data
      const updated = created.isDefault
        ? [created, ...addresses.map((a) => ({ ...a, isDefault: false }))]
        : [...addresses, created]

      setAddresses(updated)
      setSelectedAddressId(created._id)
      setShowNewAddressForm(false)
      setNewAddress({ recipientName: '', phone: '', addressLine: '', note: '', isDefault: false })
      return created
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tạo địa chỉ')
      return null
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
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi đặt địa chỉ mặc định')
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
        if (updated.length === 0) setShowNewAddressForm(true)
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa địa chỉ')
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

    // 1. Nếu đang ở form nhập mới địa chỉ
    if (showNewAddressForm || addresses.length === 0) {
      if (!newAddress.recipientName || !newAddress.phone || !newAddress.addressLine) {
        setErrorMsg('Vui lòng hoàn tất thông tin địa chỉ giao hàng (Tên, SĐT, Địa chỉ chi tiết)')
        return
      }

      // Tự động lưu vào sổ địa chỉ để các lần sau không phải nhập lại
      if (saveToAddressBook) {
        try {
          const res = await addressApi.createAddress(newAddress)
          const created = res.data.data
          setAddresses((prev) => [created, ...prev])
          setSelectedAddressId(created._id)
        } catch (saveErr) {
          console.warn('Lỗi khi tự động lưu địa chỉ:', saveErr)
        }
      }

      deliveryAddress = {
        recipientName: newAddress.recipientName,
        phone: newAddress.phone,
        addressLine: newAddress.addressLine,
        note: newAddress.note || '',
      }
    } else {
      // 2. Chọn từ danh sách địa chỉ đã lưu
      const chosenAddress = addresses.find((a) => a._id === selectedAddressId)
      if (!chosenAddress) {
        setErrorMsg('Vui lòng chọn một địa chỉ nhận hàng từ danh sách')
        return
      }

      deliveryAddress = {
        recipientName: chosenAddress.recipientName,
        phone: chosenAddress.phone,
        addressLine: chosenAddress.addressLine,
        note: chosenAddress.note || '',
      }
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
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  📍 1. Địa chỉ nhận hàng
                </h2>
                {addresses.length > 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Đã lưu {addresses.length} địa chỉ trong danh bạ
                  </span>
                )}
              </div>
              {addresses.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                >
                  {showNewAddressForm ? '← Chọn địa chỉ đã lưu' : '+ Thêm địa chỉ mới'}
                </button>
              )}
            </div>

            {!showNewAddressForm && addresses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr._id
                  return (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      style={{
                        padding: 14,
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--primary-light)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <input
                          type="radio"
                          name="deliveryAddress"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr._id)}
                          style={{ marginTop: 4 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {addr.recipientName} • <span style={{ color: 'var(--text-muted)' }}>{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="badge badge-confirmed" style={{ marginLeft: 8 }}>
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 4 }}>
                            {addr.addressLine}
                          </div>
                          {addr.note && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Ghi chú: {addr.note}
                            </div>
                          )}

                          {/* Action links */}
                          <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(0,0,0,0.06)' }}>
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={(e) => handleSetDefaultAddress(e, addr._id)}
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--primary)',
                                  fontWeight: 600,
                                  background: 'none',
                                  padding: 0,
                                }}
                              >
                                ⭐ Đặt làm mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(e, addr._id)}
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--danger)',
                                fontWeight: 600,
                                background: 'none',
                                padding: 0,
                              }}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <form onSubmit={handleCreateAddress} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {addresses.length === 0 ? 'Bạn chưa có địa chỉ nào được lưu. Hãy nhập thông tin bên dưới:' : 'Nhập thông tin địa chỉ mới:'}
                </div>
                <div className="form-group">
                  <label className="form-label">Tên người nhận (*)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={newAddress.recipientName}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ (*)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Ví dụ: 0987654321"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ chi tiết (Số nhà, ngõ, đường, phường/xã) (*)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Số 25, Ngõ 10 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội"
                    value={newAddress.addressLine}
                    onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú giao hàng</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Gọi trước khi đến, gửi bảo vệ tầng 1"
                    value={newAddress.note}
                    onChange={(e) => setNewAddress({ ...newAddress, note: e.target.value })}
                  />
                </div>

                {/* Checkbox tự động lưu vào sổ địa chỉ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={saveToAddressBook}
                      onChange={(e) => setSaveToAddressBook(e.target.checked)}
                    />
                    <span>💾 <strong>Lưu vào danh bạ địa chỉ</strong> để tự động dùng cho các lần đặt sau</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    />
                    <span>⭐ Đặt làm địa chỉ mặc định ưu tiên</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="submit" className="btn btn-secondary btn-sm">
                    💾 Lưu vào sổ địa chỉ
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowNewAddressForm(false)}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
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
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 700 }}>
              📦 Tóm tắt đơn hàng ({cart.items.length} món)
            </h2>

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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phí vận chuyển:</span>
                <span>{shippingFee.toLocaleString('vi-VN')}đ</span>
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
                <span style={{ color: 'var(--primary)' }}>{totalPrice.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 24 }}
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
            >
              {isSubmitting ? 'Đang tạo đơn hàng...' : 'Xác nhận Đặt hàng ➔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout
