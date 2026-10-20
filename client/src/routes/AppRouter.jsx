import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout.jsx'
import Home from '../pages/Home/Home.jsx'
import NotFound from '../pages/NotFound/NotFound.jsx'
import DriverDashboard from '../pages/DriverDashboard/DriverDashboard.jsx'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Driver portal — standalone, no shared layout chrome */}
        <Route path="/driver/*" element={<DriverDashboard />} />

        {/* General app routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
