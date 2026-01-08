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
import siteStatusRoutes from "./src/routes/siteStatusRoutes.js";

const app = express();
app.use(cors({ 
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB connection with better error handling for Vercel
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("Using existing database connection");
    return;
  }

  try {
    const db = await mongoose.connect(config.database.mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds for cloud DB
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Connection pool for better performance
      minPoolSize: 2,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
    throw err;
  }
};

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ 
      message: "Database connection error", 
      error: error.message 
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/site", siteStatusRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(config.server.port, () => {
    console.log(`🚀 Server running on port ${config.server.port}`);
    console.log(`🌍 Environment: ${config.server.environment}`);
    console.log(`🔗 CORS allowed origins: ${config.cors.allowedOrigins.join(', ')}`);
  });
}

// Export for Vercel serverless
export default app;
