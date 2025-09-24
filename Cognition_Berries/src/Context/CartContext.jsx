// src/context/CartContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const Base_API = import.meta.env.VITE_BASE_API

  // Function to fetch cart count from server
  const fetchCartCount = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.email || !user?.password) {
        setCartCount(0);
        setCartItems([]);
        return;
      }

      const res = await fetch(
        `http://${Base_API}:3000/cart/${encodeURIComponent(user.email)}`,
        {
          headers: {
            Authorization: "Basic " + btoa(`${user.email}:${user.password}`),
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setCartItems(items);
        
        // Calculate total quantity (sum of all item quantities)
        const totalCount = items.reduce((sum, item) => {
          const quantity = typeof item.quantity === 'number' ? item.quantity : (item.qty || 1);
          return sum + quantity;
        }, 0);
        
        setCartCount(totalCount);
      } else {
        setCartCount(0);
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
      setCartItems([]);
    }
  };

  // Function to add item to cart
  const addToCart = async (item) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.email || !user?.password) {
        throw new Error('User must be logged in to add items to cart');
      }

      const res = await fetch(`http://${Base_API}:3000/cart`, {
        method: 'POST',
        headers: {
          Authorization: "Basic " + btoa(`${user.email}:${user.password}`),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user.email,
          title: item.title,
          price: item.price,
          image: item.image,
          quantity: item.quantity || 1
        }),
      });

      if (res.ok) {
        // Refresh cart count after adding
        await fetchCartCount();
        return true;
      } else {
        throw new Error('Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  };

  // Function to remove item from cart
  const removeFromCart = async (itemId) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.email || !user?.password) return false;

      const res = await fetch(`http://${Base_API}:3000/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: "Basic " + btoa(`${user.email}:${user.password}`),
        },
      });

      if (res.ok) {
        // Refresh cart count after removing
        await fetchCartCount();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  };

  // Function to update item quantity
  const updateCartItemQuantity = async (itemId, newQuantity) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.email || !user?.password) return false;

      const res = await fetch(`http://${Base_API}:3000/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          Authorization: "Basic " + btoa(`${user.email}:${user.password}`),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (res.ok) {
        // Refresh cart count after updating
        await fetchCartCount();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating cart item:', error);
      return false;
    }
  };

  // Clear cart (for logout)
  const clearCart = () => {
    setCartCount(0);
    setCartItems([]);
  };

  // Fetch cart count on component mount and when user changes
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.email) {
      fetchCartCount();
    } else {
      clearCart();
    }
  }, []);

  const value = {
    cartCount,
    cartItems,
    fetchCartCount,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};