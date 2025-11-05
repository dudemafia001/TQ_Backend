import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  type: { type: String, enum: ["Half", "Full"], required: true },
  price: { type: Number, required: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },
  variants: [variantSchema],
  inStock: { type: Boolean, default: true },
  createdDate: { type: Date, default: Date.now }
});

const Product = mongoose.model("Product", productSchema);

export default Product;
