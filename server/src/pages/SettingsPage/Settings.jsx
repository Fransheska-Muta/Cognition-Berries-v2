import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from 'lucide-react';
import { getAuth } from "firebase/auth";
import './Settings.css'; // <-- Import the CSS file for professional styling

// Theme Context for dark mode management
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // const Base_API = process.env.BASEAPI

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// API Service Functions - Mock implementations that simulate real API calls
const apiService = {
  // Fetch current user from backend using Firebase/localStorage token
  getCurrentUser: async () => {
    // Try Firebase first
    let token = null;
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken();
      }
    } catch (e) {
      // ignore
    }
    // fallback to localStorage
    if (!token) token = localStorage.getItem('authToken');
    if (!token) throw new Error('Not authenticated');

    // Fetch user profile from backend
    const res = await fetch(
      (import.meta.env.VITE_BASE_API || window.location.origin) + '/me',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!res.ok) {
      throw new Error('Failed to fetch user');
    }
    return await res.json();
  },

  // Fetch all registered users from backend
  getRegisteredUsers: async () => {
    // Use your backend API endpoint for users
    const token = localStorage.getItem('authToken');
    const res = await fetch(
      (import.meta.env.VITE_BASE_API || window.location.origin) + '/users',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }
    return await res.json();
  },

  // Fetch login activity for current user
  getLoginActivity: async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Generate dynamic login activity based on user
    const locations = [
      ['New York, USA', 'Chrome on Windows'],
      ['London, UK', 'Safari on MacOS'],
      ['Tokyo, Japan', 'Firefox on Linux'],
      ['Sydney, Australia', 'Edge on Windows'],
      ['Berlin, Germany', 'Chrome on Android'],
      ['San Francisco, USA', 'Safari on iPhone'],
      ['Toronto, Canada', 'Chrome on MacOS'],
      ['Amsterdam, Netherlands', 'Firefox on Windows']
    ];

    const activity = [];
    for (let i = 0; i < 5; i++) {
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      activity.push({
        id: i + 1,
        location: randomLocation[0],
        device: randomLocation[1],
        timestamp: date.toLocaleString(),
        ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      });
    }

    return activity;
  },

  // Save user settings
  saveUserSettings: async (userId, settings) => {
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API call
    
    // In a real app, this would make a PUT/PATCH request to your API
    console.log(`Saving settings for user ${userId}:`, settings);
    
    // Simulate success/failure
    if (Math.random() > 0.1) { // 90% success rate
      return { success: true, message: 'Settings saved successfully' };
    } else {
      throw new Error('Failed to save settings. Please try again.');
    }
  },

  // Update profile
  updateProfile: async (userId, profileData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Updating profile for user ${userId}:`, profileData);
    
    if (Math.random() > 0.05) { // 95% success rate
      return { success: true, data: profileData };
    } else {
      throw new Error('Failed to update profile. Please try again.');
    }
  },

  // Delete account
  deleteAccount: async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`Deleting account for user ${userId}`);
    
    // Simulate account deletion
    localStorage.removeItem('currentUserId');
    return { success: true, message: 'Account deleted successfully' };
  }
};

// Loading Spinner Component
const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {text && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
};

// Error Display Component
const ErrorDisplay = ({ error, onRetry }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <X className="h-5 w-5 text-red-400" />
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Try Again
          </button>
        )}
      </div>
    </div>
  </div>
);

// Profile Section Component
const ProfileSection = ({ user }) => {
  if (!user) return null;
  return (
    <div className="settings-profile-card">
      <div className="settings-profile-avatar">
        <img
          src={user.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}
          alt="Profile"
        />
      </div>
      <div className="settings-profile-info">
        <h4 className="settings-profile-name">
          <User className="settings-profile-icon" />
          {user.name || user.email}
        </h4>
        <p className="settings-profile-email">{user.email}</p>
        <div className="settings-profile-meta">
          <span className="settings-profile-role">
            {user.role || 'student'}
          </span>
          <span className="settings-profile-joined">
            Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Main Settings Page Component
const SettingsPage = () => {
  // Core data states
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError('');
      try {
        const user = await apiService.getCurrentUser();
        setUser(user);
      } catch (err) {
        setError(err.message || 'Failed to load user');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-root">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">My Profile</h1>
          <p className="settings-subtitle">
            View and manage your account information.
          </p>
        </div>
        <ProfileSection user={user} />
        {/* Add more settings sections here if needed */}
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <ThemeProvider>
      <div className="App">
        <SettingsPage />
      </div>
    </ThemeProvider>
  );
};

export default App;