// components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import { useCart } from '../../Context/CartContext';
import { useAuth } from '../../Context/AuthContext'; // Add AuthContext
import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import './Navbar.css';

const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Use cart context
  const { cartCount, clearCart } = useCart();
  
  // Use auth context
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear localStorage
      localStorage.removeItem('auth');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('phoneNumber');
      
      // Clear cart state
      clearCart();
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Get user display info - handle both email and phone auth
  const getUserDisplayInfo = () => {
    if (!currentUser) return null;
    
    return {
      name: currentUser.displayName || currentUser.email || currentUser.phoneNumber || 'User',
      email: currentUser.email || currentUser.phoneNumber || '',
      avatar: currentUser.photoURL || '/SilhouettedHumanProfileAgainstPinkGradient.png'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <>
      <nav className="navbar">
        <div className="logo">
          <Link to="/home">
            <img src="/Cog-Berr-Logo.svg" alt="Cognition Berries Logo" width="30" height="30" />
          </Link>
        </div>

        <ul className="nav-links">
          <li><Link to="/home">Home</Link></li>
          <li><Link to="/courses">Courses</Link></li>
          <li><Link to="/blog">Blog</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>

        {currentUser ? (
          <div className="user-menu">
            {/* Cart icon with counter */}
            <Link to="/cart" className="cart-icon-wrapper">
              <span className="cart-icon">🛒</span>
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </Link>

            {/* Avatar triggers sidebar */}
            <div onClick={toggleSidebar} className="avatar-wrapper">
              <Avatar
                alt={userInfo?.name || 'User'}
                src={userInfo?.avatar}
              />
            </div>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/login" className="login-btn">Login</Link>
            <Link to="/signup" className="signup-btn">Sign Up</Link>
          </div>
        )}
      </nav>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={toggleSidebar}>×</button>
          <div className="sidebar-user">
            <Avatar
              alt={userInfo?.name || "User"}
              src={userInfo?.avatar}
              sx={{ width: 50, height: 50 }}
            />
            <div className="sidebar-user-info">
              <p>{userInfo?.name || "Guest"}</p>
              <small>{userInfo?.email}</small>
            </div>
          </div>
        </div>

        <ul className="sidebar-links">
          <li><Link to="/dashboard" onClick={toggleSidebar}>⚡ Dashboard</Link></li>
          <li><Link to="/settings" onClick={toggleSidebar}>⚙️ Settings</Link></li>
          <li><Link to="/community-forum" onClick={toggleSidebar}>💬 Community Forum</Link></li>
          <li><Link to="/extra-material" onClick={toggleSidebar}>📚 Extra Material</Link></li>
          <li><Link to="/live-session" onClick={toggleSidebar}>🎥 Live Sessions</Link></li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
        </div>
      </div>
    </>
  );
};

export default Navbar;