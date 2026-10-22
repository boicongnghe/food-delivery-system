import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from '../components/Header/Header.jsx'
import Footer from '../components/Footer/Footer.jsx'
import restaurantApi from '../api/restaurantApi.js'
import { isOpenNow } from '../utils/openingHours.js'

const RESTAURANT_NAV_ITEMS = [
  { to: '/restaurant/profile', label: 'Hồ Sơ Quán' },
  { to: '/restaurant/menu', label: 'Thực Đơn & Món Ăn' },
  { to: '/restaurant/orders', label: 'Đơn Hàng Bếp' },
  { to: '/restaurant/revenue', label: 'Báo Cáo Doanh Thu' },
]

// Layout for restaurant owner pages. Child pages read the restaurant via useOutletContext().
export default function RestaurantLayout() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    restaurantApi
      .getMyRestaurant()
      .then((response) => {
        if (isMounted) setRestaurant(response.data)
      })
      .catch((error) => {
        // 404 = owner has not created a profile yet, not an error
        if (error.response?.status !== 404) {
          toast.error(error.response?.data?.message || 'Không tải được thông tin nhà hàng')
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const status = restaurant
    ? isOpenNow(restaurant.openingHours)
      ? { label: 'Đang mở cửa', isOpen: true }
      : { label: 'Đã đóng cửa', isOpen: false }
    : null

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header subtitle="Bếp & Phố" navItems={RESTAURANT_NAV_ITEMS} status={status} />

      <main className="flex-1">
        {loading ? (
          <div className="py-32 flex justify-center">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Outlet context={{ restaurant, setRestaurant }} />
        )}
      </main>

      <Footer subtitle="Cổng đối tác nhà hàng & quán ăn" />
    </div>
  )
}
