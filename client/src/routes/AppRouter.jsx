import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from '../context/CartContext.jsx'
import MainLayout from '../layouts/MainLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import RestaurantLayout from '../layouts/RestaurantLayout.jsx'
import RestaurantProfile from '../pages/RestaurantProfile/RestaurantProfile.jsx'
import MenuManagement from '../pages/MenuManagement/MenuManagement.jsx'
import OrderBoard from '../pages/OrderBoard/OrderBoard.jsx'
import Home from '../pages/Home/Home.jsx'
import Checkout from '../pages/Checkout/Checkout.jsx'
import PaymentResult from '../pages/Payment/PaymentResult.jsx'
import OrderTracking from '../pages/OrderTracking/OrderTracking.jsx'
import OrderHistory from '../pages/Orders/OrderHistory.jsx'
import Login from '../pages/Login/Login.jsx'
import Register from '../pages/Register/Register.jsx'
import ShipperDashboard from '../pages/Shipper/ShipperDashboard.jsx'
import AdminDashboard from '../pages/Admin/AdminDashboard.jsx'
import AdminAnalytics from '../pages/AdminAnalytics/AdminAnalytics.jsx'
import AdminCommissionRules from '../pages/AdminCommissionRules/AdminCommissionRules.jsx'
import AdminComplaints from '../pages/AdminComplaints/AdminComplaints.jsx'
import AdminDeliveryIssues from '../pages/AdminDeliveryIssues/AdminDeliveryIssues.jsx'
import AdminPromotions from '../pages/AdminPromotions/AdminPromotions.jsx'
import AdminReviews from '../pages/AdminReviews/AdminReviews.jsx'
import AdminUsers from '../pages/AdminUsers/AdminUsers.jsx'
import Feedback from '../pages/Feedback/Feedback.jsx'
import NotFound from '../pages/NotFound/NotFound.jsx'
import PublicOnlyRoute from '../components/routes/PublicOnlyRoute.jsx'
import ProtectedRoute from '../components/routes/ProtectedRoute.jsx'

function AppRouter() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '14px',
              background: '#0F172A',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            },
          }}
        />
        <Routes>
          {/* Main Public & Customer Area */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            {/* Customer Only Area */}
            <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment-result" element={<PaymentResult />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/orders/:id" element={<OrderTracking />} />
              <Route path="/feedback" element={<Feedback />} />
            </Route>

            {/* Guest only routes: logged-in users redirected to their dashboards */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Restaurant Owner Partner Portal redirect */}
            <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
              <Route path="/restaurant" element={<Navigate to="/restaurant/orders" replace />} />
            </Route>

            {/* Shipper Dashboard */}
            <Route element={<ProtectedRoute allowedRoles={['shipper']} />}>
              <Route path="/shipper" element={<ShipperDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Restaurant owner partner portal (shared Header/Footer) */}
          <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
            <Route element={<RestaurantLayout />}>
              <Route path="/restaurant/profile" element={<RestaurantProfile />} />
              <Route path="/restaurant/menu" element={<MenuManagement />} />
              <Route path="/restaurant/orders" element={<OrderBoard />} />
              <Route path="/restaurant/*" element={<NotFound />} />
            </Route>
          </Route>

          {/* Independent Admin Portal Area: Isolated from customer/storefront */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="delivery-issues" element={<AdminDeliveryIssues />} />
              <Route path="promotions" element={<AdminPromotions />} />
              <Route path="commission-rules" element={<AdminCommissionRules />} />
            </Route>
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  )
}

export default AppRouter
