import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";


const router = express.Router();

// POST /api/auth/login - Login with username/password
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    return res.json({ 
      message: "Login successful", 
      userId: user._id, 
      username: user.username,
      fullName: user.fullName,
      email: user.email
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/signup - Sign up new user
router.post("/signup", async (req, res) => {
  const { username, fullName, email, mobile, password } = req.body;

  if (!username || !fullName || !email || !mobile || !password) {
    return res.status(400).json({ message: "Username, full name, email, mobile number, and password are required" });
  }

  try {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if mobile already exists
    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ message: "Mobile number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, fullName, email, mobile, password: hashedPassword });
    await user.save();
    
    return res.json({ 
      message: "Account created successfully", 
      userId: user._id, 
      username: user.username,
      fullName: user.fullName,
      email: user.email
    });
  } catch (err) {
    console.error("Signup error:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth - Legacy route (for backward compatibility)
router.post("/", async (req, res) => {
  const { username, mobile, password, fullName } = req.body;

  try {
    let user = await User.findOne({ username });

    if (user) {
      // Login existing user
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      return res.json({ 
        message: "Login successful", 
        userId: user._id, 
        username: user.username,
        fullName: user.fullName,
        email: user.email
      });
    } else {
      // Create new user (signup)
      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required for signup" });
      }

      if (!fullName) {
        return res.status(400).json({ message: "Full name is required for signup" });
      }

      if (!email) {
        return res.status(400).json({ message: "Email is required for signup" });
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if mobile already exists
      const existingMobile = await User.findOne({ mobile });
      if (existingMobile) {
        return res.status(400).json({ message: "Mobile number already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ username, fullName, email, mobile, password: hashedPassword });
      await user.save();
      return res.json({ 
        message: "User created & logged in", 
        userId: user._id, 
        username: user.username,
        fullName: user.fullName,
        email: user.email
      });
    }
  } catch (err) {
    console.error("Auth error:", err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/profile/:username - Get user profile
router.get("/profile/:username", async (req, res) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const user = await User.findOne({ username }).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ 
      success: true,
      user: {
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
