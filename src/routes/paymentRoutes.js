import express from 'express';
import { 
  createOrder, 
  verifyPayment, 
  processCashPayment, 
  getPaymentStatus,
  handleWebhook,
  checkOrderPaymentStatus,
  syncPendingPayments
} from '../controllers/paymentController.js';

const router = express.Router();

// Create Razorpay order (also pre-creates Order in DB with status=pending)
router.post('/create-order', createOrder);

// Verify Razorpay payment (updates existing pending order to paid)
router.post('/verify', verifyPayment);

// Razorpay webhook (server-side payment confirmation fallback)
router.post('/webhook', handleWebhook);

// Process cash payment
router.post('/cash', processCashPayment);

// Get payment status by payment ID
router.get('/status/:payment_id', getPaymentStatus);

// Check if a Razorpay order has been paid (used after modal dismiss)
router.get('/order-status/:order_id', checkOrderPaymentStatus);

// Reconcile pending online orders against Razorpay (safety net sync)
router.post('/sync-pending', syncPendingPayments);

export default router;