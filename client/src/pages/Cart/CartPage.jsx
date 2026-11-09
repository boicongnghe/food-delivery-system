import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, Store, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCart } from '../../context/useCart.js'
import useAuth from '../../hooks/useAuth.js'
import { cartLineKey } from '../../utils/cartLineKey.js'

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, subtotal, clearCart } = useCart()
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const handleGoToCheckout = () => {
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1117]">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4B2B] to-[#FF416C] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Giỏ hàng của bạn
              </h1>
              {cart.restaurant && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                  <Store className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{cart.restaurant.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {cart.items.length === 0 ? (
          <div className="text-center py-24 px-4 text-slate-400 dark:text-slate-500 space-y-4">
            <div className="w-24 h-24 rounded-3xl bg-orange-50 dark:bg-slate-800/80 text-primary flex items-center justify-center mx-auto text-4xl shadow-inner">
              🛒
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Giỏ hàng đang trống
            </h3>
            <p className="text-xs max-w-xs mx-auto text-slate-500 leading-relaxed">
              Bạn chưa chọn món nào. Khám phá menu món ngon phong phú ngay trên FoodDelivery nhé!
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:opacity-90 transition-opacity"
            >
              Khám phá món ăn
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Item List */}
            {cart.items.map((item) => {
              const lineKey = cartLineKey(item.food)
              return (
                <div
                  key={lineKey}
                  className="flex gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-orange-200 dark:hover:border-slate-700"
                >
                  <img
                    src={
                      item.food.image ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'
                    }
                    alt={item.food.name}
                    className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-sm"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.food.name}
                      </h4>
                      {item.food?.selectedToppings?.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          Topping: {item.food.selectedToppings.map((t) => `${t.name}${t.quantity > 1 ? ` x${t.quantity}` : ''}`).join(', ')}
                        </p>
                      )}
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
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(lineKey, -1)}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Giảm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-bold text-sm text-slate-800 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(lineKey, 1)}
                          className="w-7 h-7 rounded-lg text-primary hover:bg-orange-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Tăng"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(lineKey)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Summary Card */}
            <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              {/* Price */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Tạm tính tiền món:</span>
                  <span className="font-semibold">{subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Tổng thanh toán:</span>
                  <span className="text-primary text-lg">
                    {subtotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Checkout */}
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
                className="w-full text-center text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors py-1 cursor-pointer"
              >
                Xóa toàn bộ giỏ hàng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

