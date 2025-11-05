import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./src/models/User.js";

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });
    
    if (existingAdmin) {
      // Update existing user to admin
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log("✅ Updated existing admin user");
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      const admin = new User({
        username: "admin",
        password: hashedPassword,
        role: "admin"
      });

      await admin.save();
      console.log("✅ Created new admin user");
    }

    console.log("Admin credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("🚨 Please change these credentials in production!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdminUser();