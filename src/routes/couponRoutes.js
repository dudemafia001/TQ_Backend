import express from "express";
import Coupon from "../models/Coupon.js";

const router = express.Router();

// ✅ Get all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Error fetching coupons" });
  }
});

// ✅ Get active coupons only
router.get("/active", async (req, res) => {
  try {
    const currentDate = new Date();
    const activeCoupons = await Coupon.find({
      is_active: true,
      valid_from: { $lte: currentDate },
      valid_to: { $gte: currentDate }
    });
    res.json(activeCoupons);
  } catch (error) {
    console.error("Error fetching active coupons:", error);
    res.status(500).json({ message: "Error fetching active coupons" });
  }
});

// ✅ Get coupon by code
router.get("/code/:code", async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ 
      code: req.params.code.toUpperCase(),
      is_active: true 
    });
    
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found or inactive" });
    }

    // Check if coupon is still valid
    const currentDate = new Date();
    if (currentDate < coupon.valid_from || currentDate > coupon.valid_to) {
      return res.status(400).json({ message: "Coupon has expired or not yet valid" });
    }

    res.json(coupon);
  } catch (error) {
    console.error("Error fetching coupon by code:", error);
    res.status(500).json({ message: "Error fetching coupon" });
  }
});

// ✅ Validate coupon for a specific order amount
router.post("/validate", async (req, res) => {
  try {
    const { code, orderAmount, userId } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({ message: "Coupon code and order amount are required" });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      is_active: true 
    });
    
    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    // Check validity period
    const currentDate = new Date();
    if (currentDate < coupon.valid_from || currentDate > coupon.valid_to) {
      return res.status(400).json({ message: "Coupon has expired or not yet valid" });
    }

    // Check minimum purchase amount
    if (orderAmount < coupon.min_purchase_amount) {
      return res.status(400).json({ 
        message: `Minimum order amount of ₹${coupon.min_purchase_amount} required` 
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === "percent") {
      discountAmount = (orderAmount * coupon.discount_value) / 100;
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.discount_value;
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    res.json({
      valid: true,
      coupon: coupon,
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
      finalAmount: Math.round((orderAmount - discountAmount) * 100) / 100
    });

  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ message: "Error validating coupon" });
  }
});

export default router;
