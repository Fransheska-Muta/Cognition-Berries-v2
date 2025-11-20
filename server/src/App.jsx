import { Route, Routes, Navigate, Outlet } from "react-router-dom"
import Navbar from './components/Navbar/Navbar'
import SignUp from './pages/AuthPages/SignUp'
import Login from './pages/AuthPages/Login'
import HomePage from './pages/HomePage/HomePage'
import NotFound from './pages/NotFound/NotFound'
import UserDashboard from "./pages/Dashboard/User Dashboard/UserDashboard"
import LandingPage from "./pages/LandingPage/LandingPage"
import AboutUs from "./pages/AboutPage/AboutPage"
import Courses from "./pages/Courses/Courses"
import CommunityForum from "./pages/ComminityForum/ComminityForum"
import CartPage from "./pages/Cart/CartPage"
import ExtraMaterial from "./pages/ExtraMaterial/ExtraMaterial"
import CheckoutPage from "./pages/CheckoutPage/CheckoutPage"
import { CartProvider } from "./Context/CartContext"
import OrdersSummary from "./pages/Orders-summary/Orders-summary"
import LiveSession from "./pages/LiveSession/LiveSession"
import SettingsPage from "./pages/SettingsPage/Settings"
import CourseDetail from './pages/CourseDetail/CourseDetail';
import CourseLearning from './pages/CourseLearning/CourseLearning';
import PhoneLogin from "./pages/AuthPages/PhoneLogin"
import { isAuthenticated } from "./utils/auth"
import BookDetail from "./pages/Book Details/BookDetails"
import Blog from "./pages/BlogPage/BlogPage"

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to='/login' replace />;
}

function App() {
  return (
    <CartProvider>
      <Routes>
        {/* Public routes */}
        <Route path='/' element={<LandingPage />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/login' element={<Login />} />
        <Route path='/about' element={<AboutUs />} />
        <Route path="/phone-login" element={<PhoneLogin />} />

        {/* Protected routes - all render as children */}
        <Route path='/home' element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path='/courses' element={<ProtectedRoute><Courses /></ProtectedRoute>} />
        <Route path='/dashboard' element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
        <Route path='/community-forum' element={<ProtectedRoute><CommunityForum /></ProtectedRoute>} />
        <Route path="/course/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
        <Route path="/course/:courseId/learn" element={<ProtectedRoute><CourseLearning /></ProtectedRoute>} />
        <Route path='/extra-material' element={<ProtectedRoute><ExtraMaterial /></ProtectedRoute>} />
        <Route path="/extra-material/:id" element={<BookDetail />} />
        <Route path='/blog' element={<Blog />}/>
        <Route path='/cart' element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
        <Route path='/checkout' element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path='/order-success' element={<ProtectedRoute><OrdersSummary /></ProtectedRoute>} />
        <Route path='/live-session' element={<ProtectedRoute><LiveSession /></ProtectedRoute>} />
        <Route path='/settings' element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path='*' element={<NotFound />} />
      </Routes>
    </CartProvider>
  )
}

export default App