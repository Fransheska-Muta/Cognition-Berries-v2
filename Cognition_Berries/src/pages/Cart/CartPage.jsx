import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";
import Navbar from "../../components/Navbar/Navbar";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("paypal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const BaseAPI = import.meta.env.VITE_BASE_API;

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      return null;
    }
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  // Handle authentication errors
  const handleAuthError = () => {
    setError("Your session has expired. Please log in again.");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setTimeout(() => navigate("/login"), 2000);
  };

  // Load cart from API with better error handling
  const loadCart = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setError("Please log in to view your cart");
        setCart([]);
        return;
      }

      const response = await fetch(`${BaseAPI}/cart`, {
        headers
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (response.status === 404) {
        // Empty cart is OK
        setCart([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load cart: ${response.status} ${response.statusText}`);
      }

      const cartItems = await response.json();
      setCart(Array.isArray(cartItems) ? cartItems : []);
      
    } catch (error) {
      console.error("Failed to load cart:", error);
      setError(`Failed to load cart: ${error.message}`);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const subtotal = cart.reduce(
  (sum, item) =>
    sum +
    (parseFloat(String(item.price).replace("R", "")) || 0) *
      (parseInt(item.quantity) || 1),
  0
);


  const discount = appliedCoupon?.percent && subtotal > 0
    ? (subtotal * appliedCoupon.percent) / 100
    : 0;

  const delivery = subtotal > 0
    ? (appliedCoupon?.freeShipping ? 0 : 29.99)
    : 0;

  const tax = subtotal > 0 ? 39.99 : 0;
  const total = Math.max(0, subtotal - discount + delivery + tax);

  const handleQuantity = async (id, delta) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setError("Please log in to update cart items");
        return;
      }

      const item = cart.find(item => item._id === id);
      if (!item) {
        console.error("Item not found in cart:", id);
        return;
      }

      const currentQty = parseInt(item.quantity) || 1;
      const newQuantity = Math.max(1, currentQty + delta);

      const response = await fetch(`${BaseAPI}/cart/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (response.status === 400) {
        const errorData = await response.json();
        setError(errorData.error || "Invalid request");
        return;
      }

      if (response.status === 404) {
        setError("Cart item not found. Refreshing cart...");
        loadCart(); // Refresh the cart
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to update quantity: ${response.status} ${response.statusText}`);
      }

      const updatedItem = await response.json();
      const updatedCart = cart.map((i) =>
        i._id === id ? { ...i, quantity: parseInt(updatedItem.quantity) || 1 } : i
      );
      setCart(updatedCart);
      setError(null); // Clear any previous errors

    } catch (error) {
      console.error("Error updating quantity:", error);
      setError(`Error updating quantity: ${error.message}`);
    }
  };

  const handleRemove = async (id) => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setError("Please log in to remove cart items");
        return;
      }

      const response = await fetch(`${BaseAPI}/cart/${id}`, {
        method: "DELETE",
        headers,
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (response.status === 400) {
        const errorData = await response.json();
        setError(errorData.error || "Invalid request");
        return;
      }

      if (response.status === 404) {
        // Item already deleted, remove from local state
        console.log("Item already deleted from server");
      } else if (!response.ok) {
        throw new Error(`Failed to remove item: ${response.status} ${response.statusText}`);
      }

      // Update local state regardless of 404 (item might be already gone)
      const updatedCart = cart.filter((item) => item._id !== id);
      setCart(updatedCart);
      setError(null); // Clear any previous errors

    } catch (error) {
      console.error("Error removing item:", error);
      setError(`Error removing item: ${error.message}`);
    }
  };

  const clearCart = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        setError("Please log in to clear your cart");
        return;
      }

      // Use the bulk delete endpoint
      const response = await fetch(`${BaseAPI}/cart`, {
        method: "DELETE",
        headers,
      });

      if (response.status === 401) {
        handleAuthError();
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to clear cart: ${response.status} ${response.statusText}`);
      }

      setCart([]);
      setError(null);
      
    } catch (error) {
      console.error("Error clearing cart:", error);
      setError(`Error clearing cart: ${error.message}`);
      // Try to reload cart to get current state
      loadCart();
    }
  };

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) {
      setError("Please enter a coupon code");
      return;
    }

    // Example coupon codes
    if (code === "SAVE10") {
      setAppliedCoupon({ code, percent: 10 });
      setCoupon("");
      setError(null);
      alert("Coupon applied: 10% off!");
    } else if (code === "FREESHIP") {
      setAppliedCoupon({ code, freeShipping: true });
      setCoupon("");
      setError(null);
      alert("Coupon applied: Free shipping!");
    } else if (code === "SAVE20") {
      setAppliedCoupon({ code, percent: 20 });
      setCoupon("");
      setError(null);
      alert("Coupon applied: 20% off!");
    } else {
      setError("Invalid coupon code");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setError(null);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError("Your cart is empty!");
      return;
    }

    // Prepare checkout data
    const checkoutData = {
      items: cart,
      summary: {
        subtotal,
        discount,
        delivery,
        tax,
        total
      },
      coupon: appliedCoupon,
      paymentMethod: selectedPayment
    };

    // Store checkout data for the checkout page
    localStorage.setItem("checkoutData", JSON.stringify(checkoutData));

    // Navigate to checkout page
    navigate("/checkout");
  };

  const paymentMethods = [
    { id: "paypal", name: "PayPal", icon: "💳", color: "#0070ba" },
    { id: "mastercard", name: "Mastercard", icon: "💳", color: "#eb001b" },
    { id: "visa", name: "Visa", icon: "💳", color: "#1a1f71" },
    { id: "paystack", name: "Paystack", icon: "💰", color: "#00d4ff" },
    { id: "bitcoin", name: "Bitcoin", icon: "₿", color: "#f7931a" },
    { id: "applepay", name: "Apple Pay", icon: "🍎", color: "#000000" }
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="cart-container">
          <p>Loading cart...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="cart-container">
        {error && (
          <div className="error-message" style={{ 
            background: '#ffe6e6', 
            border: '1px solid #ffcccc', 
            padding: '10px', 
            margin: '10px 0', 
            borderRadius: '4px',
            color: '#d00'
          }}>
            {error}
            <button 
              onClick={() => setError(null)} 
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                fontSize: '16px', 
                cursor: 'pointer' 
              }}
            >
              ×
            </button>
          </div>
        )}
        
        <div className="cart-wrapper">
          <div className="cart-left">
            <div className="cart-box">
              <h2 className="cart-title">Shopping Cart</h2>
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <p>Your cart is empty.</p>
                  <button
                    className="continue-shopping-btn"
                    onClick={() => navigate("/extra-material")}
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items-header">
                    <span>Product</span>
                    <span>Quantity</span>
                    <span>Price</span>
                    <span>Action</span>
                  </div>
                  <div className="cart-items">
                    {cart.map((item) => (
                      <div key={item._id} className="cart-item">
                        <div className="item-product">
                          <img
                            src={"./Books.png"}
                            alt=''
                            className="item-image"
                          />
                          <div className="item-details">
                            <div className="item-name">{item.title}</div>
                            <div className="item-color">Author: {item.author || "Unknown"}</div>
                          </div>
                        </div>
                        <div className="item-quantity">
                          <button
                            className="qty-btn"
                            onClick={() => handleQuantity(item._id, -1)}
                            disabled={parseInt(item.quantity) === 1}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="qty-input"
                            value={parseInt(item.quantity) || 1}
                            min={1}
                            readOnly
                          />
                          <button
                            className="qty-btn"
                            onClick={() => handleQuantity(item._id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="item-price">
                          R{((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}
                        </div>
                        <button
                          className="remove-btn"
                          onClick={() => handleRemove(item._id)}
                          title="Remove item"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="cart-actions">
                <button
                  className="back-btn"
                  onClick={() => navigate(-1)}
                >
                  ← Continue Shopping
                </button>
                <button
                  className="clear-cart-btn"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear your cart?")) {
                      clearCart();
                    }
                  }}
                  disabled={cart.length === 0}
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>

          <div className="cart-right">
            {/* Coupon Code Section */}
            <div className="cart-box">
              <h3 className="box-title">Coupon Code</h3>
              <div className="coupon-section">
                <input
                  type="text"
                  className="coupon-input"
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <button className="apply-coupon-btn" onClick={applyCoupon}>
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <div className="applied-coupon">
                  <span>Applied: {appliedCoupon.code}</span>
                  <button className="remove-coupon-btn" onClick={removeCoupon}>
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="cart-box">
              <h3 className="box-title">Order Summary</h3>
              <div className="summary-line">
                <span>Subtotal</span>
                <span>R{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-line discount">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-R{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-line">
                <span>Delivery</span>
                <span>{delivery === 0 ? "FREE" : `R${delivery.toFixed(2)}`}</span>
              </div>
              <div className="summary-line">
                <span>Tax</span>
                <span>R{tax.toFixed(2)}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>R{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="cart-box">
              <h3 className="box-title">Payment Method</h3>
              <div className="payment-methods">
                {paymentMethods.map((method) => (
                  <label key={method.id} className="payment-method">
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={selectedPayment === method.id}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <div className="payment-option">
                      <span className="payment-icon" style={{ color: method.color }}>
                        {method.icon}
                      </span>
                      <span className="payment-name">{method.name}</span>
                    </div>
                  </label>
                ))}
              </div>

              <button
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}