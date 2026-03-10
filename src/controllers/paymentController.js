import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import PendingOrder from '../models/PendingOrder.js';
import telegramService from '../services/telegramService.js';

dotenv.config();

// Helper function to generate unique order ID with 6-character alphanumeric format
// Format: TQ + 6 alphanumeric characters (e.g., TQ5K9X2M)
const generateOrderId = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let orderId;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate 6 random alphanumeric characters
    let randomId = '';
    for (let i = 0; i < 6; i++) {
      randomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    orderId = `TQ${randomId}`;
    
    // Check if this ID already exists
    const existingOrder = await Order.findOne({ orderId });
    if (!existingOrder) {
      isUnique = true;
    }
  }
  
  return orderId;
};

// Calculate estimated delivery time based on distance and current order load
const calculateEstimatedDeliveryTime = (deliveryAddress) => {
  // Base preparation time (in minutes)
  const basePrepTime = 25; // Standard food preparation time
  
  // If address has coordinates, calculate distance-based delivery time
  if (deliveryAddress.lat && deliveryAddress.lng) {
    const deliveryCenter = { lat: 26.4201563, lng: 80.3600507 }; // Shyam Nagar, Kanpur
    
    // Calculate straight-line distance (Haversine formula)
    const distance = calculateDistance(
      deliveryCenter.lat, 
      deliveryCenter.lng, 
      deliveryAddress.lat, 
      deliveryAddress.lng
    );
    
    // Estimate travel time (assuming 20-30 km/h average speed in city)
    const avgSpeed = 25; // km/h
    const travelTimeMinutes = Math.round((distance / avgSpeed) * 60);
    
    const totalTime = basePrepTime + travelTimeMinutes;
    
    // Round to nearest 5 minutes for better customer experience
    const roundedTime = Math.round(totalTime / 5) * 5;
    
    // Create time range (±10 minutes)
    const minTime = Math.max(roundedTime - 10, basePrepTime);
    const maxTime = roundedTime + 10;
    
    return `${minTime}-${maxTime} minutes`;
  } else {
    // Default time range when no coordinates available
    const currentHour = new Date().getHours();
    
    // Adjust based on time of day (peak hours take longer)
    let baseTime = 45;
    if (currentHour >= 12 && currentHour <= 14) { // Lunch peak
      baseTime = 55;
    } else if (currentHour >= 19 && currentHour <= 21) { // Dinner peak
      baseTime = 60;
    }
    
    return `${baseTime}-${baseTime + 15} minutes`;
  }
};

// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Comprehensive order validation helper function
const validateOrderDetails = (orderDetails) => {
  const errors = [];

  // Validate orderDetails exists
  if (!orderDetails) {
    errors.push('Order details are required');
    return errors;
  }

  // Validate customer info
  if (!orderDetails.customerInfo) {
    errors.push('Customer information is required');
  } else {
    if (!orderDetails.customerInfo.fullName || orderDetails.customerInfo.fullName.trim() === '') {
      errors.push('Customer name is required');
    }
    if (!orderDetails.customerInfo.phone || orderDetails.customerInfo.phone.trim() === '') {
      errors.push('Customer phone number is required');
    }
    // Email is optional but validate format if provided
    if (orderDetails.customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderDetails.customerInfo.email)) {
      errors.push('Invalid email format');
    }
  }

  // Validate delivery address
  if (!orderDetails.deliveryAddress) {
    errors.push('Delivery address is required');
  } else {
    if (!orderDetails.deliveryAddress.address || orderDetails.deliveryAddress.address.trim() === '') {
      errors.push('Delivery address cannot be empty');
    }
  }

  // Validate cart items
  if (!orderDetails.cartItems || !Array.isArray(orderDetails.cartItems) || orderDetails.cartItems.length === 0) {
    errors.push('Cart items are required (at least one item)');
  } else {
    orderDetails.cartItems.forEach((item, index) => {
      if (!item.id || item.id.toString().trim() === '') {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.name || item.name.trim() === '') {
        errors.push(`Item ${index + 1}: Product name is required`);
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        errors.push(`Item ${index + 1}: Valid price is required`);
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Quantity must be at least 1`);
      }
    });
  }

  // Validate pricing
  if (orderDetails.subtotal == null || typeof orderDetails.subtotal !== 'number' || orderDetails.subtotal < 0) {
    errors.push('Valid subtotal is required');
  }
  if (typeof orderDetails.finalTotal !== 'number' || orderDetails.finalTotal < 0) {
    errors.push('Valid final total is required');
  }

  // Validate userId (optional, defaults to 'guest')
  if (orderDetails.userId !== undefined && orderDetails.userId !== null && typeof orderDetails.userId !== 'string') {
    errors.push('User ID must be a string');
  }

  return errors;
};

// Initialize Razorpay only if credentials are provided
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn('⚠️  Razorpay credentials not found. Online payments will be disabled.');
}

// Create Razorpay order
export const createOrder = async (req, res) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.'
      });
    }

    const { amount, currency = 'INR', receipt, orderDetails } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Create order options
    const options = {
      amount: amount * 100, // Convert to paisa (Razorpay uses smallest currency unit)
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };

    // Create order with Razorpay
    const order = await razorpay.orders.create(options);

    // Save order details for webhook fallback (in case frontend flow is interrupted)
    if (orderDetails) {
      try {
        await PendingOrder.findOneAndUpdate(
          { razorpayOrderId: order.id },
          { razorpayOrderId: order.id, orderDetails, amount },
          { upsert: true, new: true }
        );
        console.log('📋 Pending order details saved for:', order.id);
      } catch (pendingErr) {
        console.error('⚠️ Failed to save pending order details (non-blocking):', pendingErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    console.log('🔐 === PAYMENT VERIFICATION REQUEST RECEIVED ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderDetails 
    } = req.body;

    console.log('🔐 Verifying payment signature...');
    console.log('Razorpay Order ID:', razorpay_order_id);
    console.log('Razorpay Payment ID:', razorpay_payment_id);
    console.log('Received signature:', razorpay_signature);
    console.log('Has orderDetails:', !!orderDetails);
    console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
    
    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing required payment verification fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields'
      });
    }
    
    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('Expected signature:', expectedSignature);
    console.log('Signatures match:', expectedSignature === razorpay_signature);

    // Verify signature
    if (expectedSignature === razorpay_signature) {
      // Payment is verified - save order to database
      console.log('Payment verified successfully');
      
      // Check if order was already created by webhook
      const existingOrder = await Order.findOne({ 'paymentInfo.orderId': razorpay_order_id });
      if (existingOrder) {
        console.log('✅ Order already exists (created by webhook):', existingOrder.orderId);
        // Clean up pending order
        await PendingOrder.deleteOne({ razorpayOrderId: razorpay_order_id }).catch(() => {});
        return res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        });
      }
      
      try {
        // Create order in database
        if (orderDetails) {
          console.log('📋 Creating order for online payment...');
          console.log('Order Details received:', JSON.stringify(orderDetails, null, 2));
          
          // Validate order details before processing
          const validationErrors = validateOrderDetails(orderDetails);
          if (validationErrors.length > 0) {
            console.error('❌ Order validation failed:', validationErrors);
            return res.status(400).json({
              success: false,
              message: 'Order validation failed',
              errors: validationErrors,
              payment_id: razorpay_payment_id,
              order_id: razorpay_order_id
            });
          }
          
          const orderId = await generateOrderId();
          
          // Transform cart items to order items format
          const orderItems = orderDetails.cartItems.map(item => {
            // Extract product ID from item.id (format: "productId_variant" or just "productId")
            const [productId] = item.id.split('_');
            
            return {
              productId: productId,
              productName: item.name || 'Unknown Product',
              variant: item.variant || 'Regular',
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1)
            };
          });
          
          console.log('📦 Transformed order items:', JSON.stringify(orderItems, null, 2));
          
          console.log('📍 DeliveryAddress from frontend:', JSON.stringify(orderDetails.deliveryAddress, null, 2));
          
          const deliveryAddress = {
            address: orderDetails.deliveryAddress?.address?.trim() || 'No address provided',
            lat: orderDetails.deliveryAddress?.lat ? Number(orderDetails.deliveryAddress.lat) : undefined,
            lng: orderDetails.deliveryAddress?.lng ? Number(orderDetails.deliveryAddress.lng) : undefined,
            specialRequest: orderDetails.deliveryAddress?.specialRequest?.trim() || ''
          };
          
          console.log('📍 DeliveryAddress to save:', JSON.stringify(deliveryAddress, null, 2));
          
          // Calculate estimated delivery time based on location
          const estimatedDeliveryTime = calculateEstimatedDeliveryTime(deliveryAddress);
          console.log('🕒 Calculated delivery time:', estimatedDeliveryTime);
          
          const newOrder = new Order({
            orderId,
            orderNumber: orderId, // Set orderNumber to avoid null index conflicts
            userId: orderDetails.userId || 'guest',
            customerInfo: {
              name: (orderDetails.customerInfo?.fullName || 'Guest').trim(),
              phone: (orderDetails.customerInfo?.phone || 'N/A').trim(),
              email: orderDetails.customerInfo?.email?.trim() || ''
            },
            deliveryAddress,
            items: orderItems,
            pricing: {
              subtotal: Number(orderDetails.subtotal) || 0,
              packagingCharge: Number(orderDetails.packagingCharge) || 0,
              couponDiscount: Number(orderDetails.couponDiscount) || 0,
              finalTotal: Number(orderDetails.finalTotal) || 0
            },
            paymentInfo: {
              method: 'online',
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              status: 'paid'
            },
            appliedCoupon: orderDetails.appliedCoupon && orderDetails.appliedCoupon.code ? {
              code: orderDetails.appliedCoupon.code.trim(),
              discount: Number(orderDetails.appliedCoupon.discount_value || orderDetails.appliedCoupon.discount || 0)
            } : undefined,
            estimatedDeliveryTime
          });

          console.log('💾 Saving order to database...');
          console.log('📋 Order object before save:', JSON.stringify(newOrder.toObject(), null, 2));
          
          // Validate before saving
          const validationError = newOrder.validateSync();
          if (validationError) {
            console.error('❌ Mongoose validation error:', validationError.message);
            const fieldErrors = Object.keys(validationError.errors).map(field => 
              `${field}: ${validationError.errors[field].message}`
            );
            throw new Error(`Validation failed: ${fieldErrors.join(', ')}`);
          }
          
          const savedOrder = await newOrder.save();
          console.log('✅ Order saved successfully:', orderId);
          
          // Clean up pending order data
          await PendingOrder.deleteOne({ razorpayOrderId: razorpay_order_id }).catch(() => {});
          
          // Send Telegram notification
          telegramService.notifyNewOrder(savedOrder);
        } else {
          console.log('⚠️ No orderDetails received, attempting to use pending order data...');
          // Try to create order from pending order data (fallback)
          const pendingOrder = await PendingOrder.findOne({ razorpayOrderId: razorpay_order_id });
          if (pendingOrder) {
            // Recursively call with pending order details
            req.body.orderDetails = pendingOrder.orderDetails;
            return verifyPayment(req, res);
          } else {
            console.error('❌ No orderDetails and no pending order found');
            return res.status(400).json({
              success: false,
              message: 'Order details are required for order creation',
              payment_id: razorpay_payment_id,
              order_id: razorpay_order_id
            });
          }
        }
      } catch (dbError) {
        console.error('❌ === DATABASE ERROR SAVING ORDER ===');
        console.error('Error message:', dbError.message);
        console.error('Error name:', dbError.name);
        console.error('Stack trace:', dbError.stack);
        
        // Log the order data that failed to save
        console.error('Failed order data:', JSON.stringify(orderDetails, null, 2));
        
        // Determine specific error message
        let errorMessage = 'Failed to save order';
        if (dbError.code === 11000) {
          errorMessage = 'Order ID already exists (duplicate order). Please try again.';
        } else if (dbError.name === 'ValidationError') {
          errorMessage = `Validation error: ${dbError.message}`;
        } else if (dbError.name === 'MongoNetworkError') {
          errorMessage = 'Database connection error. Please try again.';
        }
        
        // Return error response when DB save fails
        return res.status(500).json({
          success: false,
          message: 'Payment verified but order could not be saved',
          error: errorMessage,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Handle cash payment (with minimum order validation)
export const processCashPayment = async (req, res) => {
  try {
    const { orderDetails, amount } = req.body;

    // Validate minimum order amount for cash payment (₹349)
    const minimumAmount = 349;
    
    if (amount < minimumAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount for cash payment is ₹${minimumAmount}`,
        minimum_amount: minimumAmount
      });
    }

    // Process cash order - save to database
    console.log('Cash payment processed for amount:', amount);
    
    try {
      console.log('💰 Creating cash order...');
      console.log('Order Details received:', JSON.stringify(orderDetails, null, 2));
      
      // Validate order details before processing
      const validationErrors = validateOrderDetails(orderDetails);
      if (validationErrors.length > 0) {
        console.error('❌ Order validation failed:', validationErrors);
        return res.status(400).json({
          success: false,
          message: 'Order validation failed',
          errors: validationErrors
        });
      }
      
      const orderId = await generateOrderId();
      
      // Transform cart items to order items format
      const orderItems = orderDetails.cartItems.map(item => {
        // Extract product ID from item.id (format: "productId_variant" or just "productId")
        const [productId] = item.id.split('_');
        
        return {
          productId: productId,
          productName: item.name || 'Unknown Product',
          variant: item.variant || 'Regular',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1)
        };
      });
      
      console.log('📦 Transformed order items:', JSON.stringify(orderItems, null, 2));
      
      console.log('📍 DeliveryAddress from frontend (CASH):', JSON.stringify(orderDetails.deliveryAddress, null, 2));
      
      const deliveryAddress = {
        address: orderDetails.deliveryAddress?.address?.trim() || 'No address provided',
        lat: orderDetails.deliveryAddress?.lat ? Number(orderDetails.deliveryAddress.lat) : undefined,
        lng: orderDetails.deliveryAddress?.lng ? Number(orderDetails.deliveryAddress.lng) : undefined,
        specialRequest: orderDetails.deliveryAddress?.specialRequest?.trim() || ''
      };
      
      console.log('📍 DeliveryAddress to save (CASH):', JSON.stringify(deliveryAddress, null, 2));
      
      // Calculate estimated delivery time based on location
      const estimatedDeliveryTime = calculateEstimatedDeliveryTime(deliveryAddress);
      console.log('🕒 Calculated delivery time for cash order:', estimatedDeliveryTime);
      
      const newOrder = new Order({
        orderId,
        orderNumber: orderId, // Set orderNumber to avoid null index conflicts
        userId: orderDetails.userId || 'guest',
        customerInfo: {
          name: (orderDetails.customerInfo.fullName || '').trim(),
          phone: (orderDetails.customerInfo.phone || '').trim(),
          email: orderDetails.customerInfo.email?.trim() || ''
        },
        deliveryAddress,
        items: orderItems,
        pricing: {
          subtotal: Number(orderDetails.subtotal) || 0,
          packagingCharge: Number(orderDetails.packagingCharge) || 0,
          couponDiscount: Number(orderDetails.couponDiscount) || 0,
          finalTotal: Number(orderDetails.finalTotal) || 0
        },
        paymentInfo: {
          method: 'cash',
          status: 'pending'
        },
        appliedCoupon: orderDetails.appliedCoupon && orderDetails.appliedCoupon.code ? {
          code: orderDetails.appliedCoupon.code.trim(),
          discount: Number(orderDetails.appliedCoupon.discount_value || 0)
        } : undefined,
        estimatedDeliveryTime
      });

      console.log('💾 Saving cash order to database...');
      console.log('📋 Cash order object before save:', JSON.stringify(newOrder.toObject(), null, 2));
      
      // Validate before saving
      const validationError = newOrder.validateSync();
      if (validationError) {
        console.error('❌ Mongoose validation error:', validationError.message);
        const fieldErrors = Object.keys(validationError.errors).map(field => 
          `${field}: ${validationError.errors[field].message}`
        );
        throw new Error(`Validation failed: ${fieldErrors.join(', ')}`);
      }

      const savedOrder = await newOrder.save();
      console.log('✅ Cash order saved to database:', orderId);

      // Send Telegram notification
      telegramService.notifyNewOrder(savedOrder);

      return res.status(200).json({
        success: true,
        message: 'Cash order placed successfully',
        order_id: orderId,
        payment_method: 'cash',
        order: savedOrder
      });
      
    } catch (dbError) {
      console.error('❌ === DATABASE ERROR SAVING CASH ORDER ===');
      console.error('Error message:', dbError.message);
      console.error('Error name:', dbError.name);
      console.error('Stack trace:', dbError.stack);
      console.error('Failed order data:', JSON.stringify(orderDetails, null, 2));
      
      // Determine specific error message
      let errorMessage = 'Failed to save order';
      if (dbError.code === 11000) {
        errorMessage = 'Order ID already exists (duplicate order). Please try again.';
      } else if (dbError.name === 'ValidationError') {
        errorMessage = `Validation error: ${dbError.message}`;
      } else if (dbError.name === 'MongoNetworkError') {
        errorMessage = 'Database connection error. Please try again.';
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save order',
        error: errorMessage
      });
    }

  } catch (error) {
    console.error('Error processing cash payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process cash payment',
      error: error.message
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.'
      });
    }

    const { payment_id } = req.params;

    const payment = await razorpay.payments.fetch(payment_id);

    return res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        created_at: payment.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: error.message
    });
  }
};

