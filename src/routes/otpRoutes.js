import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Generate and send OTP
router.post("/generate", async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({ message: "Please provide a valid 10-digit mobile number" });
  }

  try {
    // Find user by mobile number
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found with this mobile number" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration to 5 minutes from now
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Update user with OTP and expiration
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // In production, send OTP via SMS service (Twilio, etc.)
    // For development, we'll just log it
    console.log(`OTP for ${mobile}: ${otp}`);

    res.json({ 
      message: "OTP sent successfully", 
      // Remove this in production - only for development
      developmentOtp: otp 
    });
  } catch (err) {
    console.error("OTP generation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify OTP
router.post("/verify", async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ message: "Mobile number and OTP are required" });
  }

  try {
    // Find user by mobile number
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP exists and hasn't expired
    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ message: "No OTP generated for this number" });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ 
      message: "OTP verified successfully", 
      userId: user._id,
      username: user.username
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;