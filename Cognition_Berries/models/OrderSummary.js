// models/OrderSummary.js
import mongoose from "mongoose";

const orderSummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // assumes you have a User model
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", // assumes you have a Product model
        required: true,
      },
      name: String,      // so you don’t need to always populate product
      quantity: Number,
      price: Number,
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Completed", "Cancelled"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now, // automatically sets order date/time
  },
});

export default mongoose.model("OrderSummary", orderSummarySchema);
