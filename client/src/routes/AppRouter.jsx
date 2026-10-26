import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from '../layouts/MainLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import RestaurantLayout from '../layouts/RestaurantLayout.jsx'
import RestaurantProfile from '../pages/RestaurantProfile/RestaurantProfile.jsx'
import MenuManagement from '../pages/MenuManagement/MenuManagement.jsx'
import OrderBoard from '../pages/OrderBoard/OrderBoard.jsx'
import Home from '../pages/Home/Home.jsx'
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
        {/* Main Public & Customer / Restaurant / Shipper Area */}
        <Route element={<MainLayout />}>
          {/* Homepage: Accessible before login and by customers, owners, shippers. Admins redirected to /admin */}
          <Route path="/" element={<Home />} />

          {/* Guest only routes: logged-in users redirected to their dashboards */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Restaurant Owner Partner Portal redirect */}
          <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
            <Route path="/restaurant" element={<Navigate to="/restaurant/profile" replace />} />
          </Route>

          {/* Shipper Dashboard (also has button to view Homepage) */}
          <Route element={<ProtectedRoute allowedRoles={['shipper']} />}>
            <Route path="/shipper" element={<ShipperDashboard />} />
          </Route>

          {/* Customer: reviews (UC17) and complaints (UC18) after delivery */}
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/feedback" element={<Feedback />} />
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
    </BrowserRouter>
  )
}

export default AppRouter
