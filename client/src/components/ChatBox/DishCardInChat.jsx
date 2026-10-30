import { Plus, Check } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../../context/CartContext.jsx'
import toast from 'react-hot-toast'

export default function DishCardInChat({ dish }) {
  const { addToCart } = useCart() || {}
  const [added, setAdded] = useState(false)

  if (!dish) return null

  const formatPrice = (price) => {
    const num = Number(price) || 0
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
  }

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!addToCart) return

    addToCart(dish, 1)
    setAdded(true)
    toast.success(`Đã thêm ${dish.name} vào giỏ!`, {
      icon: '🛒',
      duration: 2200,
    })

    setTimeout(() => {
      setAdded(false)
    }, 1800)
  }

  const restaurantName =
    typeof dish.restaurant === 'string'
      ? dish.restaurant
      : dish.restaurant?.name || 'Quán Đối Tác'

  return (
    <div className="group relative flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-[#1A1D24] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-primary/40 transition-all text-left">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Dish Thumbnail */}
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'
            }}
          />
        </div>

        {/* Dish Info */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 truncate">
            {restaurantName}
          </p>
          <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">
            {dish.name}
          </h5>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-black text-primary">
              {formatPrice(dish.price)}
            </span>
            {dish.originalPrice && dish.originalPrice > dish.price && (
              <span className="text-[10px] line-through text-slate-400">
                {formatPrice(dish.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={added}
        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 ${
          added
            ? 'bg-emerald-500 text-white scale-105'
            : 'bg-orange-50 dark:bg-primary/10 hover:bg-primary text-primary hover:text-white dark:text-orange-400 dark:hover:text-white border border-orange-200/80 dark:border-primary/20'
        }`}
        title="Thêm nhanh vào giỏ"
      >
        {added ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Đã thêm</span>
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </>
        )}
      </button>
    </div>
  )
}

