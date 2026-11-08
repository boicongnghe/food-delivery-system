import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { RefreshCw, WifiOff } from 'lucide-react'
import Header from '../components/Header/Header.jsx'
import Footer from '../components/Footer/Footer.jsx'
import restaurantApi from '../api/restaurantApi.js'
import { isOpenNow } from '../utils/openingHours.js'

const RESTAURANT_NAV_ITEMS = [
  { to: '/restaurant/orders', label: 'Đơn Hàng Bếp' },
  { to: '/restaurant/menu', label: 'Thực Đơn & Món Ăn' },
  { to: '/restaurant/profile', label: 'Hồ Sơ Quán' },
  { to: '/restaurant/revenue', label: 'Thống Kê' },
]

// Layout for restaurant owner pages. Child pages read the restaurant via useOutletContext().
export default function RestaurantLayout() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  // Network / server error: must not look like "no profile yet" (that is only a 404)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    restaurantApi
      .getMyRestaurant()
      .then((response) => {
        if (isMounted) setRestaurant(response.data)
      })
      .catch((error) => {
        // 404 = owner has not created a profile yet, not an error
        if (isMounted && error.response?.status !== 404) {
          setLoadError(error.response?.data?.message || 'Không tải được thông tin nhà hàng. Kiểm tra kết nối mạng.')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  const retry = () => {
    setLoadError('')
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  // The owner's pause switch (order board) wins over the opening hours
  const status = restaurant
    ? restaurant.isAcceptingOrders === false
      ? { label: 'Tạm ngưng nhận đơn', isOpen: false }
      : isOpenNow(restaurant.openingHours)
        ? { label: 'Đang mở cửa', isOpen: true }
        : { label: 'Đã đóng cửa', isOpen: false }
    : null

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header
        subtitle="Kênh Quán Ăn"
        navItems={RESTAURANT_NAV_ITEMS}
        status={status}
        accountImage={restaurant?.logo}
        accountName={restaurant?.name}
      />

      {restaurant?.status === 'pending' && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-xs text-center animate-in fade-in">
          <span>⏳</span>
          <span>
            Hồ sơ quán ăn của bạn đang ở trạng thái <strong>CHỜ DUYỆT</strong>. Quản trị viên đang kiểm tra thông tin giấy phép trước khi cho phép mở bán chính thức trên ứng dụng.
          </span>
        </div>
      )}

      {restaurant?.status === 'rejected' && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-xs text-center animate-in fade-in">
          <span>❌</span>
          <span>
            Hồ sơ quán ăn của bạn <strong>ĐÃ BỊ TỪ CHỐI DUYỆT</strong>
            {restaurant.statusChange?.note ? ` (lý do: ${restaurant.statusChange.note})` : ''}. Hãy sửa hồ sơ và bấm Lưu thay
            đổi để gửi duyệt lại, hoặc liên hệ ban quản trị.
          </span>
        </div>
      )}

      <main className="flex-1">
        {loading ? (
          <div className="py-32 flex justify-center">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="max-w-md mx-auto px-4 py-24 text-center" role="alert">
            <WifiOff className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 font-semibold text-slate-900">Chưa tải được thông tin quán</p>
            <p className="mt-1 text-sm text-slate-600">{loadError}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        ) : (
          <Outlet context={{ restaurant, setRestaurant }} />
        )}
      </main>

      <Footer subtitle="Cổng đối tác nhà hàng & quán ăn" />
    </div>
  )
}
