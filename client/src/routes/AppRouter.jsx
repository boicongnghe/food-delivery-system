import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from '../layouts/MainLayout.jsx'
import AdminLayout from '../layouts/AdminLayout.jsx'
import Home from '../pages/Home/Home.jsx'
import Login from '../pages/Login/Login.jsx'
import Register from '../pages/Register/Register.jsx'
import RestaurantDashboard from '../pages/Restaurant/RestaurantDashboard.jsx'
import ShipperDashboard from '../pages/Shipper/ShipperDashboard.jsx'
import AdminDashboard from '../pages/Admin/AdminDashboard.jsx'
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

          {/* Restaurant Owner Dashboard (also has button to view Homepage) */}
          <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
            <Route path="/restaurant" element={<RestaurantDashboard />} />
          </Route>

          {/* Shipper Dashboard (also has button to view Homepage) */}
          <Route element={<ProtectedRoute allowedRoles={['shipper']} />}>
            <Route path="/shipper" element={<ShipperDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Independent Admin Portal Area: Isolated from customer/storefront */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
