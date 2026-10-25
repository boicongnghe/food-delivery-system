import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CartProvider } from '../context/CartContext.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import Home from '../pages/Home/Home.jsx'
import Checkout from '../pages/Checkout/Checkout.jsx'
import PaymentResult from '../pages/Payment/PaymentResult.jsx'
import OrderTracking from '../pages/OrderTracking/OrderTracking.jsx'
import OrderHistory from '../pages/Orders/OrderHistory.jsx'
import ManagePromotions from '../pages/Admin/Promotions/ManagePromotions.jsx'
import NotFound from '../pages/NotFound/NotFound.jsx'

function AppRouter() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Customer Routes (UC11, UC12, UC13, UC15, UC16, UC17, UC18) */}
            <Route path="/" element={<Home />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-result" element={<PaymentResult />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:id" element={<OrderTracking />} />

            {/* Admin Dedicated Route (UC14: Manage promotion rules) */}
            <Route path="/admin/promotions" element={<ManagePromotions />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default AppRouter
