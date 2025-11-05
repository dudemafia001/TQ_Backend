import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

// Create a new order
router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      customerInfo,
      deliveryAddress,
      items,
      pricing,
      paymentInfo,
      appliedCoupon
    } = req.body;

    // Generate order ID
    const orderId = paymentInfo.method === 'cash' 
      ? `CASH_${Date.now()}` 
      : `ORDER_${Date.now()}`;

    const newOrder = new Order({
      orderId,
      userId,
      customerInfo,
      deliveryAddress,
      items,
      pricing,
      paymentInfo,
      appliedCoupon: appliedCoupon || {}
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Get orders for a specific user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// Get a specific order by ID
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// Update order status
router.put("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderId },
      { orderStatus: status, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

export default router;