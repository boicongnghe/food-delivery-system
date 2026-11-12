import { useEffect, useState } from 'react'
import {
  X,
  Star,
  Clock,
  MapPin,
  Plus,
  Minus,
  ShoppingBag,
  Zap,
  ShieldCheck,
  MessageSquare,
  Lock,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import foodApi from '../../api/foodApi.js'
import useAuth from '../../hooks/useAuth.js'
import StarRating from '../StarRating/StarRating.jsx'

export default function DishDetailModal({
  dish,
  onClose,
  onOrderSuccess,
  isRestaurantClosed = false,
  openingHoursText = '',
}) {
  const { user, isAuthenticated } = useAuth() || {}
  const dishId = dish?._id || dish?.id

  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState(() => dish?.options?.sizes?.[0] || null)
  const [selectedToppings, setSelectedToppings] = useState([])
  const [note, setNote] = useState('')
  const [orderingMode, setOrderingMode] = useState(null)

  // Shopee-style reviews state
  const [reviewsData, setReviewsData] = useState({
    stats: {
      average: dish?.rating || 5,
      total: dish?.reviewsCount || 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      withComment: 0,
    },
    reviews: [],
    pagination: { page: 1, limit: 8, totalPages: 1, totalItems: 0 },
  })
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [ratingFilter, setRatingFilter] = useState('all') // 'all', 5, 4, 3, 2, 1
  const [commentOnly, setCommentOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Verified buyer review status
  const [reviewStatus, setReviewStatus] = useState({
    hasPurchased: false,
    canReview: false,
    alreadyReviewed: false,
    reviewableOrder: null,
    existingReview: null,
  })
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [myRating, setMyRating] = useState(5)
  const [myComment, setMyComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Fetch reviews for this dish
  useEffect(() => {
    if (!dishId) return
    let isMounted = true

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true)
        const params = {
          page: currentPage,
          limit: 8,
          ...(ratingFilter !== 'all' && { rating: ratingFilter }),
          ...(commentOnly && { hasComment: true }),
        }
        const res = await foodApi.getFoodReviews(dishId, params)
        if (isMounted && res.data) {
          if (currentPage === 1) {
            setReviewsData(res.data)
          } else {
            setReviewsData((prev) => ({
              ...res.data,
              reviews: [...prev.reviews, ...res.data.reviews],
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load dish reviews:', err)
      } finally {
        if (isMounted) setReviewsLoading(false)
      }
    }

    fetchReviews()
    return () => {
      isMounted = false
    }
  }, [dishId, ratingFilter, commentOnly, currentPage])

  // Fetch verified buyer eligibility
  useEffect(() => {
    if (!dishId || !isAuthenticated || user?.role !== 'customer') {
      setReviewStatus({
        hasPurchased: false,
        canReview: false,
        alreadyReviewed: false,
        reviewableOrder: null,
        existingReview: null,
      })
      return
    }

    let isMounted = true
    const checkStatus = async () => {
      try {
        const res = await foodApi.getMyDishReviewStatus(dishId)
        if (isMounted && res.data) {
          setReviewStatus(res.data)
        }
      } catch (err) {
        console.error('Failed to check dish review eligibility:', err)
      }
    }
    checkStatus()
    return () => {
      isMounted = false
    }
  }, [dishId, isAuthenticated, user?.role])

  const handleSubmitDishReview = async (e) => {
    e.preventDefault()
    if (!myRating) {
      toast.error('Vui lòng chọn số sao đánh giá!')
      return
    }
    setSubmittingReview(true)
    try {
      const res = await foodApi.createDishReview(dishId, {
        rating: myRating,
        comment: myComment.trim(),
        orderId: reviewStatus.reviewableOrder?._id,
      })
      toast.success(res.message || 'Đã gửi đánh giá món ăn thành công!')
      setShowReviewForm(false)
      setMyComment('')
      setCurrentPage(1)
      const [newReviews, newStatus] = await Promise.all([
        foodApi.getFoodReviews(dishId, { page: 1, limit: 8 }),
        foodApi.getMyDishReviewStatus(dishId),
      ])
      if (newReviews.data) setReviewsData(newReviews.data)
      if (newStatus.data) setReviewStatus(newStatus.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không gửi được đánh giá')
    } finally {
      setSubmittingReview(false)
    }
  }

  const scrollToReviews = () => {
    const el = document.getElementById('shopee-dish-reviews-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

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
              <button
                type="button"
                onClick={scrollToReviews}
                className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                title="Bấm để xem đánh giá từ người mua"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {reviewsData.stats.average} ({reviewsData.stats.total} đánh giá)
              </button>
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

            {/* ================================================================
                SHOPEE-STYLE DISH REVIEWS & RATINGS SECTION
                ================================================================ */}
            <div id="shopee-dish-reviews-section" className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                    Đánh giá món ăn từ người mua
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    100% đánh giá từ khách hàng đã đặt & nhận món thành công
                  </p>
                </div>
              </div>

              {/* Shopee Overview Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col md:flex-row items-center gap-5">
                {/* Score & stars */}
                <div className="text-center md:text-left md:border-r md:border-amber-200/60 md:dark:border-amber-900/40 md:pr-6 shrink-0">
                  <div className="flex items-baseline justify-center md:justify-start gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">
                      {reviewsData.stats.average}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ 5</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-0.5 my-1">
                    <StarRating value={reviewsData.stats.average} size="sm" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {reviewsData.stats.total} lượt đánh giá
                  </p>
                </div>

                {/* Filter Pills (Shopee style) */}
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-center md:justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setRatingFilter('all')
                      setCurrentPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      ratingFilter === 'all' && !commentOnly
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    Tất cả ({reviewsData.stats.total})
                  </button>

                  {[5, 4, 3, 2, 1].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => {
                        setRatingFilter(stars)
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        ratingFilter === stars && !commentOnly
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {stars} Sao ({reviewsData.stats.breakdown?.[stars] || 0})
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setCommentOnly(!commentOnly)
                      setCurrentPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      commentOnly
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    Có bình luận ({reviewsData.stats.withComment || 0})
                  </button>
                </div>
              </div>

              {/* Verified Buyer Call-To-Action or Eligibility Badge */}
              <div className="rounded-2xl border transition-all overflow-hidden border-slate-200 dark:border-slate-800">
                {isAuthenticated && user?.role === 'customer' ? (
                  reviewStatus.canReview ? (
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl">🎉</span>
                          <div>
                            <p className="text-xs font-extrabold text-orange-900 dark:text-orange-300">
                              Bạn đã mua món này trong đơn #{reviewStatus.reviewableOrder?.orderCode}!
                            </p>
                            <p className="text-[11px] text-orange-700 dark:text-orange-400 mt-0.5">
                              Hãy chia sẻ cảm nhận thực tế về món ăn để giúp những người mua sau nhé.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(!showReviewForm)}
                          className="shrink-0 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          {showReviewForm ? 'Đóng lại' : '✍️ Viết đánh giá món'}
                        </button>
                      </div>

                      {/* Inline Review Form */}
                      {showReviewForm && (
                        <form
                          onSubmit={handleSubmitDishReview}
                          className="mt-4 pt-4 border-t border-orange-200/70 dark:border-orange-900/50 space-y-3"
                        >
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1.5">
                              Chất lượng món ăn:
                            </label>
                            <div className="flex items-center gap-3">
                              <StarRating value={myRating} onChange={(val) => setMyRating(val)} size="lg" />
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                {myRating === 5 && 'Tuyệt vời'}
                                {myRating === 4 && 'Hài lòng'}
                                {myRating === 3 && 'Bình thường'}
                                {myRating === 2 && 'Không hài lòng'}
                                {myRating === 1 && 'Rất tệ'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-white mb-1.5">
                              Nhận xét chi tiết (hương vị, độ tươi ngon, khẩu phần...):
                            </label>
                            <textarea
                              rows={3}
                              maxLength={500}
                              value={myComment}
                              onChange={(e) => setMyComment(e.target.value)}
                              placeholder="Món ăn có hợp khẩu vị bạn không? Hãy chia sẻ cảm nhận thực tế..."
                              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowReviewForm(false)}
                              disabled={submittingReview}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Hủy
                            </button>
                            <button
                              type="submit"
                              disabled={submittingReview}
                              className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 disabled:opacity-50"
                            >
                              {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : reviewStatus.alreadyReviewed ? (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bạn đã gửi đánh giá cho món ăn này. Cảm ơn bạn đã đóng góp đánh giá xác thực!</span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Chỉ khách hàng đã đặt và nhận món ăn này thành công mới có thể gửi đánh giá</span>
                    </div>
                  )
                ) : (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Đăng nhập để xem quyền đánh giá món ăn nếu bạn đã từng mua món này.</span>
                  </div>
                )}
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviewsLoading && reviewsData.reviews.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    Đang tải đánh giá món ăn...
                  </div>
                ) : reviewsData.reviews.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Chưa có đánh giá nào cho mục này
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hãy là người đầu tiên đặt món và chia sẻ trải nghiệm nhé!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewsData.reviews.map((rev, idx) => (
                      <div
                        key={rev._id || idx}
                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-2xs"
                      >
                        {/* Reviewer Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            {rev.customerAvatar ? (
                              <img
                                src={rev.customerAvatar}
                                alt={rev.customerName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                                {rev.customerName ? rev.customerName[0].toUpperCase() : 'U'}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                {rev.customerName}
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                  ✓ Đã mua hàng
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(rev.createdAt).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                          <div>
                            <StarRating value={rev.rating} size="sm" />
                          </div>
                        </div>

                        {/* Options purchased snapshot (Shopee style variation info) */}
                        {rev.optionsSummary && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg inline-block">
                            Phân loại: <span className="font-semibold text-slate-700 dark:text-slate-300">{rev.optionsSummary}</span>
                          </div>
                        )}

                        {/* Comment text */}
                        {rev.comment ? (
                          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                            {rev.comment}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Người mua không để lại nhận xét bằng lời.
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Pagination / Load more */}
                    {reviewsData.pagination.page < reviewsData.pagination.totalPages && (
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          disabled={reviewsLoading}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-primary/50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {reviewsLoading ? 'Đang tải...' : 'Xem thêm đánh giá ➔'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
