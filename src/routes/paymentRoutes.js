import express from 'express';
import { 
  createOrder, 
  verifyPayment, 
  processCashPayment, 
  getPaymentStatus,
  handleWebhook,
  checkOrderPaymentStatus
} from '../controllers/paymentController.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', createOrder);

// Verify Razorpay payment
router.post('/verify', verifyPayment);

// Razorpay webhook (server-side payment confirmation fallback)
router.post('/webhook', handleWebhook);

// Process cash payment
router.post('/cash', processCashPayment);

// Get payment status by payment ID
router.get('/status/:payment_id', getPaymentStatus);

// Check if a Razorpay order has been paid (used after modal dismiss)
router.get('/order-status/:order_id', checkOrderPaymentStatus);

export default router;