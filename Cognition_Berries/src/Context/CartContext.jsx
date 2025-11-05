// src/Context/CartContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../utils/firebase";
import { getCart } from "../config/api";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch cart when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const data = await getCart();
          setCart(data || []);
        } catch (error) {
          console.error("❌ Failed to fetch cart:", error);
          setCart([]);
        }
      } else {
        setCart([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add, remove, or clear cart
  const addToCart = (item) => setCart((prev) => [...prev, item]);
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((item) => item.id !== id));
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

// ✅ Export the custom hook (the missing piece)
export const useCart = () => useContext(CartContext);
