import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Order from "../models/Order.js";

const router = express.Router();

// Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({ 
      message: "Admin login successful", 
      userId: user._id,
      username: user.username,
      role: user.role 
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all orders with filtering
router.get("/orders", async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    // Filter by status
    if (status && status !== 'all') {
      filter.orderStatus = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        // Start of the day (00:00:00.000)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // End of the day (23:59:59.999) to make it inclusive
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(filter);

    res.json({
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update order status
router.patch("/orders/:orderId/status", async (req, res) => {
  try {
    // URL decode the orderId to handle special characters like # in TQ1234#
    const orderId = decodeURIComponent(req.params.orderId);
    const { status } = req.body;

    const validStatuses = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findOneAndUpdate(
      { orderId },
      { 
        orderStatus: status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get dashboard analytics
router.get("/analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        // Start of the day (00:00:00.000)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        // End of the day (23:59:59.999) to make it inclusive
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Total orders and revenue
    const totalOrders = await Order.countDocuments(filter);
    
    const revenueResult = await Order.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: null,
          totalRevenue: { $sum: "$pricing.finalTotal" },
          averageOrderValue: { $avg: "$pricing.finalTotal" }
        }
      }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Orders by date (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Start of day 7 days ago

    const ordersByDate = await Order.aggregate([
      { 
        $match: { 
          ...filter,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.finalTotal" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    // Top selling items
    const topItems = await Order.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    const analytics = {
      totalOrders,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      averageOrderValue: revenueResult[0]?.averageOrderValue || 0,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      ordersByDate,
      topItems
    };

    res.json(analytics);
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single order details
router.get("/orders/:orderId", async (req, res) => {
  try {
    // URL decode the orderId to handle special characters like # in TQ1234#
    const orderId = decodeURIComponent(req.params.orderId);
    console.log('Fetching order with ID:', orderId);
    
    const order = await Order.findOne({ orderId });

    if (!order) {
      console.log('Order not found:', orderId);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log('Order found successfully:', orderId);
    res.json(order);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;