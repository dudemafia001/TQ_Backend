import express from "express";
import User from "../models/User.js";
import { generateOTP, sendOTP, validateMobileNumber } from "../services/smsService.js";

const router = express.Router();

// Generate and send OTP
router.post("/generate", async (req, res) => {
  const { mobile } = req.body;

  if (!mobile || !validateMobileNumber(mobile)) {
    return res.status(400).json({ message: "Please provide a valid 10-digit mobile number" });
  }

  try {
    // Find user by mobile number
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found with this mobile number" });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    
    // Set OTP expiration to 5 minutes from now
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Update user with OTP and expiration
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateModifiedOnly: true });

    // Send OTP via SMS
    try {
      await sendOTP(mobile, otp);
      console.log(`OTP ${otp} sent successfully to ${mobile}`);
      
      res.json({ 
        message: "OTP sent successfully to your mobile number"
      });
    } catch (smsError) {
      console.error("SMS sending failed:", smsError);
      // Still return success but with development OTP for testing
      res.json({ 
        message: "OTP generated. SMS delivery may be delayed.",
        warning: "SMS service error",
        // Include OTP in development for testing if SMS fails
        developmentOtp: otp 
      });
    }
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
    await user.save({ validateModifiedOnly: true });

    res.json({ 
      message: "OTP verified successfully", 
      userId: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;