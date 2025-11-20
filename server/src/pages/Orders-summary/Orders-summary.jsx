import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Orders-summary.css';

const OrdersSummary = () => {
  const location = useLocation();
  const { order } = location.state || {};

  if (!order) {
    return (
      <div className="orders-summary-empty">
        <h2>No Order Found</h2>
        <p>It looks like you haven't placed an order yet.</p>
        <Link to="/">Go to Home</Link>
      </div>
    );
  }

  const {
    items = [],
    totalAmount = 0,
    _id,
    createdAt,
    paymentMethod = "N/A",
    customer
  } = order;

  return (
    <div className="orders-summary-container">
      <h2>Order Receipt</h2>
      <p><strong>Order ID:</strong> {_id}</p>
      <p><strong>Date:</strong> {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}</p>
      <p><strong>Payment Method:</strong> {paymentMethod}</p>
      <p><strong>Shipping Address:</strong> {customer?.address || "N/A"}</p>

      <hr />
      <h3>Items</h3>
      <ul className="orders-summary-items">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <li key={idx} className="orders-summary-item">
              <div>
                <strong>{item.title || "Untitled"}</strong> x {item.quantity || 1}
              </div>
              <div>Price: R{Number(item.price || 0).toFixed(2)}</div>
              <div>Subtotal: R{Number((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
            </li>
          ))
        ) : (
          <li>No items found in this order.</li>
        )}
      </ul>

      <hr />
      <h3>Total: R{Number(totalAmount).toFixed(2)}</h3>

      <div className="orders-summary-footer">
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
};

export default OrdersSummary;
