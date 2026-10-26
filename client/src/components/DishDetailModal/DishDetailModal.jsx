import { useState } from 'react'
import { X, Star, Clock, MapPin, Plus, Minus, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DishDetailModal({ dish, onClose, onOrderSuccess }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState(() => dish?.options?.sizes?.[0] || null)
  const [selectedToppings, setSelectedToppings] = useState([])
  const [note, setNote] = useState('')
  const [ordering, setOrdering] = useState(false)

  if (!dish) return null

  const handleToppingToggle = (topping) => {
    if (selectedToppings.some((t) => t.name === topping.name)) {
      setSelectedToppings(selectedToppings.filter((t) => t.name !== topping.name))
    } else {
      setSelectedToppings([...selectedToppings, topping])
    }
  }

  const basePrice = dish.price + (selectedSize ? selectedSize.extra : 0)
  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0)
  const totalPrice = (basePrice + toppingsPrice) * quantity

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  const handleConfirmOrder = () => {
    setOrdering(true)
    setTimeout(() => {
      setOrdering(false)
      if (onOrderSuccess) {
        onOrderSuccess({
          dish,
          quantity,
          selectedSize,
          selectedToppings,
          totalPrice,
          note,
        })
      }
      onClose()
    }, 200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative border border-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-105"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1">
          {/* Dish Hero Image Banner */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-100">
            <img
              src={dish.image}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent"></div>
            
            {/* Tag Badge */}
            {dish.tag && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-md">
                🔥 {dish.tag}
              </span>
            )}

            {/* Quick Meta on Banner */}
            <div className="absolute bottom-4 left-4 right-4 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200 block">{dish.restaurant}</span>
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
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600 pb-4 border-b border-slate-100">
              <span className="inline-flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-2.5 py-1 rounded-lg">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {dish.rating} ({dish.reviewsCount} đánh giá)
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {dish.deliveryTime}
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {dish.distance}
              </span>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-1.5">Mô tả món ăn</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{dish.description}</p>
            </div>

            {/* Ingredients */}
            {dish.ingredients && dish.ingredients.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-2">Thành phần chính</h4>
                <div className="flex flex-wrap gap-2">
                  {dish.ingredients.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
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
                <h4 className="text-sm font-bold text-slate-800 mb-2">Chọn kích cỡ phần ăn</h4>
                <div className="grid grid-cols-2 gap-3">
                  {dish.options.sizes.map((size, idx) => {
                    const isSelected = selectedSize?.name === size.name
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-slate-900 shadow-sm ring-1 ring-primary'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold">{size.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {size.extra > 0 ? `+${formatPrice(size.extra)}` : 'Giá chuẩn'}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-primary bg-primary' : 'border-slate-300'
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
                <h4 className="text-sm font-bold text-slate-800 mb-2">Món ăn kèm & Topping thêm</h4>
                <div className="space-y-2">
                  {dish.options.toppings.map((topping, idx) => {
                    const isChecked = selectedToppings.some((t) => t.name === topping.name)
                    return (
                      <label
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-primary/60 bg-primary/5 text-slate-900'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToppingToggle(topping)}
                            className="rounded border-slate-300 text-primary focus:ring-primary/20 w-4 h-4"
                          />
                          <span className="text-xs font-semibold">{topping.name}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">+{formatPrice(topping.price)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Note for restaurant */}
            <div>
              <label htmlFor="dish-note" className="block text-sm font-bold text-slate-800 mb-1.5">
                Ghi chú cho quán (nếu có)
              </label>
              <input
                id="dish-note"
                type="text"
                placeholder="Ví dụ: Ít cay, không hành, để riêng nước chấm..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer: Quantity & Confirm button */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <span className="text-xs font-bold text-slate-600 sm:hidden">Số lượng:</span>
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                disabled={quantity <= 1}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Giảm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-extrabold text-slate-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Tăng"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Button with Total Price */}
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={ordering}
            className="w-full sm:w-auto sm:min-w-[260px] py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] transition-all flex items-center justify-between gap-4 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {ordering ? 'Đang thêm vào giỏ...' : 'Thêm vào giỏ hàng'}
            </span>
            <span className="text-amber-200 font-extrabold">{formatPrice(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
