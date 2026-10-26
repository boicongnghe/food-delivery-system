import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Search,
  Star,
  Clock,
  ShoppingBag,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth.js'
import { useCart } from '../../context/CartContext.jsx'
import { CATEGORIES, DISHES } from '../../data/dishesData.js'
import { foodApi } from '../../api/foodApi.js'
import DishDetailModal from '../../components/DishDetailModal/DishDetailModal.jsx'

export default function Home() {
  const { user, isAuthenticated } = useAuth()
  const { addToCart, items: cartItems } = useCart() || { addToCart: () => {}, items: [] }
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
  const [apiDishes, setApiDishes] = useState([])

  // Modal State for Order - initialized with dish if user just logged in from dish selection
  const [activeDish, setActiveDish] = useState(() => location.state?.continueOrder || null)
  const welcomedRef = useRef(false)

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
            image: f.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
            category: 'com-mi',
            rating: 4.8,
            reviewsCount: 120,
            deliveryTime: '15-25 phút',
            distance: '1.5 km',
            tag: idx === 0 ? 'Mới' : undefined,
            description: f.description || 'Món ngon chuẩn vị với nguyên liệu tươi sạch.',
          }))
          setApiDishes(mapped)
        }
      } catch (err) {
        // Fallback gracefully to default DISHES
        console.warn('Backend foods not loaded, using fallback catalog:', err?.message)
      }
    }
    fetchFoods()
    return () => {
      isMounted = false
    }
  }, [])

  // Combine dishes
  const allDishes = useMemo(() => {
    if (apiDishes.length > 0) {
      // Ensure no duplicates by name
      const apiNames = new Set(apiDishes.map((d) => d.name.toLowerCase()))
      const nonOverlappingStatic = DISHES.filter((d) => !apiNames.has(d.name.toLowerCase()))
      return [...apiDishes, ...nonOverlappingStatic]
    }
    return DISHES
  }, [apiDishes])

  // Handle welcome toast when returning from login
  useEffect(() => {
    if (location.state?.continueOrder && isAuthenticated && user?.role === 'customer' && !welcomedRef.current) {
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
        // 'popular' default: by reviews count
        return (b.reviewsCount || 0) - (a.reviewsCount || 0)
      })
  }, [allDishes, selectedCategory, searchQuery, priceFilter, sortBy])

  // Click on a dish item
  const handleDishClick = (dish) => {
    setActiveDish(dish)
  }

  // Quick Add to cart
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Role Navigation Notice (For Restaurant Owner or Shipper viewing Homepage) */}
      {isAuthenticated && (user?.role === 'restaurant_owner' || user?.role === 'shipper') && (
        <div className="bg-gradient-to-r from-amber-500 to-primary text-white py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-200" />
              Bạn đang xem Trang Chủ Khách Hàng với tài khoản{' '}
              <strong className="underline">
                {user.role === 'restaurant_owner' ? 'Chủ Quán Ăn' : 'Tài Xế Giao Hàng'}
              </strong>
            </span>
            <Link
              to={user.role === 'restaurant_owner' ? '/restaurant' : '/shipper'}
              className="px-3 py-1 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
            >
              Quay lại Bảng Quản Lý <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 text-white pt-10 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                Giao Đồ Ăn Thần Tốc Trong 15 - 25 Phút
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
                Thế giới món ngon <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">
                  giao ngay tận cửa!
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Hơn 1,000+ nhà hàng hàng đầu, từ cơm tấm sườn nướng, phở bò truyền thống đến burger, trà sữa. Đặt món tiện lợi chỉ trong 1 chạm.
              </p>

              {/* Big Search Bar inside Hero */}
              <div className="bg-white p-2 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 max-w-2xl">
                <div className="flex items-center flex-1 w-full pl-3 pr-2 py-1.5">
                  <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm món ngon, quán ăn yêu thích..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none bg-transparent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-md"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('dishes-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-md shadow-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Tìm món
                </button>
              </div>

              {/* Highlights & Guarantees */}
              <div className="grid grid-cols-3 gap-4 pt-2 max-w-lg text-slate-300">
                <div className="border-l-2 border-primary/60 pl-3">
                  <p className="text-lg sm:text-2xl font-black text-white">1.000+</p>
                  <p className="text-xs text-slate-400">Quán ăn ngon</p>
                </div>
                <div className="border-l-2 border-amber-400/60 pl-3">
                  <p className="text-lg sm:text-2xl font-black text-white">15 Phút</p>
                  <p className="text-xs text-slate-400">Giao siêu tốc</p>
                </div>
                <div className="border-l-2 border-emerald-400/60 pl-3">
                  <p className="text-lg sm:text-2xl font-black text-white">99.8%</p>
                  <p className="text-xs text-slate-400">Hài lòng 5 sao</p>
                </div>
              </div>
            </div>

            {/* Right Food Spotlight Card */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative">
                <div className="relative mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 group">
                  <img
                    src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80"
                    alt="Món ăn nổi bật"
                    className="w-full h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                  {/* Floating Deal Card */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 text-slate-900 shadow-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Món bán chạy nhất tuần
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">Cơm Tấm Sườn Bì Chả Đặc Biệt</h4>
                      <p className="text-xs text-slate-500">Ba Ghiền - Đã bán 2.4k suất</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDishClick(allDishes[0])}
                      className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all"
                    >
                      Đặt ngay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section id="dishes-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-4 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shadow-sm ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                    : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>

        {/* Section Header with Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {selectedCategory === 'all'
                ? 'Thực Đơn Đầy Đủ'
                : CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Danh mục món ăn'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tìm thấy <strong className="text-primary">{filteredDishes.length}</strong> món ăn hấp dẫn sẵn sàng giao ngay
            </p>
          </div>

          {/* Price & Sort Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Price Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-sm text-xs font-semibold text-slate-700">
              <span className="text-slate-400">Giá:</span>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả mức giá</option>
                <option value="under50">Dưới 50.000 đ</option>
                <option value="50to100">50.000 - 100.000 đ</option>
                <option value="over100">Trên 100.000 đ</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-sm text-xs font-semibold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Xếp theo:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="popular">Phổ biến nhất</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="priceAsc">Giá thấp đến cao</option>
                <option value="priceDesc">Giá cao đến thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dishes Grid */}
        {filteredDishes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-primary flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không tìm thấy món ăn phù hợp</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Không có món ăn nào khớp với bộ lọc hoặc từ khóa tìm kiếm của bạn. Hãy thử chọn danh mục khác nhé!
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setSearchQuery('')
                setPriceFilter('all')
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
                onClick={() => handleDishClick(dish)}
              >
                {/* Image Container with Badge */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>

                  {/* Badge */}
                  {dish.tag && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary/95 text-white text-[11px] font-bold shadow-md backdrop-blur-sm">
                      {dish.tag}
                    </span>
                  )}

                  {/* Rating Badge */}
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-amber-300 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    {dish.rating || 4.8} ({dish.reviewsCount || 40})
                  </span>

                  {/* Time Badge */}
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    {dish.deliveryTime || '15-25 phút'}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block truncate">
                      {dish.restaurant}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                      {dish.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {dish.description}
                    </p>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
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
                        className="p-2 rounded-xl bg-orange-50 hover:bg-primary text-primary hover:text-white transition-colors shadow-sm"
                        title="Thêm nhanh vào giỏ hàng"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDishClick(dish)
                        }}
                        className="px-3 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition-colors shadow-sm"
                      >
                        Chọn món
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Promotional Deals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-gradient-to-r from-orange-500 via-primary to-amber-500 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              🎁 Ưu Đãi Độc Quyền Hôm Nay
            </span>
            <h3 className="text-2xl sm:text-3xl font-black leading-tight">
              Nhập mã <span className="text-amber-200">FREESHIP15K</span> để miễn phí giao hàng toàn quốc!
            </h3>
            <p className="text-sm text-orange-100 leading-relaxed">
              Áp dụng cho mọi đơn hàng từ 100.000đ khi thanh toán trên hệ thống FoodDelivery.
            </p>
          </div>
        </div>
      </section>

      {/* Dish Detail / Order Modal */}
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
            addToCart(orderData.dish, orderData.quantity, orderData.note)
            toast.success(`Đã thêm ${orderData.quantity}x "${orderData.dish.name}" vào giỏ hàng!`, {
              icon: '🛒',
            })
          }}
        />
      )}
    </div>
  )
}
