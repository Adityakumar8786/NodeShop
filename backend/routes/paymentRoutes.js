import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { isAuthenticated, isCustomer } from '../middleware/auth.js';

const router = express.Router();

let razorpay = null;

const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    console.log('✅ Razorpay initialized successfully');
  }
  return razorpay;
};

router.post('/create-order', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const razorpayInstance = getRazorpay();
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);

    console.log('✅ Razorpay order created:', order.id);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('❌ Razorpay Error:', error.message);
    res.status(500).json({ 
      message: 'Payment service error', 
      error: error.message 
    });
  }
});

router.post('/verify-payment', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      console.log('✅ Payment verified:', razorpay_payment_id);
      res.json({ 
        success: true, 
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id
      });
    } else {
      console.log('❌ Payment verification failed - Invalid signature');
      res.status(400).json({ 
        success: false, 
        message: 'Invalid payment signature' 
      });
    }
  } catch (error) {
    console.error('❌ Verification Error:', error.message);
    res.status(500).json({ 
      message: 'Verification failed', 
      error: error.message 
    });
  }
});

export default router;