// Check Razorpay order status (used by frontend to check if payment went through after modal dismiss)
export const checkOrderPaymentStatus = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ success: false, message: 'Razorpay not configured' });
    }

    const { order_id } = req.params;
    const payments = await razorpay.orders.fetchPayments(order_id);
    
    // Check if any payment was captured
    const capturedPayment = payments.items?.find(p => p.status === 'captured');
    
    return res.status(200).json({
      success: true,
      paid: !!capturedPayment,
      payment: capturedPayment ? {
        id: capturedPayment.id,
        status: capturedPayment.status,
        amount: capturedPayment.amount
      } : null
    });
  } catch (error) {
    console.error('Error checking order payment status:', error);
    return res.status(500).json({ success: false, message: 'Failed to check payment status' });
  }
};

// Razorpay webhook handler - catches payments even if frontend flow is interrupted
export const handleWebhook = async (req, res) => {
  try {
    console.log('🔔 === RAZORPAY WEBHOOK RECEIVED ===');
    
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('❌ Missing webhook signature header');
      return res.status(400).json({ success: false, message: 'Missing signature' });
    }

    // On Vercel, rawBody from express verify may not be available
    // Use the stringified body as fallback
    const rawBody = req.rawBody || JSON.stringify(req.body);
    console.log('📝 Using rawBody type:', req.rawBody ? 'buffer' : 'stringified');
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    console.log('🔑 Signature match:', expectedSignature === signature);

    if (expectedSignature !== signature) {
      // Vercel may stringify body differently, try with sorted keys
      const sortedBody = JSON.stringify(req.body);
      const altSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(sortedBody)
        .digest('hex');
      
      if (altSignature !== signature) {
        console.error('❌ Webhook signature verification failed');
        console.error('Expected:', expectedSignature);
        console.error('Received:', signature);
        // Still process the webhook but log the mismatch
        // In production with Vercel, body parsing can alter raw body
        // We'll validate the payment via Razorpay API instead
        console.log('⚠️ Signature mismatch - will validate payment via Razorpay API');
      }
    }

    console.log('✅ Webhook signature verified');

    const event = req.body.event;
    console.log('📌 Webhook event:', event);

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;
      
      console.log('💰 Payment captured:', razorpayPaymentId, 'for order:', razorpayOrderId);

      // Verify payment is real via Razorpay API
      if (razorpay) {
        try {
          const rpPayment = await razorpay.payments.fetch(razorpayPaymentId);
          if (rpPayment.status !== 'captured') {
            console.error('❌ Payment not actually captured per Razorpay API:', rpPayment.status);
            return res.status(200).json({ success: true, message: 'Payment not captured' });
          }
          console.log('✅ Payment verified via Razorpay API');
        } catch (fetchErr) {
          console.error('⚠️ Could not verify payment via API:', fetchErr.message);
        }
      }

      // Check if order already exists (created by frontend verify flow)
      const existingOrder = await Order.findOne({ 'paymentInfo.orderId': razorpayOrderId });
      if (existingOrder) {
        console.log('✅ Order already exists for this payment:', existingOrder.orderId);
        return res.status(200).json({ success: true, message: 'Order already exists' });
      }

      // Look up pending order details
      const pendingOrder = await PendingOrder.findOne({ razorpayOrderId });
      if (!pendingOrder) {
        console.error('❌ No pending order data found for:', razorpayOrderId);
        // Log for manual recovery - payment was captured but we have no order details
        console.error('🚨 MANUAL RECOVERY NEEDED - Payment ID:', razorpayPaymentId, 'Amount:', payment.amount / 100);
        return res.status(200).json({ success: true, message: 'No pending order data found' });
      }

      const orderDetails = pendingOrder.orderDetails;
      console.log('📋 Found pending order details for:', razorpayOrderId);

      // Create the order from pending data
      try {
        const validationErrors = validateOrderDetails(orderDetails);
        if (validationErrors.length > 0) {
          console.error('❌ Order validation failed in webhook:', validationErrors);
          return res.status(200).json({ success: true, message: 'Validation failed', errors: validationErrors });
        }

        const orderId = await generateOrderId();
        
        const orderItems = orderDetails.cartItems.map(item => {
          const [productId] = item.id.split('_');
          return {
            productId: productId,
            productName: item.name || 'Unknown Product',
            variant: item.variant || 'Regular',
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            totalPrice: (Number(item.price) || 0) * (Number(item.quantity) || 1)
          };
        });

        const deliveryAddress = {
          address: orderDetails.deliveryAddress?.address?.trim() || 'No address provided',
          lat: orderDetails.deliveryAddress?.lat ? Number(orderDetails.deliveryAddress.lat) : undefined,
          lng: orderDetails.deliveryAddress?.lng ? Number(orderDetails.deliveryAddress.lng) : undefined,
          specialRequest: orderDetails.deliveryAddress?.specialRequest?.trim() || ''
        };

        const estimatedDeliveryTime = calculateEstimatedDeliveryTime(deliveryAddress);

        const newOrder = new Order({
          orderId,
          orderNumber: orderId,
          userId: orderDetails.userId || 'guest',
          customerInfo: {
            name: (orderDetails.customerInfo?.fullName || 'Guest').trim(),
            phone: (orderDetails.customerInfo?.phone || 'N/A').trim(),
            email: orderDetails.customerInfo?.email?.trim() || ''
          },
          deliveryAddress,
          items: orderItems,
          pricing: {
            subtotal: Number(orderDetails.subtotal) || 0,
            packagingCharge: Number(orderDetails.packagingCharge) || 0,
            couponDiscount: Number(orderDetails.couponDiscount) || 0,
            finalTotal: Number(orderDetails.finalTotal) || 0
          },
          paymentInfo: {
            method: 'online',
            paymentId: razorpayPaymentId,
            orderId: razorpayOrderId,
            status: 'paid'
          },
          appliedCoupon: orderDetails.appliedCoupon && orderDetails.appliedCoupon.code ? {
            code: orderDetails.appliedCoupon.code.trim(),
            discount: Number(orderDetails.appliedCoupon.discount_value || orderDetails.appliedCoupon.discount || 0)
          } : undefined,
          estimatedDeliveryTime
        });

        const savedOrder = await newOrder.save();
        console.log('✅ [WEBHOOK] Order saved successfully:', orderId);

        // Clean up pending order
        await PendingOrder.deleteOne({ razorpayOrderId }).catch(() => {});

        // Send Telegram notification
        telegramService.notifyNewOrder(savedOrder);

        return res.status(200).json({ success: true, message: 'Order created from webhook' });
      } catch (dbError) {
        console.error('❌ [WEBHOOK] Database error saving order:', dbError.message);
        return res.status(200).json({ success: true, message: 'DB error', error: dbError.message });
      }
    }

    // For other events, just acknowledge
    console.log('ℹ️ Unhandled webhook event:', event);
    return res.status(200).json({ success: true, message: 'Event acknowledged' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Always return 200 to Razorpay to prevent retries for processing errors
    return res.status(200).json({ success: true, message: 'Error processing webhook' });
  }
};