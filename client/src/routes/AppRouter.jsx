import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { CartProvider } from '../context/CartContext.jsx'
import { useAuth } from '../hooks/useAuth.js'
import MainLayout from '../layouts/MainLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import RestaurantLayout from '../layouts/RestaurantLayout.jsx'
import PublicOnlyRoute from '../components/routes/PublicOnlyRoute.jsx'
import ProtectedRoute from '../components/routes/ProtectedRoute.jsx'

// Home is kept eager for instant LCP on landing page
import Home from '../pages/Home/Home.jsx'

// Code-split pages on demand for optimal bundle size
const RestaurantProfile = lazy(() => import('../pages/RestaurantProfile/RestaurantProfile.jsx'))
const MenuManagement = lazy(() => import('../pages/MenuManagement/MenuManagement.jsx'))
const OrderBoard = lazy(() => import('../pages/OrderBoard/OrderBoard.jsx'))
const RevenueReport = lazy(() => import('../pages/RevenueReport/RevenueReport.jsx'))
const RestaurantVouchers = lazy(() => import('../pages/RestaurantVouchers/RestaurantVouchers.jsx'))

const CartPage = lazy(() => import('../pages/Cart/CartPage.jsx'))
const WalletPage = lazy(() => import('../pages/Wallet/WalletPage.jsx'))
const Checkout = lazy(() => import('../pages/Checkout/Checkout.jsx'))
const PaymentResult = lazy(() => import('../pages/Payment/PaymentResult.jsx'))
const OrderTracking = lazy(() => import('../pages/OrderTracking/OrderTracking.jsx'))
const OrderHistory = lazy(() => import('../pages/Orders/OrderHistory.jsx'))
const Feedback = lazy(() => import('../pages/Feedback/Feedback.jsx'))
const IssueHearing = lazy(() => import('../pages/IssueHearing/IssueHearing.jsx'))

const Login = lazy(() => import('../pages/Login/Login.jsx'))
const Register = lazy(() => import('../pages/Register/Register.jsx'))
const VerifyEmail = lazy(() => import('../pages/VerifyEmail/VerifyEmail.jsx'))

const AdminDashboard = lazy(() => import('../pages/Admin/AdminDashboard.jsx'))
const AdminAnalytics = lazy(() => import('../pages/AdminAnalytics/AdminAnalytics.jsx'))
const AdminCommissionRules = lazy(() => import('../pages/AdminCommissionRules/AdminCommissionRules.jsx'))
const AdminOrders = lazy(() => import('../pages/AdminOrders/AdminOrders.jsx'))
const AdminWithdrawals = lazy(() => import('../pages/AdminWithdrawals/AdminWithdrawals.jsx'))
const AdminSupportCases = lazy(() => import('../pages/AdminSupportCases/AdminSupportCases.jsx'))
const AdminPromotions = lazy(() => import('../pages/AdminPromotions/AdminPromotions.jsx'))
const AdminRestaurants = lazy(() => import('../pages/AdminRestaurants/AdminRestaurants.jsx'))
const AdminReviews = lazy(() => import('../pages/AdminReviews/AdminReviews.jsx'))
const AdminSettings = lazy(() => import('../pages/AdminSettings/AdminSettings.jsx'))
const AdminShippingFee = lazy(() => import('../pages/AdminShippingFee/AdminShippingFee.jsx'))
const AdminShippers = lazy(() => import('../pages/AdminShippers/AdminShippers.jsx'))
const AdminUsers = lazy(() => import('../pages/AdminUsers/AdminUsers.jsx'))

const DriverDashboard = lazy(() => import('../pages/DriverDashboard/DriverDashboard.jsx'))
const DebugShipperFlow = lazy(() => import('../pages/DriverDashboard/DebugShipperFlow.jsx'))
const NotFound = lazy(() => import('../pages/NotFound/NotFound.jsx'))

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang tải trang...</span>
    </div>
  )
}

function CartProviderWithAuth({ children }) {
  const { user } = useAuth()
  return <CartProvider userId={user?._id}>{children}</CartProvider>
}

function AppRouter() {
  return (
    <BrowserRouter>
      <CartProviderWithAuth>
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Shipper dashboard stays outside the storefront layout. */}
            <Route element={<ProtectedRoute allowedRoles={['shipper']} />}>
              <Route path="/shipper" element={<Navigate to="/shipper/dashboard" replace />} />
              <Route path="/shipper/:tab/*" element={<DriverDashboard />} />
              {/* Dev-only tool: changes real orders, never part of a production build */}
              {import.meta.env.DEV && <Route path="/shipper/debug" element={<DebugShipperFlow />} />}
            </Route>

            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />

              {/* Cart & Wallet — customer only */}
              <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/wallet" element={<WalletPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/payment-result" element={<PaymentResult />} />
                <Route path="/orders" element={<OrderHistory />} />
                <Route path="/orders/:id" element={<OrderTracking />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/delivery-issues" element={<IssueHearing />} />
              </Route>

              {/* Guest only routes: logged-in users redirected to their dashboards */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Restaurant Owner Partner Portal redirect */}
              <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
                <Route path="/restaurant" element={<Navigate to="/restaurant/profile" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Restaurant owner partner portal (shared Header/Footer) */}
            <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
              <Route element={<RestaurantLayout />}>
                <Route path="/restaurant/profile" element={<RestaurantProfile />} />
                <Route path="/restaurant/menu" element={<MenuManagement />} />
                <Route path="/restaurant/orders" element={<OrderBoard />} />
                <Route path="/restaurant/revenue" element={<RevenueReport />} />
                <Route path="/restaurant/vouchers" element={<RestaurantVouchers />} />
                <Route path="/restaurant/delivery-issues" element={<IssueHearing />} />
                <Route path="/restaurant/*" element={<NotFound />} />
              </Route>
            </Route>

            {/* Independent Admin Portal Area: Isolated from customer/storefront */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="restaurants" element={<AdminRestaurants />} />
                <Route path="shippers" element={<AdminShippers />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="support-cases" element={<AdminSupportCases />} />
                {/* Old addresses (links, bookmarks) open the matching tab */}
                <Route path="complaints" element={<Navigate to="/admin/support-cases" replace />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="delivery-issues" element={<Navigate to="/admin/support-cases?tab=delivery-issues" replace />} />
                <Route path="promotions" element={<AdminPromotions />} />
                <Route path="commission-rules" element={<AdminCommissionRules />} />
                <Route path="shipping-fee" element={<AdminShippingFee />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </CartProviderWithAuth>
    </BrowserRouter>
  )
}

export default AppRouter