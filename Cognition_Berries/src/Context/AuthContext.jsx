import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 Setting up auth state listener...');
    
    // Firebase handles auth state persistence automatically
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('👤 Auth state changed:', user ? `User: ${user.email || user.phoneNumber}` : 'No user');
      
      if (user) {
        // User is signed in
        console.log('✅ User authenticated:', {
          uid: user.uid,
          email: user.email,
          phoneNumber: user.phoneNumber
        });
        
        // Store token in localStorage for API calls
        try {
          const token = await user.getIdToken();
          localStorage.setItem('authToken', token);
          console.log('💾 Token stored in localStorage');
        } catch (error) {
          console.error('❌ Error getting token:', error);
        }
      } else {
        // User is signed out
        console.log('🚪 User signed out');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('phoneNumber');
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      console.log('🔓 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    loading
  };

  // Don't render children until we know the auth state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};