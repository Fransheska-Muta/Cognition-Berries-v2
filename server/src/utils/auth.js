// utils/auth.js
// Utility functions for handling Firebase authentication in the frontend

import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Get authentication headers for API calls
 * @returns {Object|null} Headers object or null if not authenticated
 */
export const getAuthHeaders = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.warn("No auth token found in localStorage");
    return null;
  }

  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };
};

/**
 * Get current user info from localStorage
 * @returns {Object|null} User object or null if not found
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Error parsing user from localStorage:", error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("authToken");
  const user = getCurrentUser();
  return !!(token && user);
};

/**
 * Clear authentication data
 */
export const clearAuth = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

/**
 * Handle API authentication errors
 * @param {Response} response - Fetch response object
 * @param {Function} navigate - React Router navigate function
 * @returns {boolean} True if auth error was handled
 */
export const handleAuthError = (response, navigate = null) => {
  if (response.status === 401) {
    console.warn("Authentication failed - clearing auth data");
    clearAuth();
    
    if (navigate) {
      navigate("/login");
    } else {
      window.location.href = "/login";
    }
    
    return true;
  }
  return false;
};

/**
 * Refresh the auth token if needed
 * @returns {Promise<string|null>} New token or null if refresh failed
 */
export const refreshAuthToken = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      const newToken = await user.getIdToken(true); // Force refresh
      localStorage.setItem("authToken", newToken);
      return newToken;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to refresh auth token:", error);
    return null;
  }
};

/**
 * Make authenticated API call with automatic error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {Function} navigate - React Router navigate function
 * @returns {Promise<Response>} Fetch response
 */
export const authenticatedFetch = async (url, options = {}, navigate = null) => {
  let headers = await getAuthHeaders();
  
  if (!headers) {
    throw new Error("Not authenticated");
  }

  // Merge with existing headers
  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  };

  const response = await fetch(url, fetchOptions);

  // Handle auth errors
  if (handleAuthError(response, navigate)) {
    throw new Error("Authentication failed");
  }

  return response;
};

/**
 * Set up Firebase auth state listener
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  const auth = getAuth();
  
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Update token in localStorage
        const token = await user.getIdToken();
        localStorage.setItem("authToken", token);
        
        // Update user info
        const userInfo = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email
        };
        localStorage.setItem("user", JSON.stringify(userInfo));
        
        callback({ user: userInfo, authenticated: true });
      } catch (error) {
        console.error("Error updating auth state:", error);
        callback({ user: null, authenticated: false });
      }
    } else {
      // User signed out
      clearAuth();
      callback({ user: null, authenticated: false });
    }
  });
};