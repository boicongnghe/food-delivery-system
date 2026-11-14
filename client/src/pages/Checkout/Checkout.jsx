import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { addressApi } from '../../api/addressApi.js'
import { authApi } from '../../api/authApi.js'
import { foodApi } from '../../api/foodApi.js'
import { promotionApi } from '../../api/promotionApi.js'
import restaurantVoucherApi from '../../api/restaurantVoucherApi.js'
import { orderApi } from '../../api/orderApi.js'
import { useCart } from '../../context/useCart.js'
import useAuth from '../../hooks/useAuth.js'
import { cartLineKey } from '../../utils/cartLineKey.js'
import { confirmToast } from '../../utils/confirmToast.jsx'

const resolveRestaurantObjectId = async (cartRestaurant) => {
  let rId = cartRestaurant?.id || cartRestaurant?._id
  if (rId && /^[0-9a-fA-F]{24}$/.test(rId)) {
    return rId
  }
  const rName = (cartRestaurant?.name || '').trim().toLowerCase()
  if (!rName) return rId

  try {
    const res = await foodApi.getRestaurants()
    const list = res.data?.data || res.data || []
    const match = list.find((r) => (r.name || '').trim().toLowerCase() === rName)
    if (match?._id) {
      return match._id
    }
  } catch (err) {
    console.warn('Could not resolve restaurant ID from database:', err?.message)
  }
  return rId
}

