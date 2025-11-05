import express from 'express';
import { 
  createOrder, 
  verifyPayment, 
  processCashPayment, 
  getPaymentStatus 
} from '../controllers/paymentController.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', createOrder);

// Verify Razorpay payment
router.post('/verify', verifyPayment);

// Process cash payment
router.post('/cash', processCashPayment);

// Get payment status
router.get('/status/:payment_id', getPaymentStatus);

export default router;