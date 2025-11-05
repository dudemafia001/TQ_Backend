import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ✅ Add multiple products
router.post("/addProducts", async (req, res) => {
  try {
    const products = await Product.insertMany(req.body);
    res.status(201).json(products);
  } catch (error) {
    console.error("Error adding products:", error);
    res.status(500).json({ message: "Error adding products", error });
  }
});

// ✅ Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

export default router;