function Checkout() {
  const { user, refreshUser } = useAuth()
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

  // Restaurant vouchers (funded by the restaurant): 1 per order, applied before the platform code
  const [restaurantVouchers, setRestaurantVouchers] = useState([])
  const [appliedRestaurantVoucher, setAppliedRestaurantVoucher] = useState(null) // { code, title, discountAmount }
  const [restaurantVoucherError, setRestaurantVoucherError] = useState('')
  const restaurantDiscount = appliedRestaurantVoucher?.discountAmount || 0
  // The server finds the restaurant from an id, a "res-..." slug or its name
  const cartRestaurantKey = /^[0-9a-fA-F]{24}$/.test(cart?.restaurant?.id || cart?.restaurant?._id || '')
    ? cart.restaurant.id || cart.restaurant._id
    : cart?.restaurant?.name || ''

  // Payment Method (UC15) - Bank Transfer or Virtual Wallet
  const [paymentMethod, setPaymentMethod] = useState('banking')

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Distance & Shipping states
  const [shippingFee, setShippingFee] = useState(15000)
  const [distanceKm, setDistanceKm] = useState(null)
  const [maxDistanceKm, setMaxDistanceKm] = useState(10)
  const [durationMinutes, setDurationMinutes] = useState(null)
  const [isDeliverable, setIsDeliverable] = useState(true)
  const [shippingError, setShippingError] = useState('')
  const [loadingShipping, setLoadingShipping] = useState(false)

  const totalPrice = Math.max(0, subtotal + shippingFee - restaurantDiscount - discountAmount)

  // Running vouchers of the restaurant in the cart
  useEffect(() => {
    if (!cartRestaurantKey) return
    restaurantVoucherApi
      .getRunningVouchers(cartRestaurantKey)
      .then((response) => setRestaurantVouchers(response.data || []))
      .catch(() => setRestaurantVouchers([]))
  }, [cartRestaurantKey])

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
        if (addrRes.status === 'fulfilled') {
          const raw = addrRes.value?.data?.data || addrRes.value?.data || []
          addrs = Array.isArray(raw) ? raw : []
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
        if (promoRes.status === 'fulfilled') {
          const promoList = promoRes.value?.data?.data || promoRes.value?.data
          if (Array.isArray(promoList)) {
            setActivePromotions(promoList)
          }
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
      const restaurantId = await resolveRestaurantObjectId(cart?.restaurant)
      if (!restaurantId || !selectedAddressId || !/^[0-9a-fA-F]{24}$/.test(restaurantId)) return

      const chosenAddr = addresses.find((a) => a._id === selectedAddressId)
      const params = { restaurantId, addressId: selectedAddressId }
      
      const lowerAddr = (chosenAddr?.addressLine || '').toLowerCase()
      const isSouthAddr = /(hồ chí minh|tphcm|tp\.hcm|hcm|sài gòn)/i.test(lowerAddr)
      const isNorthCoord = chosenAddr?.location?.lat > 18.0
      if (chosenAddr?.location?.lat && chosenAddr?.location?.lng && !(isSouthAddr && isNorthCoord)) {
        params.lat = chosenAddr.location.lat
        params.lng = chosenAddr.location.lng
      }

      setLoadingShipping(true)
      try {
        const res = await orderApi.estimateShipping(params)
        const info = res.data?.data || res.data
        if (info) {
          setDistanceKm(info.distanceKm)
          if (info.maxDistanceKm) setMaxDistanceKm(info.maxDistanceKm)
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
      const created = res.data?.data || res.data
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
    if (!(await confirmToast('Bạn có chắc muốn xóa địa chỉ này khỏi danh bạ?', { confirmLabel: 'Xóa', danger: true }))) return
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

  // Handle Apply Promotion (UC14). The platform code is computed on what is left after the restaurant voucher.
  const handleApplyPromo = async (codeToApply = null, restaurantDiscountValue = restaurantDiscount) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase()
    if (!code) return
    setPromoError('')
    try {
      const res = await promotionApi.applyPromotion({ code, subtotal: subtotal - restaurantDiscountValue })
      const data = res.data?.data || res.data
      setDiscountAmount(data.discountAmount)
      setAppliedPromo(data.promotion)
      setPromoCodeInput(code)
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Mã khuyến mãi không hợp lệ')
      setAppliedPromo(null)
      setDiscountAmount(0)
    }
  }

  // Restaurant voucher: checked by the server with the customer's own usage, checked again on order creation
  const handleApplyRestaurantVoucher = async (code) => {
    setRestaurantVoucherError('')
    try {
      const response = await restaurantVoucherApi.applyVoucher({ restaurantId: cartRestaurantKey, code, subtotal })
      setAppliedRestaurantVoucher(response.data)
      if (appliedPromo) handleApplyPromo(appliedPromo.code, response.data.discountAmount)
    } catch (err) {
      setRestaurantVoucherError(err.response?.data?.message || 'Không áp dụng được mã của quán')
    }
  }

  const handleRemoveRestaurantVoucher = () => {
    setAppliedRestaurantVoucher(null)
    setRestaurantVoucherError('')
    if (appliedPromo) handleApplyPromo(appliedPromo.code, 0)
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
          `Khoảng cách giao hàng (${distanceKm} km) vượt quá bán kính phục vụ tối đa (${maxDistanceKm || 10} km). Vui lòng chọn địa chỉ khác gần hơn.`
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

      const orderRestaurantId = await resolveRestaurantObjectId(cart.restaurant)
      if (!orderRestaurantId || !/^[0-9a-fA-F]{24}$/.test(orderRestaurantId)) {
        toast.error('Không tìm thấy thông tin nhà hàng trong hệ thống. Vui lòng thử lại!')
        setIsSubmitting(false)
        return
      }

      if (paymentMethod === 'wallet' && (user?.walletBalance || 0) < totalPrice) {
        setErrorMsg(`Số dư ví không đủ để thanh toán (hiện có: ${(user?.walletBalance || 0).toLocaleString('vi-VN')}đ, cần: ${totalPrice.toLocaleString('vi-VN')}đ). Vui lòng nạp thêm tiền vào ví hoặc chọn hình thức VietQR.`)
        setIsSubmitting(false)
        return
      }

      // m3: Idempotency Key to protect against double orders from network latency/retry
      const idempotencyKey = `idemp_${user?._id || 'guest'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      const payload = {
        idempotencyKey,
        restaurantId: orderRestaurantId,
        items: cart.items.map((item) => ({
          menuItemId: item.food?._id || item.food?.id,
          name: item.food?.name || item.name,
          price: item.food?.price || item.price,
          image: item.food?.image || item.image || '',
          quantity: item.quantity,
          note: item.note || '',
          // Chosen size / toppings by group: the server prices them from the menu
          options: [
            ...(item.food?.selectedSize?.groupName
              ? [{ groupName: item.food.selectedSize.groupName, name: item.food.selectedSize.name, quantity: 1 }]
              : []),
            ...(item.food?.selectedToppings || [])
              .filter((topping) => topping.groupName)
              .map((topping) => ({
                groupName: topping.groupName,
                name: topping.name,
                quantity: Number(topping.quantity) || 1,
              })),
          ],
        })),
        deliveryAddress,
        paymentMethod,
        promotionCode: appliedPromo?.code || null,
        restaurantVoucherCode: appliedRestaurantVoucher?.code || null,
      }

      const res = await orderApi.createOrder(payload)
      const createdOrder = res.data?.data || res.data

      // Đánh dấu đơn đã đặt xong trước khi clear cart để tránh bị useEffect redirect về home
      isOrderPlaced.current = true
      clearCart()

      if (paymentMethod === 'wallet') {
        if (typeof refreshUser === 'function') refreshUser()
        window.dispatchEvent(new CustomEvent('wallet_updated', { detail: {} }))
        toast.success('Đặt hàng và thanh toán bằng ví ảo thành công! 🎉')
        navigate(`/orders/${createdOrder._id}`)
      } else {
        // Chuyển thẳng sang trang quét mã VietQR thanh toán
        navigate(`/payment-result?orderId=${createdOrder._id}&method=banking`)
      }
    } catch (err) {
      console.error('Order creation failed:', err)
      setErrorMsg(err.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] animate-fade-in pb-[60px]">
      <div className="mb-7">
        <Link to="/" className="text-slate-500 text-sm font-semibold">
          ← Quay lại chọn thêm món
        </Link>
        <h1 className="text-3xl font-extrabold mt-2 mb-0 mx-0">
          Xác nhận đặt hàng & Thanh toán
        </h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-500 rounded-xl font-semibold mb-6 py-3.5 px-5">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,_minmax(340px,_1fr))] gap-8 items-start">
        {/* Left Column: Delivery Address & Payment Method */}
        <div className="flex flex-col gap-6">
          {/* UC12: Enter / Select Delivery Address */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 m-0">
                  <span>📍</span> 1. Địa chỉ nhận hàng
                </h2>
                {addresses.length > 0 && (
                  <span className="text-sm text-slate-500">
                    Chọn địa chỉ giao hàng từ danh sách ({addresses.length} địa chỉ đã lưu)
                  </span>
                )}
              </div>
              <button
                type="button"
                className="justify-center border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500 text-sm rounded-xl flex items-center gap-1.5 py-2 px-4"
                onClick={handleOpenAddAddressModal}
              >
                <span>➕</span>
                <span>Thêm địa chỉ mới</span>
              </button>
            </div>

            {/* If addresses.length > 0: Show list of selectable addresses */}
            {addresses.length > 0 ? (
              <div className="flex flex-col gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr._id
                  return (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressId(addr._id)}
                      className={`cursor-pointer rounded-xl border-2 p-4 transition ${isSelected ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="radio"
                          name="deliveryAddress"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr._id)}
                          className="accent-orange-500 w-[18px] h-[18px] cursor-pointer mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-900">
                              {addr.recipientName}
                            </span>
                            <span className="text-slate-500 text-sm">
                              • {addr.phone}
                            </span>
                            {addr.isDefault && (
                              <span
                                className="bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-200 py-0.5 px-2"
                              >
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-slate-900 leading-[1.4] mt-1.5">
                            {addr.addressLine}
                          </div>
                          {addr.note && (
                            <div className="text-sm text-slate-500 mt-1">
                              💬 Ghi chú: {addr.note}
                            </div>
                          )}

                          {/* Action links */}
                          <div className="flex gap-4 border-t border-dashed border-slate-200 mt-2.5 pt-2">
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={(e) => handleSetDefaultAddress(e, addr._id)}
                                className="text-xs text-orange-500 font-semibold bg-transparent cursor-pointer p-0"
                              >
                                ⭐ Đặt làm mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(e, addr._id)}
                              className="text-xs text-red-500 font-semibold bg-transparent cursor-pointer p-0"
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
                className="text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 py-9 px-5"
              >
                <div className="text-[2.5rem] mb-2.5">📍</div>
                <h3 className="text-base font-bold text-slate-900 mt-0 mb-1.5 mx-0">
                  Bạn chưa có địa chỉ nhận hàng nào được lưu
                </h3>
                <p className="text-sm text-slate-500 max-w-[420px] mt-0 mb-[18px] mx-auto">
                  Vui lòng thêm địa chỉ nhận hàng của bạn để hoàn tất đơn hàng. Bạn có thể lưu lại để dùng cho các lần đặt sau.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 border transition disabled:cursor-not-allowed disabled:opacity-50 border-transparent bg-orange-500 text-white hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500 text-base font-bold rounded-full shadow-md py-3 px-7"
                  onClick={handleOpenAddAddressModal}
                >
                  + Thêm địa chỉ nhận hàng ngay
                </button>
              </div>
            )}
          </div>

          {/* UC15: Payment Method Selection */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="text-xl font-bold mt-0 mb-4 mx-0">
              💳 2. Phương thức thanh toán
            </h2>
            <div className="space-y-3">
              {/* Option 1: VietQR Banking */}
              <div
                onClick={() => setPaymentMethod('banking')}
                className={`flex items-center gap-3.5 border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'banking'
                    ? 'border-orange-500 bg-orange-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-extrabold shrink-0 ${
                    paymentMethod === 'banking' ? 'bg-orange-500' : 'border-2 border-slate-300 text-transparent'
                  }`}
                >
                  ✓
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">
                      Chuyển khoản Ngân hàng / Quét mã VietQR
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 text-xs">
                      Tiện lợi
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    Quét mã QR tự động qua ứng dụng ngân hàng hoặc Internet Banking
                  </div>
                </div>
              </div>

              {/* Option 2: Virtual Wallet */}
              <div
                onClick={() => setPaymentMethod('wallet')}
                className={`flex items-center gap-3.5 border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-extrabold shrink-0 ${
                    paymentMethod === 'wallet' ? 'bg-emerald-500' : 'border-2 border-slate-300 text-transparent'
                  }`}
                >
                  ✓
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">
                        Ví ảo FoodDelivery
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Số dư: {(user?.walletBalance || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    {(user?.walletBalance || 0) >= totalPrice ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
                        ✓ Đủ số dư
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-lg px-2 py-0.5">
                          Thiếu {(totalPrice - (user?.walletBalance || 0)).toLocaleString('vi-VN')}đ
                        </span>
                        <Link
                          to="/wallet"
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                        >
                          Nạp ví ngay ↗
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    Thanh toán tức thì bằng số dư ví ảo FoodDelivery, không cần mở app ngân hàng
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Promotion Rules */}
        <div className="flex flex-col gap-6">
          {/* Items Summary (UC13) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-xl font-bold m-0">
                📦 Tóm tắt đơn hàng ({cart.items.length} món)
              </h2>
              {cart.restaurant?.name && (
                <span className="text-sm font-bold text-orange-500 bg-[#fff0eb] border border-[#ffe0d6] rounded-xl py-1 px-2.5">
                  🏪 {cart.restaurant.name}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {cart.items.map((item) => (
                <div
                  key={cartLineKey(item.food)}
                  className="flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold">{item.quantity}x</span>{' '}
                    <span>{item.food.name}</span>
                    {item.food?.selectedToppings?.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        + Topping: {item.food.selectedToppings.map((t) => `${t.name}${t.quantity > 1 ? ` x${t.quantity}` : ''}`).join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold">
                    {(item.food.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>

            {/* UC14: Promotion Code Input & Suggestion Chips */}
            {restaurantVouchers.length > 0 && (
              <div className="border-t border-dashed border-slate-200 mb-4 pt-4">
                <label className="mb-1.5 block text-sm font-semibold text-slate-900">🏪 Voucher của quán (tối đa 1 mã quán / đơn)</label>
                <div className="flex flex-col gap-2">
                  {restaurantVouchers.map((voucher) => {
                    const isApplied = appliedRestaurantVoucher?.code === voucher.code
                    const isEligible = subtotal >= voucher.minOrderValue
                    return (
                      <div
                        key={voucher.code}
                        className={`flex items-center gap-2.5 rounded-lg py-2.5 px-3 ${isApplied ? 'border-2 border-emerald-500' : 'border border-dashed border-slate-200'} ${isApplied ? 'bg-emerald-50' : 'bg-transparent'} ${isEligible || isApplied ? 'opacity-100' : 'opacity-60'}`}
                      >
                        <span className="font-mono font-extrabold text-orange-500">{voucher.code}</span>
                        <span className="flex-1 text-sm">
                          <strong>{voucher.title}</strong>
                          <span className="block text-slate-500 text-xs">
                            {voucher.label}
                            {!isEligible && ' · chưa đủ đơn tối thiểu'}
                          </span>
                        </span>
                        {isApplied ? (
                          <button type="button" className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-red-500/20 bg-red-50 text-red-500 hover:bg-red-100" onClick={handleRemoveRestaurantVoucher}>
                            Bỏ mã
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500"
                            disabled={!isEligible}
                            onClick={() => handleApplyRestaurantVoucher(voucher.code)}
                          >
                            Áp dụng
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {restaurantVoucherError && (
                  <div className="text-red-500 text-sm mt-2">{restaurantVoucherError}</div>
                )}
                {appliedRestaurantVoucher && (
                  <div className="text-emerald-700 text-sm font-semibold mt-2">
                    ✓ Mã quán {appliedRestaurantVoucher.code}: giảm {restaurantDiscount.toLocaleString('vi-VN')}đ
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 mb-4 pt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">🎟️ Mã khuyến mãi của nền tảng (Voucher)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[0.95rem] text-slate-900 outline-none transition focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/25 uppercase"
                  placeholder="Nhập mã voucher..."
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  disabled={!!appliedPromo}
                />
                {appliedPromo ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-red-500/20 bg-red-50 text-red-500 hover:bg-red-100"
                    onClick={handleRemovePromo}
                  >
                    Bỏ mã
                  </button>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-3 py-1.5 text-sm border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500"
                    onClick={() => handleApplyPromo()}
                  >
                    Áp dụng
                  </button>
                )}
              </div>

              {promoError && (
                <div className="text-red-500 text-sm mb-2">
                  {promoError}
                </div>
              )}

              {appliedPromo && (
                <div className="bg-emerald-50 text-emerald-700 rounded-lg text-sm font-semibold py-2 px-3">
                  ✓ Đã áp dụng mã {appliedPromo.code}: Giảm {discountAmount.toLocaleString('vi-VN')}đ
                </div>
              )}

              {/* Suggestions: each voucher on its own line with full details */}
              {activePromotions.length > 0 && (
                <div className="mt-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Ticket size={15} className="text-orange-500" />
                      Gợi ý voucher ưu đãi ({activePromotions.length}):
                    </span>
                    <span className="text-xs text-slate-500">
                      Tối đa 1 mã nền tảng / đơn
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-0.5">
                    {activePromotions.map((p) => {
                      const isEligible = subtotal >= (p.minOrderValue || 0)
                      const isApplied = appliedPromo?.code === p.code
                      const missingAmount = Math.max(0, (p.minOrderValue || 0) - subtotal)

                      return (
                        <div
                          key={p.code}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
                            isApplied
                              ? 'border-orange-500 bg-[rgba(255,75,43,0.06)] ring-1 ring-orange-500'
                              : isEligible
                                ? 'border-slate-200 bg-slate-50'
                                : 'border-dashed border-slate-200 bg-[rgba(0,0,0,0.02)]'
                          }`}
                        >
                          {/* Left: Code badge + Full Info */}
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Voucher Code Badge */}
                            <div
                              className={`flex flex-col items-center justify-center rounded-md font-extrabold text-xs tracking-[0.5px] min-w-[84px] text-center shrink-0 py-[5px] px-2 ${isApplied ? 'bg-orange-500' : 'bg-[rgba(255,75,43,0.08)]'} ${isApplied ? 'text-white' : 'text-orange-500'} ${isApplied ? 'border-0' : 'border border-dashed border-orange-500'}`}
                            >
                              <span>{p.code}</span>
                              <span className="text-xs font-semibold opacity-90">
                                {p.discountType === 'percentage'
                                  ? `GIẢM ${p.discountValue}%`
                                  : `GIẢM ${Math.round(p.discountValue / 1000)}K`}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-slate-900 leading-[1.3] mb-0.5">
                                {p.title || `Giảm ${p.discountType === 'percentage' ? `${p.discountValue}%` : `${p.discountValue?.toLocaleString('vi-VN')}đ`}`}
                              </div>

                              <div className="text-xs text-slate-500 flex flex-wrap gap-y-1 gap-x-2 items-center leading-[1.3]">
                                <span>Đơn tối thiểu: <strong className="text-slate-900">{(p.minOrderValue || 0).toLocaleString('vi-VN')}đ</strong></span>
                                {p.maxDiscount && p.discountType === 'percentage' && (
                                  <span>• Tối đa: <strong>{p.maxDiscount.toLocaleString('vi-VN')}đ</strong></span>
                                )}
                                {p.endDate && (
                                  <span>• HSD: {new Date(p.endDate).toLocaleDateString('vi-VN')}</span>
                                )}
                              </div>

                              {/* Eligibility status */}
                              <div className="text-xs font-semibold mt-[3px]">
                                {isApplied ? (
                                  <span className="text-emerald-600 inline-flex items-center gap-[3px]">
                                    <Check size={13} /> Đang áp dụng cho đơn này
                                  </span>
                                ) : isEligible ? (
                                  <span className="text-emerald-600 inline-flex items-center gap-[3px]">
                                    <Check size={13} /> Đủ điều kiện áp dụng
                                  </span>
                                ) : (
                                  <span className="text-red-500 inline-flex items-center gap-[3px]">
                                    <AlertCircle size={13} /> Cần mua thêm {missingAmount.toLocaleString('vi-VN')}đ để dùng mã này
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Action button */}
                          <div className="shrink-0 pl-1.5">
                            {isApplied ? (
                              <button
                                type="button"
                                onClick={handleRemovePromo}
                                className="text-xs text-red-500 bg-transparent border border-red-500 rounded-md font-bold cursor-pointer transition py-[5px] px-3"
                              >
                                Bỏ mã
                              </button>
                            ) : isEligible ? (
                              <button
                                type="button"
                                onClick={() => handleApplyPromo(p.code)}
                                className="text-xs bg-orange-500 text-white border-0 rounded-md font-bold cursor-pointer shadow-[0_2px_6px_rgba(255,75,43,0.3)] transition py-1.5 px-3.5"
                              >
                                Áp dụng
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  toast.error(`Đơn hàng cần tối thiểu ${(p.minOrderValue || 0).toLocaleString('vi-VN')}đ để dùng mã ${p.code}`)
                                }}
                                className="text-xs bg-slate-50 text-slate-500 border border-slate-200 rounded-md font-semibold cursor-not-allowed opacity-80 py-[5px] px-2.5"
                                title={`Cần mua thêm ${missingAmount.toLocaleString('vi-VN')}đ`}
                              >
                                Chưa đủ ĐK
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bill Breakdown */}
            <div className="flex flex-col gap-2 border-t border-slate-200 text-base pt-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Tiền món:</span>
                <span>{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">
                  Phí vận chuyển {distanceKm != null ? `(${distanceKm} km${durationMinutes ? ` · ~${durationMinutes} phút` : ''})` : ''}:
                </span>
                <span className="font-semibold">
                  {loadingShipping ? 'Đang tính...' : `${shippingFee.toLocaleString('vi-VN')}đ`}
                </span>
              </div>
              {restaurantDiscount > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Voucher quán ({appliedRestaurantVoucher.code}):</span>
                  <span>-{restaurantDiscount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Voucher nền tảng:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-slate-200 text-xl font-extrabold mt-1.5 pt-3">
                <span>Tổng thanh toán:</span>
                <span className={`${!isDeliverable ? 'text-red-600' : 'text-orange-500'}`}>
                  {!isDeliverable ? 'Không thể giao' : `${totalPrice.toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            </div>

            {shippingError && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] text-red-600 text-sm font-semibold leading-[1.4] mt-3.5 py-3 px-3.5">
                ⚠️ {shippingError}
              </div>
            )}

            {paymentMethod === 'wallet' && (user?.walletBalance || 0) < totalPrice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium mt-3.5 flex items-center justify-between">
                <span>Số dư ví của bạn không đủ để thanh toán đơn hàng này.</span>
                <Link to="/wallet" target="_blank" className="font-bold text-emerald-700 hover:text-emerald-800 underline ml-2 shrink-0">
                  Nạp ví ngay ↗
                </Link>
              </div>
            )}

            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 rounded-xl px-7 py-3.5 text-[1.05rem] border-transparent bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:-translate-y-px hover:bg-orange-600 disabled:translate-y-0 disabled:bg-orange-500 w-full mt-5 ${
                paymentMethod === 'wallet' && (user?.walletBalance || 0) >= totalPrice
                  ? '!bg-gradient-to-r !from-emerald-500 !to-teal-500 hover:!from-emerald-600 hover:!to-teal-600 !shadow-emerald-500/25'
                  : ''
              } ${!isDeliverable || (paymentMethod === 'wallet' && (user?.walletBalance || 0) < totalPrice) ? '!bg-slate-400 cursor-not-allowed' : ''}`}
              disabled={isSubmitting || !isDeliverable || loadingShipping || (paymentMethod === 'wallet' && (user?.walletBalance || 0) < totalPrice)}
              onClick={handlePlaceOrder}
            >
              {isSubmitting
                ? 'Đang tạo đơn hàng...'
                : !isDeliverable
                ? 'Quá bán kính phục vụ'
                : paymentMethod === 'wallet' && (user?.walletBalance || 0) < totalPrice
                ? 'Số dư ví không đủ để thanh toán'
                : paymentMethod === 'wallet'
                ? 'Thanh toán bằng Ví & Đặt hàng ➔'
                : 'Xác nhận Đặt hàng ➔'}
            </button>
          </div>
        </div>
      </div>
      {/* Box / Modal Popup for adding new address */}
      {isAddressModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-[rgba(15,23,42,0.65)] backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddressModalOpen(false)
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-[520px] w-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] relative p-7"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 m-0">
                  📍 Thêm địa chỉ nhận hàng mới
                </h3>
                <p className="text-sm text-slate-500 mt-1 mb-0 mx-0">
                  Nhập thông tin bên dưới và bấm Lưu để chọn địa chỉ này
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg text-slate-500 cursor-pointer border-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewAddress} className="flex flex-col gap-4">
              <div className="mb-0">
                <label className="block text-slate-900 font-bold text-sm mb-1.5">
                  Tên người nhận (*)
                </label>
                <input
                  type="text"
                  className="bg-white text-[0.95rem] text-slate-900 outline-none transition focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/25 w-full rounded-xl border border-slate-300 py-2.5 px-3.5"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={newAddressForm.recipientName}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, recipientName: e.target.value })}
                  required
                />
              </div>

              <div className="mb-0">
                <label className="block text-slate-900 font-bold text-sm mb-1.5">
                  Số điện thoại liên hệ (*)
                </label>
                <input
                  type="tel"
                  className="bg-white text-[0.95rem] text-slate-900 outline-none transition focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/25 w-full rounded-xl border border-slate-300 py-2.5 px-3.5"
                  placeholder="Ví dụ: 0987654321"
                  value={newAddressForm.phone}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-900 font-bold text-sm m-0">
                    Địa chỉ chi tiết (*)
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className={`bg-blue-50 text-blue-600 border border-[#bfdbfe] rounded-lg text-xs font-semibold inline-flex items-center gap-1 py-1 px-2.5 ${isLocating ? 'cursor-wait' : 'cursor-pointer'}`}
                  >
                    <span>{isLocating ? '⏳' : '📍'}</span>
                    <span>{isLocating ? 'Đang định vị GPS...' : 'Lấy vị trí GPS hiện tại'}</span>
                  </button>
                </div>
                <textarea
                  className="bg-white text-[0.95rem] text-slate-900 outline-none transition focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/25 w-full rounded-xl border border-slate-300 resize-y py-2.5 px-3.5"
                  rows={3}
                  placeholder="Ví dụ: Số 25, Ngõ 10 Tạ Quang Bửu, Phường Bách Khoa, Quận Hai Bà Trưng, Hà Nội"
                  value={newAddressForm.addressLine}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewAddressForm((prev) => ({
                      ...prev,
                      addressLine: val,
                      // Nếu người dùng chủ động gõ/sửa lại text địa chỉ, reset GPS thiết bị để hệ thống định vị đúng theo địa chỉ mới gõ
                      location: null,
                    }))
                  }}
                  required
                />
                {newAddressForm.location ? (
                  <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg p-2 mt-1.5">
                    <span className="flex items-center gap-1 font-medium">
                      <span>📍 Đã ghim GPS thiết bị:</span>
                      <span className="font-semibold">{newAddressForm.location.lat.toFixed(4)}, {newAddressForm.location.lng.toFixed(4)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewAddressForm((prev) => ({ ...prev, location: null }))}
                      className="text-red-500 hover:text-red-700 underline font-semibold ml-2 cursor-pointer"
                    >
                      Bỏ ghim GPS
                    </button>
                  </div>
                ) : (
                  <p className="text-[0.75rem] text-slate-400 mt-1">
                    * Hệ thống sẽ tự động xác định tọa độ GPS và tính toán lộ trình theo địa chỉ bạn nhập.
                  </p>
                )}
              </div>

              <div className="mb-0">
                <label className="block text-slate-900 font-bold text-sm mb-1.5">
                  Ghi chú cho tài xế giao hàng
                </label>
                <input
                  type="text"
                  className="bg-white text-[0.95rem] text-slate-900 outline-none transition focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/25 w-full rounded-xl border border-slate-300 py-2.5 px-3.5"
                  placeholder="Ví dụ: Gọi trước khi đến, gửi bảo vệ tầng 1"
                  value={newAddressForm.note}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, note: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={newAddressForm.isDefault}
                  onChange={(e) => setNewAddressForm({ ...newAddressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="font-semibold text-slate-700">⭐ Đặt làm địa chỉ mặc định ưu tiên</span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end mt-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-slate-50 text-slate-600 font-semibold text-sm cursor-pointer py-2.5 px-5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className={`rounded-xl border-0 bg-orange-500 text-white font-bold text-sm shadow-[0_4px_6px_-1px_rgba(249,115,22,0.3)] py-2.5 px-6 ${savingAddress ? 'cursor-not-allowed' : 'cursor-pointer'} ${savingAddress ? 'opacity-70' : 'opacity-100'}`}
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
