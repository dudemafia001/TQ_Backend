import mongoose from "mongoose";

// Stores order details temporarily when a Razorpay order is created.
// Used by the webhook to create the real order if the frontend flow is interrupted.
const pendingOrderSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true, index: true },
  orderDetails: { type: mongoose.Schema.Types.Mixed, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hours
});

const PendingOrder = mongoose.model("PendingOrder", pendingOrderSchema);

export default PendingOrder;
