// src/utils/api.js
import { auth } from '../utils/firebase';

// Fix API base URL format - ensure proper protocol
const API_BASE_URL = import.meta.env.VITE_BASE_API || '52.44.223.219'; // Single port, proper protocol format

export const getAuthHeaders = async () => {
  let user = auth.currentUser;

  // ⏳ Wait for Firebase to restore the session (max 2 seconds)
  if (!user) {
    console.warn("⏳ Waiting for Firebase to restore session...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    user = auth.currentUser;
  }

  // 🔁 If still no user, try pulling stored token
  if (!user) {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      console.log("📦 Using stored token from localStorage (no Firebase user)");
      return {
        Authorization: `Bearer ${savedToken}`,
        "Content-Type": "application/json",
      };
    }
    console.error("❌ No Firebase user or saved token");
    return { "Content-Type": "application/json" }; // fallback (won’t crash)
  }

  try {
    // ✅ Get fresh Firebase ID token
    const token = await user.getIdToken();
    localStorage.setItem("authToken", token); // keep synced
    console.log("✅ Got Firebase token (first 20 chars):", token.substring(0, 20) + "...");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  } catch (error) {
    console.error("❌ Error getting token:", error);
    return { "Content-Type": "application/json" }; // fallback to avoid hard crash
  }
};


export const apiRequest = async (url, options = {}) => {
  try {
    // Ensure URL is absolute
    const fullUrl = url.startsWith('http') ? url :  `${API_BASE_URL}${url}`;
    console.log('📡 API Request to:', fullUrl);
    
    const headers = await getAuthHeaders();
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    console.log('📥 Response status:', response.status);

    if (response.status === 401) {
      console.log('🔄 Got 401, attempting token refresh...');
      
      const user = auth.currentUser;
      if (user) {
        // Force token refresh
        const newToken = await user.getIdToken(true);
        console.log('✅ Refreshed token (first 20 chars):', newToken.substring(0, 20) + '...');
        
        const retryResponse = await fetch(fullUrl, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        console.log('📥 Retry response status:', retryResponse.status);
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          console.error('❌ Retry failed:', retryResponse.status, errorText);
          throw new Error(`HTTP ${retryResponse.status}: ${errorText}`);
        }
        return retryResponse;
      } else {
        console.error('❌ No current user for token refresh');
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('❌ API Request failed:', error);
    throw error;
  }
};

// Helper for making API calls without auth (for public endpoints)
export const publicApiRequest = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  try {
    console.log('📡 Public API Request to:', fullUrl);

    // Give Firebase a short moment to restore auth state (useful on page load)
    if (!auth.currentUser) {
      // small, non-blocking wait to allow Firebase to rehydrate
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // If there's a stored token in localStorage (kept in sync by getAuthHeaders), include it.
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    const headers = {
      'Content-Type': 'application/json',
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      ...options.headers,
    };

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    // If the server responds 401 for a public endpoint, we will attempt a safer retry.
    if (response.status === 401) {
      console.warn(`🔒 Public request returned 401 for ${fullUrl}`);

      // If there's an active Firebase user attempt an authenticated retry which forces token attach.
      const user = auth.currentUser;
      if (user) {
        console.log('🔁 Retrying as authenticated request because user is signed in:', user.email || 'unknown');
        return apiRequest(url, options);
      }

      // If there is a stored token but the server still rejects it, surface a clearer error.
      if (storedToken) {
        const text = await response.text().catch(() => 'Unauthorized');
        console.error('Public API returned 401 even when a stored token was sent:', text);
        throw new Error(`HTTP 401: ${text}`);
      }

      // No user and no stored token: the endpoint requires auth.
      throw new Error('HTTP 401: This endpoint requires authentication. Sign in to continue.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Public API Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('Public API request failed:', error);
    throw error;
  }
};

// Add this export for compatibility with code expecting API_CONFIG
export const API_CONFIG = {
  BASE_URL: API_BASE_URL
};

// Add this helper for handling 401/expired auth errors in UI
export const handleAuthError = (navigateOrCallback) => {
  // Remove tokens and user info
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  // If a navigate function is provided, redirect to login
  if (typeof navigateOrCallback === "function") {
    navigateOrCallback("/login");
  } else if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// Enhanced error handling for cart requests
export const getCart = async () => {
  try {
    console.log('📝 Fetching cart from:', `${API_BASE_URL}/cart`);
    const response = await apiRequest("/cart", {
      method: "GET"
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch cart:", error);
    // Include more detailed error info
    throw new Error(`Cart fetch failed: ${error.message || 'Network error'}`);
  }
};