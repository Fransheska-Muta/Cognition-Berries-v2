import React, { useMemo, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import "./Orders-summary.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const OrdersSummary = () => {
  const location = useLocation();
  const { order } = location.state || {};

  const receiptRef = useRef(null);

  const downloadReceiptPDF = async () => {
    if (!receiptRef.current) return;

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2, // improves sharpness
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);

    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    pdf.save(`receipt-${order._id}.pdf`);
  };

  if (!order) {
    return (
      <div className="orders-summary-empty">
        <div className="paper">
          <h2>No Order Found</h2>
          <p>It looks like you haven't placed an order yet.</p>
          <Link to="/" className="link-btn">Go to Home</Link>
        </div>
      </div>
    );
  }

  const {
    items = [],
    totalAmount = 0,
    _id,
    createdAt,
    paymentMethod = "N/A",
    customer,
    companyName,
    companyEmail,
    companyPhone,
    shippingFee,
    vatRate,
  } = order;

  const formatCurrency = (value) => {
    const n = Number(value || 0);
    return `R ${n.toFixed(2)}`;
  };

  const parseMoney = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.-]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const {
    lineItems,
    computedShipping,
    computedVatRate,
    vatAmount,
    grandTotal,
  } = useMemo(() => {
    const rows = items.map((item) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = parseMoney(item.price);
      const rowTotal = unitPrice * qty;
      return {
        description: item.title || "Untitled",
        qty,
        unitPrice,
        rowTotal,
      };
    });

    const subtotal = rows.reduce((sum, r) => sum + r.rowTotal, 0);

    const ship = shippingFee != null ? parseMoney(shippingFee) : 0;
    const rate = vatRate != null ? Number(vatRate) : 0.15;

    const base = subtotal + ship;
    const computedVat = base * rate;

    const finalTotal =
      totalAmount !== 0 ? parseMoney(totalAmount) : base + computedVat;

    return {
      lineItems: rows,
      computedShipping: ship,
      computedVatRate: rate,
      vatAmount: computedVat,
      grandTotal: finalTotal,
    };
  }, [items, shippingFee, vatRate, totalAmount]);

  const dateLabel = createdAt
    ? new Date(createdAt).toLocaleDateString()
    : "N/A";

  return (
    <div className="orders-summary-page">

      {/* ✅ Toolbar (NOT included in PDF) */}
      <div className="receipt-toolbar">
        <button className="link-btn" onClick={downloadReceiptPDF}>
          Download PDF
        </button>

        <Link to="/" className="link-btn outline">
          Back to Home
        </Link>
      </div>

      {/* ✅ Receipt (THIS is captured) */}
      <div className="paper" ref={receiptRef}>
        <header className="doc-header">
          <div className="company">
            <div className="company-name">
              {companyName || "Cognition Berries"}
            </div>
            <div className="company-meta">
              {companyEmail || "support@cognitionberries.com"}
              {companyPhone ? `, ${companyPhone}` : ""}
            </div>
          </div>

          <h1 className="doc-title">Delivery Order</h1>
        </header>

        <section className="doc-info">
          <div className="info-grid">
            <div className="info-col">
              <div className="info-row">
                <span className="label">Order Number:</span>
                <span className="value">{_id || "N/A"}</span>
              </div>

              <div className="info-row">
                <span className="label">Requested by:</span>
                <span className="value">
                  {customer?.name || customer?.fullName || "N/A"}
                </span>
              </div>

              <div className="info-row">
                <span className="label">Address:</span>
                <span className="value">{customer?.address || "N/A"}</span>
              </div>

              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{customer?.email || "N/A"}</span>
              </div>

              <div className="info-row">
                <span className="label">Date:</span>
                <span className="value">{dateLabel}</span>
              </div>
            </div>

            <div className="info-col right">
              <div className="info-row">
                <span className="label">Payment Method:</span>
                <span className="value">{paymentMethod}</span>
              </div>

              <div className="info-row">
                <span className="label">Status:</span>
                <span className="value badge">Paid</span>
              </div>
            </div>
          </div>
        </section>

        <section className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {lineItems.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.description}</td>
                  <td>{row.qty}</td>
                  <td>{formatCurrency(row.unitPrice)}</td>
                  <td>{formatCurrency(row.rowTotal)}</td>
                </tr>
              ))}

              <tr className="summary-row">
                <td>Shipping</td>
                <td>1</td>
                <td>-</td>
                <td>{formatCurrency(computedShipping)}</td>
              </tr>

              <tr className="summary-row">
                <td>VAT</td>
                <td colSpan="2">{(computedVatRate * 100).toFixed(0)}%</td>
                <td>{formatCurrency(vatAmount)}</td>
              </tr>

              <tr className="grand-total-row">
                <td colSpan="3">Total</td>
                <td>{formatCurrency(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default OrdersSummary;
