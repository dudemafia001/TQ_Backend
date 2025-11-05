import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true }, // Changed from ObjectId to String for frontend compatibility
  productName: { type: String, required: true },
  variant: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  orderNumber: { type: String, unique: true, sparse: true }, // Optional field for legacy compatibility
  userId: { type: String, required: true }, // Username from auth
  customerInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String }
  },
  deliveryAddress: {
    address: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number }
  },
  items: [orderItemSchema],
  pricing: {
    subtotal: { type: Number, required: true },
    packagingCharge: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    finalTotal: { type: Number, required: true }
  },
  paymentInfo: {
    method: { type: String, enum: ['online', 'cash'], required: true },
    paymentId: { type: String }, // Razorpay payment ID for online payments
    orderId: { type: String }, // Razorpay order ID for online payments
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
  },
  appliedCoupon: {
    code: { type: String },
    discount: { type: Number, default: 0 }
  },
  orderStatus: { 
    type: String, 
    enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'], 
    default: 'placed' 
  },
  estimatedDeliveryTime: { type: String }, // Will be calculated based on distance
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model("Order", orderSchema);

export default Order;