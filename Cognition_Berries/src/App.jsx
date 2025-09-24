import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import SignUp from './pages/AuthPages/SignUp'
import Login from './pages/AuthPages/Login'
import HomePage from './pages/HomePage/HomePage'
import NotFound from './pages/NotFound/NotFound'
import UserDashboard from "./pages/Dashboard/User Dashboard/UserDashboard"
import LandingPage from "./pages/LandingPage/LandingPage"
import AboutUs from "./pages/AboutUs/AboutUs"
import Courses from "./pages/Courses/Courses"
import CommunityForum from "./pages/ComminityForum/ComminityForum"
import CartPage from "./pages/Cart/CartPage"
import ExtraMaterial from "./pages/ExtraMaterial/ExtraMaterial"
import CheckoutPage from "./pages/CheckoutPage/CheckoutPage"
import { CartProvider } from "./Context/CartContext"
import OrdersSummary from "./pages/Orders-summary/Orders-summary"
import LiveSession from "./pages/LiveSession/LiveSession"
import SettingsPage from "./pages/SettingsPage/Settings"

const ProtectedRoute = ({ children }) => {
  const auth = JSON.parse(localStorage.getItem('auth'))
  return auth ? children : <Navigate to='/login' />;
}

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<LandingPage />} />
          <Route path='/signup' element={<SignUp />} />
          <Route path='/login' element={<Login />} />
          <Route path='/about' element={<AboutUs />} />

          <Route path='/home' element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path='/courses' element={<ProtectedRoute><Courses /></ProtectedRoute>} />
          <Route path='/dashboard' element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path='/community-forum' element={<ProtectedRoute><CommunityForum /></ProtectedRoute>} />
          <Route path='/extra-material' element={<ProtectedRoute><ExtraMaterial /></ProtectedRoute>} />
          <Route path='/cart' element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path='/checkout' element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path='/order-success' element={<ProtectedRoute><OrdersSummary /></ProtectedRoute>} />
          <Route path='/live-session' element={<ProtectedRoute><LiveSession /></ProtectedRoute>} />
          <Route path='/settings' element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path='/*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  )
}

export default App
