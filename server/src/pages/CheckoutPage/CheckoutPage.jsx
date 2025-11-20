import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState(null);
  const BaseAPI = import.meta.env.VITE_BASE_API
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
    const data = localStorage.getItem("checkoutData");
    if (!data) {
      navigate("/cart");
      return;
    }
    setCheckoutData(JSON.parse(data));

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        firstName: user.firstName || user.name?.split(" ")[0] || "",
        lastName: user.lastName || user.name?.split(" ").slice(1).join(" ") || ""
      }));
    }

    // Load Paystack script dynamically
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const required = ["email", "firstName", "lastName", "address", "city", "postalCode", "phone"];
    for (let field of required) {
      if (!formData[field].trim()) {
        alert(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
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
  const handler = window.PaystackPop.setup({
    key: "pk_test_xxxxxxxx", // Replace with your public key
    email: "customer@email.com",
    amount: 5000 * 100, // amount in kobo
    currency: "ZAR", // or NGN, USD, etc.
    callback: function(response) {
      alert("Payment successful! Reference: " + response.reference);
    },
    onClose: function() {
      alert("Transaction was not completed.");
    }
  });

  handler.openIframe();
};

  const handleNormalPayment = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      finalizeOrder(checkoutData.paymentMethod, null);
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

const finalizeOrder = async (method, reference) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const authHeader = "Basic " + btoa(`${user.email}:${user.password}`);

    const res = await fetch(`http://${BaseAPI}:3000/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader, // ✅ Needed because of global basicAuth
      },
      body: JSON.stringify({
        email: user.email,
        paymentMethod: method,
        customer: formData,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Checkout failed");
    }

    const data = await res.json();
    console.log("Order saved:", data);

    localStorage.removeItem("cart");
    localStorage.removeItem("checkoutData");

    navigate("/order-success", { state: { order: data.order } });
  } catch (error) {
    console.error("Finalize order error:", error);
    alert(error.message);
  }
};



  const getPaymentMethodName = (method) => {
    const methods = {
      paypal: "PayPal",
      mastercard: "Mastercard",
      visa: "Visa",
      paystack: "Paystack",
      bitcoin: "Bitcoin",
      applepay: "Apple Pay"
    };
    return methods[method] || method;
  };

  if (!checkoutData) return <div className="loading">Loading...</div>;

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        <div className="checkout-left">
          <form onSubmit={handleSubmit}>
            <h2>Checkout</h2>

            {/* Contact */}
            <div className="checkout-section">
              <h3>Contact Information</h3>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Address */}
            <div className="checkout-section">
              <h3>Shipping Address</h3>
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
              <input
                type="text"
                name="postalCode"
                placeholder="Postal code"
                value={formData.postalCode}
                onChange={handleInputChange}
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Payment Info */}
            <div className="checkout-section">
              <h3>Payment Method</h3>
              <p>Selected: {getPaymentMethodName(checkoutData.paymentMethod)}</p>
              {checkoutData.paymentMethod === "paystack" && (
                <p>You’ll be prompted with Paystack’s secure popup.</p>
              )}
            </div>

            <button type="submit" className="place-order-btn" disabled={loading}>
              {loading ? "Processing..." : `Pay R${checkoutData.summary.total.toFixed(2)}`}
            </button>
          </form>
        </div>

        {/* Sidebar */}
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
