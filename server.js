import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import config from "./src/config/config.js";

import authRoutes from "./src/routes/auth.js";
import productRoutes from "./src/routes/productRoutes.js";
import couponRoutes from "./src/routes/couponRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import contactRoutes from "./src/routes/contactRoutes.js";
import otpRoutes from "./src/routes/otpRoutes.js";

const app = express();
app.use(cors({ origin: config.cors.allowedOrigins }));

app.use(express.json());

// MongoDB connection
mongoose
  .connect(config.database.mongoUri)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/otp", otpRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Start server
app.listen(config.server.port, () => {
  console.log(`🚀 Server running on port ${config.server.port}`);
  console.log(`🌍 Environment: ${config.server.environment}`);
  console.log(`🔗 CORS allowed origins: ${config.cors.allowedOrigins.join(', ')}`);
});
