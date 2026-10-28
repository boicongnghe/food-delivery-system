import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag, Store, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext.jsx'
import useAuth from '../hooks/useAuth.js'

function CartDrawer({ isOpen, onClose }) {
  const { cart, updateQuantity, removeFromCart, subtotal, clearCart } = useCart()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0)

  if (!isOpen) return null

  const handleApplyVoucher = (e) => {
    e.preventDefault()
    const code = voucherCode.trim().toUpperCase()
    if (!code) return

    if (code === 'FREESHIP15K') {
      setAppliedDiscount(15000)
      toast.success('Đã áp dụng mã miễn phí giao hàng 15.000đ! 🎉')
    } else if (code === 'CRAVEDASH50') {
      const discount = Math.min(Math.round(subtotal * 0.2), 50000)
      setAppliedDiscount(discount)
      toast.success(`Đã áp dụng mã giảm giá ${discount.toLocaleString('vi-VN')}đ! 🎉`)
    } else {
      toast.error('Mã giảm giá không hợp lệ hoặc đã hết lượt dùng.')
    }
  }

  const finalTotal = Math.max(0, subtotal - appliedDiscount)

  const handleGoToCheckout = () => {
    onClose()
    if (!isAuthenticated) {
      toast('Vui lòng đăng nhập với tài khoản khách hàng để hoàn tất đơn hàng', { icon: '🔑' })
      navigate('/login')
      return
    }
    if (user?.role !== 'customer') {
      toast.error('Chỉ tài khoản Khách hàng mới có thể đặt hàng.')
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-[#181A20] shadow-2xl flex flex-col border-l border-slate-100 dark:border-slate-800 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Giỏ hàng của bạn
                </h2>
                {cart.restaurant && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate max-w-[210px]">
                    <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{cart.restaurant.name}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              aria-label="Đóng giỏ hàng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {cart.items.length === 0 ? (
              <div className="text-center py-20 px-4 text-slate-400 dark:text-slate-500 space-y-3">
                <div className="w-20 h-20 rounded-3xl bg-orange-50 dark:bg-slate-800/80 text-primary flex items-center justify-center mx-auto text-3xl shadow-inner">
                  🛒
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Giỏ hàng đang trống
                </h3>
                <p className="text-xs max-w-xs mx-auto text-slate-500 leading-relaxed">
                  Bạn chưa chọn món nào. Khám phá menu món ngon phong phú ngay trên CraveDash nhé!
                </p>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.food._id || item.food.id}
                  className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-all hover:border-orange-200 dark:hover:border-slate-700"
                >
                  <img
                    src={
                      item.food.image ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'
                    }
                    alt={item.food.name}
                    className="w-18 h-18 rounded-2xl object-cover shrink-0 shadow-xs"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.food.name}
                      </h4>
                      <p className="text-primary font-black text-sm mt-0.5">
                        {(item.food.price * item.quantity).toLocaleString('vi-VN')} đ
                      </p>
                      {item.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                          Ghi chú: {item.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.food._id || item.food.id, -1)}
                          className="w-6 h-6 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
                          aria-label="Giảm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-xs text-slate-800 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.food._id || item.food.id, 1)}
                          className="w-6 h-6 rounded-lg text-primary hover:bg-orange-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                          aria-label="Tăng"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.food._id || item.food.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Area */}
          {cart.items.length > 0 && (
            <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#181A20] space-y-4">
              {/* Promo Voucher Input */}
              <form onSubmit={handleApplyVoucher} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Mã voucher (FREESHIP15K)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-bold placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Áp dụng
                </button>
              </form>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Tạm tính tiền món:</span>
                  <span className="font-semibold">{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Mã giảm giá ưu đãi:</span>
                    <span>-{appliedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Tổng thanh toán:</span>
                  <span className="text-primary text-lg">
                    {finalTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleGoToCheckout}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Tiến hành Đặt hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={clearCart}
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors py-1"
              >
                Xóa toàn bộ giỏ hàng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CartDrawer
