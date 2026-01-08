import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// Simple in-memory cache for products
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ✅ Get all products (Public) - with caching
router.get("/", async (req, res) => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (productsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log("Serving products from cache");
      return res.json(productsCache);
    }

    // Fetch from database
    const products = await Product.find().lean(); // Use .lean() for faster queries
    
    // Update cache
    productsCache = products;
    cacheTimestamp = now;
    
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ✅ Get single product by ID (Public)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Error fetching product" });
  }
});

// ✅ Create single product (Admin only)
router.post("/", async (req, res) => {
  try {
    const { name, category, description, imageUrl, variants, inStock } = req.body;
    
    console.log('Creating product with data:', { name, category, description, imageUrl, variants, inStock });
    
    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({ message: "Name and category are required" });
    }

    const product = new Product({
      name,
      category,
      description,
      imageUrl,
      variants: variants || [],
      inStock: inStock !== undefined ? inStock : true
    });

    const savedProduct = await product.save();
    console.log('Saved product:', savedProduct);
    
    // Invalidate cache
    productsCache = null;
    cacheTimestamp = null;
    
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
});

// ✅ Update product by ID (Admin only)
router.put("/:id", async (req, res) => {
  try {
    const { name, category, description, imageUrl, variants, inStock } = req.body;
    
    console.log('Updating product', req.params.id, 'with data:', { name, category, description, imageUrl, variants, inStock });
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update fields
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (variants !== undefined) product.variants = variants;
    if (inStock !== undefined) product.inStock = inStock;

    const updatedProduct = await product.save();
    console.log('Updated product:', updatedProduct);
    
    // Invalidate cache
    productsCache = null;
    cacheTimestamp = null;
    
    res.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
});

// ✅ Delete product by ID (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Invalidate cache
    productsCache = null;
    cacheTimestamp = null;
    
    res.json({ message: "Product deleted successfully", product });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
});

// ✅ Add multiple products (Admin bulk import)
router.post("/bulk", async (req, res) => {
  try {
    const products = await Product.insertMany(req.body);
    res.status(201).json(products);
  } catch (error) {
    console.error("Error adding products:", error);
    res.status(500).json({ message: "Error adding products", error });
  }
});

export default router;
