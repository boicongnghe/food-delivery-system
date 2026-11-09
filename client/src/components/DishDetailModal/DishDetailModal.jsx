import { useState } from 'react'
import { X, Star, Clock, MapPin, Plus, Minus, ShoppingBag, Zap } from 'lucide-react'

export default function DishDetailModal({
  dish,
  onClose,
  onOrderSuccess,
  isRestaurantClosed = false,
  openingHoursText = '',
}) {
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState(() => dish?.options?.sizes?.[0] || null)
  const [selectedToppings, setSelectedToppings] = useState([])
  const [note, setNote] = useState('')
  const [orderingMode, setOrderingMode] = useState(null)

  if (!dish) return null

  const handleToppingToggle = (topping) => {
    const stock = topping.stock !== undefined ? topping.stock : 50
    if (stock <= 0) return

    const existing = selectedToppings.find((t) => t.name === topping.name)
    if (existing) {
      setSelectedToppings(selectedToppings.filter((t) => t.name !== topping.name))
    } else {
      setSelectedToppings([...selectedToppings, { ...topping, quantity: 1 }])
    }
  }

  const handleToppingQuantityChange = (toppingName, delta) => {
    setSelectedToppings((prev) => {
      const target = prev.find((t) => t.name === toppingName)
      if (!target) return prev

      const currentQty = target.quantity || 1
      const newQty = currentQty + delta

      if (newQty <= 0) {
        return prev.filter((t) => t.name !== toppingName)
      }

      const stock = target.stock !== undefined ? target.stock : 50
      if (delta > 0 && currentQty >= stock) {
        return prev // Cannot exceed available stock
      }

      return prev.map((t) => (t.name === toppingName ? { ...t, quantity: newQty } : t))
    })
  }

  const basePrice = dish.price + (selectedSize ? selectedSize.extra : 0)
  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price * (t.quantity || 1), 0)
  const totalPrice = (basePrice + toppingsPrice) * quantity

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  const handleConfirmOrder = (mode = 'cart') => {
    setOrderingMode(mode)
    setTimeout(() => {
      setOrderingMode(null)
      if (onOrderSuccess) {
        onOrderSuccess({
          dish,
          quantity,
          selectedSize,
          selectedToppings,
          totalPrice,
          note,
          isBuyNow: mode === 'buy_now',
        })
      }
      onClose()
    }, 200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#181A20] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center transition-all hover:scale-105 border border-slate-200/50 dark:border-slate-700"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1">
          {/* Dish Hero Image Banner */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={dish.image}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
            
            {/* Tag Badge */}
            {dish.tag && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-md">
                🔥 {dish.tag}
              </span>
            )}

            {/* Quick Meta on Banner */}
            <div className="absolute bottom-4 left-4 right-4 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-300 block">{dish.restaurant}</span>
                <h3 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-sm">{dish.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-300 drop-shadow-sm">
                  {formatPrice(dish.price)}
                </span>
                {dish.originalPrice && (
                  <span className="text-xs line-through text-slate-300 block">
                    {formatPrice(dish.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content info */}
          <div className="p-6 space-y-6">
            {/* Meta Tags Bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {dish.rating} ({dish.reviewsCount} đánh giá)
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/60">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {dish.deliveryTime}
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/60">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {dish.distance}
              </span>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1.5">Mô tả món ăn</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{dish.description}</p>
            </div>

            {/* Ingredients */}
            {dish.ingredients && dish.ingredients.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Thành phần chính</h4>
                <div className="flex flex-wrap gap-2">
                  {dish.ingredients.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200/50 dark:border-slate-700/60"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes Option */}
            {dish.options?.sizes && dish.options.sizes.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Chọn kích cỡ phần ăn</h4>
                <div className="grid grid-cols-2 gap-3">
                  {dish.options.sizes.map((size, idx) => {
                    const isSelected = selectedSize?.name === size.name
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-primary'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{size.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {size.extra > 0 ? `+${formatPrice(size.extra)}` : 'Giá chuẩn'}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Toppings Option */}
            {dish.options?.toppings && dish.options.toppings.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Món ăn kèm & Topping thêm</h4>
                <div className="space-y-2">
                  {dish.options.toppings.map((topping, idx) => {
                    const selected = selectedToppings.find((t) => t.name === topping.name)
                    const isChecked = Boolean(selected)
                    const toppingQty = selected?.quantity || 1
                    const stock = topping.stock !== undefined ? topping.stock : 50
                    const isOutOfStock = stock <= 0
                    const canIncrease = toppingQty < stock

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isOutOfStock
                            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-60'
                            : isChecked
                              ? 'border-primary/60 bg-primary/5 dark:bg-primary/10 text-slate-900 dark:text-white ring-1 ring-primary/40'
                              : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/40'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-3 flex-1 select-none ${
                            isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          onClick={() => !isOutOfStock && handleToppingToggle(topping)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isOutOfStock}
                            onChange={() => !isOutOfStock && handleToppingToggle(topping)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary/20 w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-xs font-semibold ${isOutOfStock ? 'line-through text-slate-400' : ''}`}>
                              {topping.name}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                Hết hàng
                              </span>
                            ) : stock <= 5 ? (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                Còn {stock} phần
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">
                                (kho: {stock})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isChecked && (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToppingQuantityChange(topping.name, -1)
                                }}
                                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Giảm topping"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-extrabold text-slate-900 dark:text-white">
                                {toppingQty}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToppingQuantityChange(topping.name, 1)
                                }}
                                disabled={!canIncrease}
                                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Tăng topping"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <div className="text-right min-w-[70px]">
                            <span className="text-xs font-bold text-primary block">
                              +{formatPrice(topping.price * toppingQty)}
                            </span>
                            {toppingQty > 1 && (
                              <span className="text-[10px] text-slate-400 block">
                                ({formatPrice(topping.price)}/suất)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Note for restaurant */}
            <div>
              <label htmlFor="dish-note" className="block text-sm font-bold text-slate-800 dark:text-white mb-1.5">
                Ghi chú cho quán (nếu có)
              </label>
              <input
                id="dish-note"
                type="text"
                placeholder="Ví dụ: Ít cay, không hành, để riêng nước chấm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/70 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Closed warning banner */}
        {isRestaurantClosed && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <span>⚠️ Quán hiện đang tạm đóng cửa ({openingHoursText || 'chưa đến giờ mở cửa'}). Quý khách vui lòng chọn món từ quán đang hoạt động.</span>
          </div>
        )}

        {/* Modal Footer: Quantity & 2 Action buttons (Add to cart & Buy now) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-[#121418] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Quantity Stepper & Mobile Price Overview */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                disabled={quantity <= 1 || isRestaurantClosed}
                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Giảm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-extrabold text-slate-900 dark:text-white">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                disabled={isRestaurantClosed}
                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tăng"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="sm:hidden text-right">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Tổng tiền</span>
              <span className="text-sm font-black text-primary">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {/* Action Buttons Group (Thêm vào giỏ & Đặt ngay) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Nút 1: Thêm vào giỏ hàng */}
            <button
              type="button"
              onClick={() => handleConfirmOrder('cart')}
              disabled={Boolean(orderingMode) || isRestaurantClosed}
              className={`flex-1 sm:flex-initial py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                isRestaurantClosed
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-primary hover:bg-orange-100 dark:hover:bg-orange-500/20 active:scale-[0.98]'
              }`}
              title="Thêm món này vào giỏ và tiếp tục dạo thực đơn"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>{orderingMode === 'cart' ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
            </button>

            {/* Nút 2: Đặt ngay (Mua ngay -> chuyển thẳng sang Checkout) */}
            <button
              type="button"
              onClick={() => handleConfirmOrder('buy_now')}
              disabled={Boolean(orderingMode) || isRestaurantClosed}
              className={`flex-1 sm:flex-initial py-3 px-5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-white shadow-lg cursor-pointer ${
                isRestaurantClosed
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-80 shadow-none'
                  : 'bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] hover:opacity-95 shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98]'
              }`}
              title="Thêm món và chuyển ngay đến màn hình thanh toán"
            >
              <Zap className="w-4 h-4 shrink-0 fill-amber-300 text-amber-300" />
              <span>{orderingMode === 'buy_now' ? 'Đang chuyển...' : 'Đặt ngay'}</span>
              <span className="hidden sm:inline font-extrabold text-amber-200 text-xs">
                • {formatPrice(totalPrice)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
