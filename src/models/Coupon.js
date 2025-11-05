import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discount_type: { type: String, enum: ["percent", "flat"], required: true },
  discount_value: { type: Number, required: true },
  max_discount: { type: Number, default: null },
  min_purchase_amount: { type: Number, required: true },
  valid_from: { type: Date, required: true },
  valid_to: { type: Date, required: true },
  usage_limit: { type: Number, default: null },
  usage_limit_per_user: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
  description: { type: String, required: true },
  applicable_users: [{ type: String }], // Array of user IDs
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update the updated_at field before saving
couponSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
