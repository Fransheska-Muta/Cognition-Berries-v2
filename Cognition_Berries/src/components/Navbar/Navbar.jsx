// components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import { useCart } from '../../Context/CartContext'; // Import the cart context
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Use cart context
  const { cartCount, clearCart } = useCart();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    }
  }, []); // run once on mount

  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
    setUser(null);
    clearCart(); // Clear cart state on logout
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo">
          <Link to="/">
            <img src="/Cog-Berr-Logo.svg" alt="Cognition Berries Logo" width="30" height="30" />
          </Link>
        </div>

        <ul className="nav-links">
          <li><Link to="/home">Home</Link></li>
          <li><Link to="/courses">Courses</Link></li>
          <li><Link to="/blog">Blog</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>

        {user ? (
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
                alt={user?.name || 'User'}
                src={user.avatar || '/SilhouettedHumanProfileAgainstPinkGradient.png'}
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
              alt={user?.name || "User"}
              src={user?.avatar || "/SilhouettedHumanProfileAgainstPinkGradient.png"}
              sx={{ width: 50, height: 50 }}
            />
            <div className="sidebar-user-info">
              <p>{user?.name || "Guest"}</p>
              <small>{user?.email}</small>
            </div>
          </div>
        </div>

        <ul className="sidebar-links">
          <li><Link to="/dashboard" onClick={toggleSidebar}>⚡ Dashboard</Link></li>
          <li><Link to="/settings" onClick={toggleSidebar}>⚙️ Settings</Link></li>
          <li><Link to="/community-forum" onClick={toggleSidebar}>💬 Community Forum</Link></li>
          <li><Link to="/extra-material" onClick={toggleSidebar}>💬 Extra Material</Link></li>
          <li><Link to="/live-session" onClick={toggleSidebar}>💬 Live Sessions</Link></li>
        </ul>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
        </div>
      </div>
    </>
  );
};

export default Navbar;