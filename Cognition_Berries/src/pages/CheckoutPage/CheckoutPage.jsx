import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../utils/firebase"; 
import { apiRequest, getAuthHeaders } from "../../config/api";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    phone: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    // 1️⃣ Redirect if no checkoutData
    const data = localStorage.getItem("checkoutData");
    if (!data) {
      navigate("/cart");
      return;
    }
    setCheckoutData(JSON.parse(data));

    // 2️⃣ Load Firebase user
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return; // user not signed in

      const nameParts = user.displayName?.split(" ") || [];

      setFormData((prev) => ({
        ...prev,
        email: user.email || "",
        firstName: nameParts[0] || prev.firstName,
        lastName: nameParts.slice(1).join(" ") || prev.lastName,
      }));
    });

    // 3️⃣ Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    return () => unsub();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ["email", "firstName", "lastName", "address", "city", "postalCode", "phone"];
    for (let field of required) {
      if (!formData[field].trim()) {
        alert(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (checkoutData.paymentMethod === "paystack") {
      handlePaystackPayment();
    } else {
      handleNormalPayment();
    }
  };

  const handlePaystackPayment = () => {
    if (!window.PaystackPop) {
      alert("Paystack failed to load. Refresh.");
      return;
    }

    setLoading(true);

    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: formData.email,
      amount: Math.round(checkoutData.summary.total * 100),
      currency: "ZAR",
      ref: `ORDER_${Date.now()}`,
      callback: (response) => {
        setLoading(false);
        finalizeOrder("paystack", response.reference);
      },
      onClose: () => {
        alert("Transaction not completed.");
        setLoading(false);
      },
    });

    handler.openIframe();
  };

  const handleNormalPayment = async () => {
    setLoading(true);
    await new Promise((res) => setTimeout(res, 1500));
    finalizeOrder(checkoutData.paymentMethod, null);
    setLoading(false);
  };

  const finalizeOrder = async (method, reference) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in first.");
        navigate("/login");
        return;
      }

      const headers = await getAuthHeaders();

      const response = await apiRequest("/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: formData.email,
          paymentMethod: method,
          paymentReference: reference,
          customer: formData,
          items: checkoutData.items,
          total: checkoutData.summary.total,
        }),
      });

      const data = await response.json();

      localStorage.removeItem("cart");
      localStorage.removeItem("checkoutData");

      navigate("/order-success", { state: { order: data.order } });
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Order failed: " + err.message);
    }
  };

  const getPaymentMethodName = (m) => {
    const map = {
      paypal: "PayPal",
      mastercard: "Mastercard",
      visa: "Visa",
      paystack: "Paystack",
      bitcoin: "Bitcoin",
      applepay: "Apple Pay",
    };
    return map[m] || m;
  };

  if (!checkoutData) return <div className="loading">Loading…</div>;

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        <div className="checkout-left">
          <form onSubmit={handleSubmit}>
            <h2>Checkout</h2>

            <div className="checkout-section">
              <h3>Contact Info</h3>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="checkout-section">
              <h3>Shipping Address</h3>
              <input type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleInputChange} />
              <input type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleInputChange} />
              <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} />
              <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleInputChange} />
              <input type="text" name="postalCode" placeholder="Postal code" value={formData.postalCode} onChange={handleInputChange} />
              <input type="tel" name="phone" placeholder="Phone number" value={formData.phone} onChange={handleInputChange} />
            </div>

            <div className="checkout-section">
              <h3>Payment Method</h3>
              <p>Selected: {getPaymentMethodName(checkoutData.paymentMethod)}</p>
              {checkoutData.paymentMethod === "paystack" && (
                <p>You’ll be prompted with Paystack popup.</p>
              )}
            </div>

            <button type="submit" className="place-order-btn" disabled={loading}>
              {loading ? "Processing…" : `Pay R${checkoutData.summary.total.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="checkout-right">
          <div className="order-summary">
            <h3>Order Summary</h3>
            {checkoutData.items.map((item) => (
              <div key={item._id} className="order-item">
                <span>{item.title} (x{item.quantity})</span>
                <span>R{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-total">
              <span>Total</span>
              <span>R{checkoutData.summary.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
