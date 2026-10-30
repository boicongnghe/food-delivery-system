import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Search,
  Star,
  Clock,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Heart,
  Flame,
  Zap,
  Tag,
  ShieldCheck,
  Copy,
  Store,
  Percent,
  Timer,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import { useCart } from '../../context/CartContext.jsx'
import { CATEGORIES, DISHES } from '../../data/dishesData.js'
import { foodApi } from '../../api/foodApi.js'
import DishDetailModal from '../../components/DishDetailModal/DishDetailModal.jsx'

// Partner Restaurants Data Fallback
const DEFAULT_PARTNERS = [
  {
    id: 'res-1',
    name: 'Cơm Tấm Ba Ghiền - Sài Gòn',
    category: 'Cơm tấm sườn bì chả, Đặc sản Sài Gòn',
    rating: 4.9,
    reviewsCount: 1420,
    deliveryTime: '15-25 phút',
    distance: '1.2 km',
    badge: 'Chuẩn 5 Sao',
    badgeColor: 'bg-amber-500 text-white',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80',
    isKitchenActive: true,
    promo: 'Freeship đơn từ 100k',
    signatureDishes: ['Cơm tấm sườn bì chả', 'Canh khổ qua thịt'],
  },
  {
    id: 'res-2',
    name: 'Phở Thìn Lò Đúc Hà Nội',
    category: 'Phở bò tái lăn, Quẩy giòn gia truyền',
    rating: 4.8,
    reviewsCount: 980,
    deliveryTime: '20-30 phút',
    distance: '2.5 km',
    badge: 'Giao nhanh',
    badgeColor: 'bg-emerald-500 text-white',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80',
    isKitchenActive: true,
    promo: 'Giảm 25k đơn đầu',
    signatureDishes: ['Phở bò tái nạm gầu', 'Quẩy vàng giòn rụm'],
  },
  {
    id: 'res-3',
    name: 'The Grill Burger House',
    category: 'Burger Bò Úc nướng khói, Gà giòn sốt cay',
    rating: 4.9,
    reviewsCount: 750,
    deliveryTime: '15-20 phút',
    distance: '1.8 km',
    badge: 'Freeship',
    badgeColor: 'bg-blue-500 text-white',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=700&q=80',
    isKitchenActive: true,
    promo: 'Mua 1 tặng 1 Coca',
    signatureDishes: ['Burger Bò Double Cheese', 'Khoai lắc sốt BBQ'],
  },
  {
    id: 'res-4',
    name: 'The Alley & Tea House',
    category: 'Trà sữa đường đen Okinawa, Trà hoa quả',
    rating: 5.0,
    reviewsCount: 2150,
    deliveryTime: '10-20 phút',
    distance: '0.8 km',
    badge: 'Chuẩn 5 Sao',
    badgeColor: 'bg-amber-500 text-white',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80',
    isKitchenActive: true,
    promo: 'Tặng trân châu hoàng kim',
    signatureDishes: ['Trà sữa trân châu dẻo', 'Trà đào cam sả'],
  },
]

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const { addToCart, itemCount = 0, subtotal = 0 } = useCart() || {}
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect admin away from public homepage
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [priceFilter, setPriceFilter] = useState('all') // 'all' | 'under50' | '50to100' | 'over100'
  const [sortBy, setSortBy] = useState('popular') // 'popular' | 'rating' | 'priceAsc' | 'priceDesc'
  const [restaurantFilter, setRestaurantFilter] = useState('all') // 'all' | '5star' | 'fast' | 'freeship'
  const [apiDishes, setApiDishes] = useState([])
  const [apiPartners, setApiPartners] = useState([])
  const [favorites, setFavorites] = useState(new Set())

  // Modal State for Order - initialized with dish if user just logged in from dish selection
  const [activeDish, setActiveDish] = useState(() => location.state?.continueOrder || null)
  const welcomedRef = useRef(false)

  // 3D Tilt calculation state for Hero Showcase
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 })

  // Flash Deal Countdown Timer (State: Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({
    hours: 4,
    minutes: 48,
    seconds: 32,
  })

  // Synchronize URL search params (?q=...) with searchQuery
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    if (q !== null) {
      setSearchQuery(q)
    }
  }, [location.search])

  // Countdown Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 }
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return { hours: 6, minutes: 0, seconds: 0 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch foods from backend if available
  useEffect(() => {
    let isMounted = true
    const fetchFoods = async () => {
      try {
        const res = await foodApi.getFoods()
        const foods = res.data?.data || []
        if (isMounted && Array.isArray(foods) && foods.length > 0) {
          const mapped = foods.map((f, idx) => ({
            id: f._id || `food-${idx}`,
            _id: f._id,
            name: f.name,
            restaurant: f.restaurant?.name || 'Quán Ăn Ngon',
            restaurantId: f.restaurant?._id || f.restaurant,
            price: f.price,
            originalPrice: Math.round(f.price * 1.15),
            image:
              f.image ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
            category: f.category || (idx % 2 === 0 ? 'com-mi' : 'fast-food'),
            rating: f.rating || 4.8,
            reviewsCount: f.reviewsCount || 120,
            deliveryTime: f.deliveryTime || '15-25 phút',
            distance: f.distance || '1.5 km',
            tag: idx === 0 ? 'Bán chạy' : (f.tag || undefined),
            description: f.description || 'Món ngon chuẩn vị với nguyên liệu tươi sạch.',
          }))
          setApiDishes(mapped)
        }
      } catch (err) {
        console.warn('Backend foods not loaded, using fallback catalog:', err?.message)
      }
    }

    const fetchRestaurants = async () => {
      try {
        const res = await foodApi.getRestaurants()
        const restaurants = res.data?.data || []
        if (isMounted && Array.isArray(restaurants) && restaurants.length > 0) {
          const mappedPartners = restaurants.map((r, idx) => ({
            id: r._id || `res-${idx}`,
            name: r.name,
            category: r.description || 'Quán ăn đặc sản đối tác',
            rating: r.rating || 4.8,
            reviewsCount: 300 + idx * 80,
            deliveryTime: '15-25 phút',
            distance: `${(1.0 + idx * 0.4).toFixed(1)} km`,
            badge: idx % 2 === 0 ? 'Chuẩn 5 Sao' : 'Freeship',
            badgeColor: idx % 2 === 0 ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white',
            image:
              r.image ||
              DEFAULT_PARTNERS[idx % DEFAULT_PARTNERS.length]?.image ||
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80',
            isKitchenActive: true,
            promo: 'Freeship đơn từ 99k',
            signatureDishes: ['Món đặc sắc quán', 'Combo tiết kiệm'],
          }))
          setApiPartners(mappedPartners)
        }
      } catch (err) {
        console.warn('Backend restaurants not loaded, using fallback partners:', err?.message)
      }
    }

    fetchFoods()
    fetchRestaurants()
    return () => {
      isMounted = false
    }
  }, [])

  // Combine partner restaurants
  const allPartners = useMemo(() => {
    if (apiPartners.length > 0) {
      const apiNames = new Set(apiPartners.map((p) => p.name.toLowerCase()))
      const nonOverlapping = DEFAULT_PARTNERS.filter((p) => !apiNames.has(p.name.toLowerCase()))
      return [...apiPartners, ...nonOverlapping]
    }
    return DEFAULT_PARTNERS
  }, [apiPartners])

  // Filtered partner restaurants
  const filteredPartners = useMemo(() => {
    return allPartners.filter((p) => {
      if (restaurantFilter === '5star') return (p.rating || 0) >= 4.9 || p.badge === 'Chuẩn 5 Sao'
      if (restaurantFilter === 'fast') return (p.deliveryTime || '').includes('15') || p.badge === 'Giao nhanh'
      if (restaurantFilter === 'freeship') return p.badge === 'Freeship' || (p.promo || '').toLowerCase().includes('freeship')
      return true
    })
  }, [allPartners, restaurantFilter])

  // Combine dishes
  const allDishes = useMemo(() => {
    if (apiDishes.length > 0) {
      const apiNames = new Set(apiDishes.map((d) => d.name.toLowerCase()))
      const nonOverlappingStatic = DISHES.filter((d) => !apiNames.has(d.name.toLowerCase()))
      return [...apiDishes, ...nonOverlappingStatic]
    }
    return DISHES
  }, [apiDishes])

  // Handle welcome toast when returning from login
  useEffect(() => {
    if (
      location.state?.continueOrder &&
      isAuthenticated &&
      user?.role === 'customer' &&
      !welcomedRef.current
    ) {
      welcomedRef.current = true
      const dishToContinue = location.state.continueOrder
      toast.success(
        `Chào mừng ${user.fullName}! Tiếp tục đặt món "${dishToContinue.name}" nhé. 🎉`,
        { duration: 4500, icon: '🍽️' }
      )
      window.history.replaceState({}, document.title)
    }
  }, [location.state, isAuthenticated, user])

  // Filtered and sorted dishes
  const filteredDishes = useMemo(() => {
    return allDishes
      .filter((dish) => {
        // Category filter
        if (selectedCategory !== 'all' && dish.category !== selectedCategory) {
          return false
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim()
          const matchesName = dish.name.toLowerCase().includes(query)
          const matchesRestaurant = dish.restaurant?.toLowerCase().includes(query)
          const matchesDesc = dish.description?.toLowerCase().includes(query)
          if (!matchesName && !matchesRestaurant && !matchesDesc) {
            return false
          }
        }

        // Price filter
        if (priceFilter === 'under50' && dish.price >= 50000) return false
        if (priceFilter === '50to100' && (dish.price < 50000 || dish.price > 100000)) return false
        if (priceFilter === 'over100' && dish.price <= 100000) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
        if (sortBy === 'priceAsc') return a.price - b.price
        if (sortBy === 'priceDesc') return b.price - a.price
        return (b.reviewsCount || 0) - (a.reviewsCount || 0)
      })
  }, [allDishes, selectedCategory, searchQuery, priceFilter, sortBy])

  // Toggle Favorite
  const handleToggleFavorite = (e, dishId) => {
    e.stopPropagation()
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(dishId)) {
        next.delete(dishId)
        toast('Đã bỏ thích món ăn', { icon: '🤍' })
      } else {
        next.add(dishId)
        toast.success('Đã lưu vào danh sách món yêu thích! ❤️')
      }
      return next
    })
  }

  // Click on a dish item
  const handleDishClick = (dish) => {
    setActiveDish(dish)
  }

  // Quick Add to cart from dish or restaurant chips
  const handleQuickAddToCart = (e, dish) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập với vai trò Khách hàng để chọn món!', {
        icon: '🔒',
        duration: 3000,
      })
      navigate('/login')
      return
    }
    if (user?.role !== 'customer') {
      toast.error('Chỉ tài khoản Khách hàng mới có thể thêm món vào giỏ hàng!', {
        icon: '⚠️',
        duration: 3000,
      })
      return
    }
    addToCart(dish, 1, '')
    toast.success(`Đã thêm "${dish.name}" vào giỏ hàng!`, {
      icon: '🛒',
      duration: 2500,
    })
  }

  // Copy coupon helper
  const handleCopyCoupon = (code) => {
    navigator.clipboard?.writeText(code)
    toast.success(`Đã sao chép mã ưu đãi "${code}"! Áp dụng ngay khi thanh toán. 🎉`)
  }

  // Hero Parallax Tilt Handler
  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    setHeroTilt({
      x: (y / rect.height) * -18,
      y: (x / rect.width) * 18,
    })
  }

  const handleHeroMouseLeave = () => {
    setHeroTilt({ x: 0, y: 0 })
  }

  const formatPrice = (price) => {
    const num = Number(price) || 0
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
  }

  const QUICK_TAGS = ['🍚 Cơm tấm sườn', '🍜 Phở bò tái lăn', '🍔 Burger Bò Úc', '🧋 Trà sữa đường đen', '🍗 Gà rán giòn', '🥗 Món chay healthy']

  return (
    <div className="w-full pb-20 overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* ====================================================================
          1. TOP INFINITE PROMO MARQUEE
          ==================================================================== */}
      <div className="w-full bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FFB800] text-white py-2 px-4 overflow-hidden relative shadow-sm">
        <div className="animate-marquee flex items-center gap-8 text-xs sm:text-sm font-extrabold tracking-wide uppercase select-none">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
            Nhập mã <strong className="underline text-amber-200">FREESHIP15K</strong> Miễn phí ship toàn quốc
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-white" />
            Cam kết giao thần tốc 20 phút hoặc hoàn tiền 100%
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-200" />
            Tặng ngay voucher 50.000đ cho đơn hàng đầu tiên
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            1.200+ Nhà hàng đối tác đạt chuẩn vệ sinh an toàn thực phẩm
          </span>
          <span className="opacity-40">•</span>
          {/* Duplicate set for seamless continuous marquee loop */}
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
            Nhập mã <strong className="underline text-amber-200">FREESHIP15K</strong> Miễn phí ship toàn quốc
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-white" />
            Cam kết giao thần tốc 20 phút hoặc hoàn tiền 100%
          </span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-200" />
            Tặng ngay voucher 50.000đ cho đơn hàng đầu tiên
          </span>
          <span className="opacity-40">•</span>
        </div>
      </div>

      {/* Role Navigation Notice (For Restaurant Owner or Shipper viewing Homepage) */}
      {isAuthenticated && (user?.role === 'restaurant_owner' || user?.role === 'shipper') && (
        <div className="w-full bg-gradient-to-r from-amber-500 to-primary text-white py-2.5 px-4 sm:px-8">
          <div className="w-full flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-200" />
              Bạn đang xem Trang Chủ với tài khoản{' '}
              <strong className="underline">
                {user.role === 'restaurant_owner' ? 'Chủ Quán Ăn' : 'Tài Xế Giao Hàng'}
              </strong>
            </span>
            <Link
              to={user.role === 'restaurant_owner' ? '/restaurant' : '/shipper'}
              className="px-3.5 py-1 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors inline-flex items-center gap-1 shadow-sm"
            >
              Quay lại Bảng Quản Lý <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ====================================================================
          2. FULL-WIDTH HERO SECTION (2-COLUMNS + 3D MOTION SHOWCASE)
          ==================================================================== */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-[#181A20] to-[#25100B] text-white pt-10 sm:pt-16 pb-20 sm:pb-28 px-4 sm:px-8 lg:px-12 2xl:px-16">
        {/* Background Ambient Glow Orbs */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-32 w-[450px] h-[450px] rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center relative z-10">
          {/* CỘT TRÁI (7 CỘT): TIÊU ĐỀ + SEARCH + STATS */}
          <div className="lg:col-span-7 space-y-7">
            {/* Glowing Hero Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-xs sm:text-sm font-bold text-amber-300 shadow-lg shadow-orange-500/10">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary -ml-5" />
              <span>⚡ Giao siêu tốc 20 phút • Freeship toàn quốc</span>
            </div>

            {/* Main Headline with Animated Gradient Text */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-black tracking-tight leading-[1.12]">
              Thế giới món ngon <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FFB800] animate-gradient-text drop-shadow-sm">
                giao nóng hổi tận cửa!
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-2xl leading-relaxed">
              Hơn 1.200+ nhà hàng quán ăn hàng đầu, từ cơm tấm sườn nướng, phở bò truyền thống đến burger phô mai và trà sữa béo ngậy. Đặt món một chạm, giao nhanh trong 20 phút.
            </p>

            {/* Search & Location Bar inside Hero */}
            <div className="bg-white/95 dark:bg-[#181A20]/95 backdrop-blur-xl p-2 sm:p-2.5 rounded-3xl shadow-2xl border border-white/20 flex flex-col sm:flex-row items-center gap-2 max-w-2xl">
              <div className="flex items-center flex-1 w-full pl-3.5 pr-2 py-2">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Bạn đang thèm món gì? Tìm phở, trà sữa, cơm tấm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-semibold focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('menu-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#FF4B2B] hover:opacity-95 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Tìm món ngay</span>
              </button>
            </div>

            {/* Quick Suggestion Tags */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Gợi ý tìm kiếm nhanh:
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const clean = tag.replace(/^[^\s]+\s/, '')
                      setSearchQuery(clean)
                      document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all hover:scale-105 active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Columns Trust Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-white/10 max-w-xl text-slate-300">
              <div className="border-l-2 border-primary pl-3 sm:pl-4">
                <p className="text-2xl sm:text-3xl font-black text-white">1.200+</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Quán ăn đối tác</p>
              </div>
              <div className="border-l-2 border-amber-400 pl-3 sm:pl-4">
                <p className="text-2xl sm:text-3xl font-black text-white">15-20p</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Giao siêu tốc</p>
              </div>
              <div className="border-l-2 border-emerald-400 pl-3 sm:pl-4">
                <p className="text-2xl sm:text-3xl font-black text-white">99.8%</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Hài lòng 5 sao</p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5 CỘT): 3D PERSPECTIVE TILT SHOWCASE + STEAM + FLOATING CARDS */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div
              className="relative w-full max-w-lg perspective-container"
              onMouseMove={handleHeroMouseMove}
              onMouseLeave={handleHeroMouseLeave}
            >
              {/* Morphing Glowing Blob Underneath */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/40 via-red-500/30 to-amber-400/30 blur-3xl animate-morph-blob pointer-events-none" />

              {/* Orbiting Rings */}
              <div className="absolute inset-0 border-2 border-dashed border-orange-500/20 rounded-full animate-orbit pointer-events-none scale-125" />
              <div className="absolute inset-0 border border-amber-400/15 rounded-full animate-orbit-reverse pointer-events-none scale-110" />

              {/* 3 Rising Smoke / Steam Streams above Food */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 pointer-events-none z-30">
                <div className="w-2.5 h-16 bg-gradient-to-t from-white/70 via-white/35 to-transparent rounded-full blur-xs animate-steam-1" />
                <div className="w-3.5 h-20 bg-gradient-to-t from-white/80 via-white/45 to-transparent rounded-full blur-xs animate-steam-2" />
                <div className="w-2.5 h-14 bg-gradient-to-t from-white/60 via-white/25 to-transparent rounded-full blur-xs animate-steam-3" />
              </div>

              {/* Floating Card 1: Live Driver Beacon (Top Left) */}
              <div className="absolute -top-6 -left-6 z-20 animate-float-slow hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-[#181A20]/95 backdrop-blur-xl border border-white/30 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/30">
                    🛵
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-extrabold">
                    Tài xế đang tới
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    Cách bạn 400m (3 phút)
                  </p>
                </div>
              </div>

              {/* Floating Card 2: 50% Promo Voucher (Bottom Right) */}
              <div className="absolute -bottom-6 -right-6 z-20 animate-float-lag hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-[#181A20]/95 backdrop-blur-xl border border-white/30 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30">
                  🎁
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-orange-800 dark:text-orange-400 font-extrabold">
                    Ưu đãi độc quyền
                  </p>
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    Giảm 50% đơn đầu tiên
                  </p>
                </div>
              </div>

              {/* Floating Card 3: Fresh Ingredients Badge (Top Right) */}
              <div className="absolute top-6 -right-4 z-20 animate-float-slow hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white shadow-lg">
                <span>🧀 Phô mai • 🍅 Cà chua • 🌿 Húng quế</span>
              </div>

              {/* Main Dish Showcase Card with 3D Tilt */}
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-slate-900 group cursor-pointer transition-transform duration-200 preserve-3d"
                style={{
                  transform: `perspective(1000px) rotateX(${heroTilt.x}deg) rotateY(${heroTilt.y}deg)`,
                }}
                onClick={() => handleDishClick(allDishes[0])}
              >
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80"
                  alt="Món ăn đặc sắc"
                  className="w-full h-96 sm:h-[440px] object-cover group-hover:scale-108 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                {/* Card Bottom Info Overlay */}
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/95 dark:bg-[#181A20]/95 backdrop-blur-xl text-slate-900 dark:text-white shadow-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-100 text-primary border border-orange-200">
                      🔥 Bán chạy nhất hôm nay
                    </span>
                    <h3 className="text-sm sm:text-base font-black truncate max-w-[200px] sm:max-w-[240px] mt-1">
                      Cơm Tấm Sườn Bì Chả Ba Ghiền
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Đã bán 2.4k+ suất • 4.9 ★ (382 đánh giá)
                    </p>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white text-xs font-extrabold shadow-md shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all shrink-0"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. HỆ THỐNG NHÀ HÀNG ĐỐI TÁC NỔI BẬT (GRID 4 CỘT)
          ==================================================================== */}
      <section id="restaurants-section" className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 pt-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-primary text-xs font-bold mb-2">
              <Store className="w-3.5 h-3.5" />
              <span>Đối tác ẩm thực chọn lọc</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Quán Ăn Đối Tác Nổi Bật
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Khám phá thực đơn phong phú từ các thương hiệu ẩm thực danh tiếng gần bạn
            </p>
          </div>

          {/* Quick Restaurant Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: '5star', label: '★ Chuẩn 5 Sao' },
              { id: 'fast', label: '⚡ Giao nhanh' },
              { id: 'freeship', label: '🛵 Freeship' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRestaurantFilter(f.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  restaurantFilter === f.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Column Grid: Partner Restaurants */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="group relative bg-white dark:bg-[#16171E] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-black/50 hover:border-primary/40 dark:hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Image Cover Container */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={partner.image}
                    alt={partner.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=700&q=80'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Badge */}
                  <span
                    className={`absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[11px] font-extrabold shadow-md backdrop-blur-sm ${partner.badgeColor}`}
                  >
                    {partner.badge}
                  </span>

                  {/* Live Kitchen Status Dot */}
                  <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-emerald-400 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5" />
                    <span>Bếp đang nấu</span>
                  </span>

                  {/* Rating & Distance Meta */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                    <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-amber-300">
                      <Star className="w-3.5 h-3.5 fill-amber-300" />
                      {partner.rating} ({partner.reviewsCount})
                    </span>
                    <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-slate-200 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {partner.deliveryTime}
                    </span>
                  </div>
                </div>

                {/* Restaurant Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-1">
                      {partner.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {partner.category}
                    </p>
                  </div>

                  {/* Promo Tag */}
                  <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-amber-400 font-bold bg-orange-50 dark:bg-amber-500/10 p-2.5 rounded-xl border border-orange-200/60 dark:border-amber-500/20">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{partner.promo}</span>
                  </div>

                  {/* Signature Dishes List */}
                  {partner.signatureDishes && partner.signatureDishes.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Món bán chạy:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {partner.signatureDishes.map((dishName, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-transparent dark:border-white/[0.05]"
                          >
                            ✓ {dishName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all')
                    setPriceFilter('all')
                    const cleanQuery = partner.name.split('-')[0].trim()
                    setSearchQuery(cleanQuery)
                    toast.success(`Đang mở thực đơn: ${partner.name}`, { icon: '🍽️', duration: 2500 })
                    setTimeout(() => {
                      document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' })
                    }, 50)
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-primary dark:hover:bg-primary text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white border border-transparent dark:border-white/[0.08] dark:hover:border-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  <span>Xem thực đơn quán</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          4. THỰC ĐƠN MÓN NGON NỔI BẬT (GRID 4 CỘT)
          ==================================================================== */}
      <section id="menu-section" className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 pt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-primary text-xs font-bold mb-2">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Thực đơn chọn lọc</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Món Ngon Sẵn Sàng Giao Ngay
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tìm thấy <strong className="text-primary">{filteredDishes.length}</strong> món ăn thơm ngon chuẩn vị
            </p>
          </div>

          {/* Price & Sort Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="text-slate-400">Giá:</span>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-slate-900">Tất cả mức giá</option>
                <option value="under50" className="dark:bg-slate-900">Dưới 50.000 đ</option>
                <option value="50to100" className="dark:bg-slate-900">50.000 - 100.000 đ</option>
                <option value="over100" className="dark:bg-slate-900">Trên 100.000 đ</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="popular" className="dark:bg-slate-900">Phổ biến nhất</option>
                <option value="rating" className="dark:bg-slate-900">Đánh giá cao nhất</option>
                <option value="priceAsc" className="dark:bg-slate-900">Giá thấp đến cao</option>
                <option value="priceDesc" className="dark:bg-slate-900">Giá cao đến thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (Horizontal Scroll with Icon Zoom on Hover) */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-6 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`group flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shadow-xs cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white shadow-md shadow-orange-500/25 scale-[1.03]'
                    : 'bg-white dark:bg-[#181A20] text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span className="text-base group-hover:scale-125 transition-transform duration-200">
                  {cat.icon}
                </span>
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>

        {/* Dishes Grid (4 columns) */}
        {filteredDishes.length === 0 ? (
          <div className="bg-white dark:bg-[#181A20] rounded-3xl p-10 sm:p-14 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-950/60 text-primary flex items-center justify-center mx-auto text-3xl shadow-inner">
              🍲
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">Không tìm thấy món ăn phù hợp</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Không có món nào khớp với bộ lọc hoặc từ khóa {searchQuery ? `"${searchQuery}"` : ''}. Bạn hãy thử chọn gợi ý món hot bên dưới nhé!
              </p>
            </div>
            {/* Quick Suggestions to get out of empty state */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-400">Gợi ý món ngon:</span>
              {['🍚 Cơm tấm sườn', '🍜 Phở bò tái', '🧋 Trà sữa', '🍔 Burger Bò'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all')
                    setPriceFilter('all')
                    setSearchQuery(item.replace(/^[^\s]+\s/, ''))
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-primary border border-orange-200 dark:border-orange-800 hover:bg-primary hover:text-white transition-all cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all')
                  setSearchQuery('')
                  setPriceFilter('all')
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDishes.map((dish) => {
              const isFav = favorites.has(dish.id)
              return (
                <div
                  key={dish.id}
                  className="group bg-white dark:bg-[#181A20] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  onClick={() => handleDishClick(dish)}
                >
                  {/* Dish Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                    {/* Tag Badge */}
                    {dish.tag && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white text-[11px] font-extrabold shadow-md backdrop-blur-sm">
                        {dish.tag}
                      </span>
                    )}

                    {/* Heart Favorite Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, dish.id)}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${
                        isFav
                          ? 'bg-red-500 text-white animate-heart-pop shadow-md shadow-red-500/30'
                          : 'bg-black/50 text-white hover:bg-black/70'
                      }`}
                      aria-label="Thêm vào yêu thích"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
                    </button>

                    {/* Rating & Delivery Time Badge */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold">
                      <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-amber-300">
                        <Star className="w-3.5 h-3.5 fill-amber-300" />
                        {dish.rating || 4.8} ({dish.reviewsCount || 40})
                      </span>
                      <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        {dish.deliveryTime || '15-25 phút'}
                      </span>
                    </div>
                  </div>

                  {/* Content Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 block truncate">
                        {dish.restaurant}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                        {dish.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {dish.description}
                      </p>
                    </div>

                    {/* Price and Cart Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-base sm:text-lg font-black text-primary block leading-none">
                          {formatPrice(dish.price)}
                        </span>
                        {dish.originalPrice && (
                          <span className="text-xs line-through text-slate-400 font-medium">
                            {formatPrice(dish.originalPrice)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleQuickAddToCart(e, dish)}
                          className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 hover:bg-primary text-primary hover:text-white transition-all shadow-xs hover:scale-105 active:scale-95"
                          title="Thêm nhanh vào giỏ"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDishClick(dish)
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white font-extrabold text-xs shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          Chọn món
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ====================================================================
          5. BANNER FLASH DEAL ĐẾM NGƯỢC GIỜ VÀNG
          ==================================================================== */}
      <section id="deals-section" className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 mt-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#FF4B2B] via-[#FF416C] to-[#C83214] text-white p-6 sm:p-10 lg:p-14 shadow-2xl shadow-orange-500/20">
          {/* Ambient Glow Bubbles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider">
                <Flame className="w-4 h-4 text-amber-300 animate-bounce" />
                Flash Deal Đếm Ngược Giờ Vàng
              </span>

              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
                Giảm 50% & Miễn Phí Ship <br />
                <span className="text-amber-200">Cho Tất Cả Đơn Hàng Hôm Nay!</span>
              </h3>

              <p className="text-sm sm:text-base text-orange-100 max-w-xl leading-relaxed">
                Áp dụng cho hơn 500+ món ăn bán chạy nhất hệ thống. Đừng bỏ lỡ ưu đãi giới hạn thời gian!
              </p>

              {/* Countdown Digits */}
              <div className="flex items-center justify-center lg:justify-start gap-3 pt-2">
                <div className="flex flex-col items-center p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/20 min-w-[70px]">
                  <span className="text-2xl sm:text-3xl font-black">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase font-bold text-orange-200">Giờ</span>
                </div>
                <span className="text-2xl font-black">:</span>
                <div className="flex flex-col items-center p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/20 min-w-[70px]">
                  <span className="text-2xl sm:text-3xl font-black">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase font-bold text-orange-200">Phút</span>
                </div>
                <span className="text-2xl font-black">:</span>
                <div className="flex flex-col items-center p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/20 min-w-[70px]">
                  <span className="text-2xl sm:text-3xl font-black">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase font-bold text-orange-200">Giây</span>
                </div>
              </div>
            </div>

            {/* Promo Voucher Cards */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 w-full sm:w-auto">
              <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-xl flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Mã Freeship</p>
                  <p className="text-lg font-black text-primary">FREESHIP15K</p>
                  <span className="text-[11px] text-slate-500">Giảm 15k phí giao hàng</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon('FREESHIP15K')}
                  className="px-3.5 py-2 rounded-xl bg-orange-100 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white text-slate-900 shadow-xl flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Mã Giảm Giá 50k</p>
                  <p className="text-lg font-black text-orange-600">FOODDELIVERY50</p>
                  <span className="text-[11px] text-slate-500">Giảm tối đa 50k cho đơn 150k</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon('FOODDELIVERY50')}
                  className="px-3.5 py-2 rounded-xl bg-orange-100 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. DISH DETAIL / ORDER MODAL (PRESERVES SIZES & TOPPINGS)
          ==================================================================== */}
      {activeDish && (
        <DishDetailModal
          dish={activeDish}
          onClose={() => setActiveDish(null)}
          onOrderSuccess={(orderData) => {
            if (!isAuthenticated) {
              toast.error('Vui lòng đăng nhập với vai trò Khách hàng để chọn món!', {
                icon: '🔒',
                duration: 3000,
              })
              navigate('/login')
              return
            }
            if (user?.role !== 'customer') {
              toast.error('Chỉ tài khoản Khách hàng mới có thể thêm món vào giỏ hàng!', {
                icon: '⚠️',
                duration: 3000,
              })
              return
            }

            // Enrich customized food with size and toppings to preserve total price in Cart
            const customizedFood = {
              ...orderData.dish,
              id: `${orderData.dish.id || orderData.dish._id}-${orderData.selectedSize?.name || 'std'}-${(orderData.selectedToppings || []).map((t) => t.name).join('-')}`,
              name: orderData.selectedSize?.name
                ? `${orderData.dish.name} (${orderData.selectedSize.name})`
                : orderData.dish.name,
              price: Math.round(orderData.totalPrice / (orderData.quantity || 1)),
              selectedSize: orderData.selectedSize,
              selectedToppings: orderData.selectedToppings,
            }

            addToCart(customizedFood, orderData.quantity, orderData.note)
            toast.success(`Đã thêm ${orderData.quantity}x "${customizedFood.name}" vào giỏ hàng!`, {
              icon: '🛒',
            })
          }}
        />
      )}

      {/* ====================================================================
          7. MOBILE STICKY CART BAR (FLOATING CONVERSION BAR)
          ==================================================================== */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 backdrop-blur-md rounded-2xl p-3 px-4 shadow-2xl flex items-center justify-between border border-slate-700/50 dark:border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-md">
                {itemCount}
              </div>
              <div>
                <p className="text-xs text-slate-300 dark:text-slate-600 font-medium">Giỏ hàng hiện tại</p>
                <p className="text-sm font-black text-amber-300 dark:text-primary">
                  {formatPrice(subtotal)}
                </p>
              </div>
            </div>
            <Link
              to="/checkout"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF4B2B] to-[#FF416C] text-white text-xs font-black shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Xem giỏ hàng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
