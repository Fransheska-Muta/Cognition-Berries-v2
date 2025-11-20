import React, { useState } from 'react';

const PaymentComponent = ({ userEmail, amount, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const initializePayment = async () => {
    setLoading(true);
    
    try {
      // First, initialize transaction on your backend
      const response = await fetch('/api/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${userEmail}:password`)}`
        },
        body: JSON.stringify({
          email: userEmail,
          amount: amount,
          callback_url: `${window.location.origin}/verify-payment`
        })
      });

      const data = await response.json();

      // Use Paystack Popup with your public key
      const handler = window.PaystackPop.setup({
        key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY,
        email: userEmail,
        amount: amount * 100, // Convert to kobo
        currency: 'NGN',
        ref: data.reference, // Use reference from backend
        callback: function(response) {
          console.log('Payment successful:', response.reference);
          verifyPayment(response.reference);
        },
        onClose: function() {
          console.log('Payment cancelled');
          setLoading(false);
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization failed:', error);
      setLoading(false);
    }
  };

  const verifyPayment = async (reference) => {
    try {
      const response = await fetch(`/api/verify-payment/${reference}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${userEmail}:password`)}`
        }
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        onSuccess(result.data);
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={initializePayment} 
        disabled={loading}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        {loading ? 'Processing...' : `Pay ₦${amount}`}
      </button>
      
      {/* Include Paystack script */}
      <script src="https://js.paystack.co/v1/inline.js"></script>
    </div>
  );
};

export default PaymentComponent;