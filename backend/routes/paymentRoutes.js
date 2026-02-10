import express from 'express';
import { isAuthenticated, isCustomer } from '../middleware/auth.js';

const router = express.Router();

// New GET endpoint to fetch publishable key without creating intent
router.get('/stripe-key', (req, res) => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    return res.status(500).json({ message: 'Stripe not configured' });
  }
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Stripe ko lazy load karo - jab route call ho tabhi initialize karo
let stripe = null;

const getStripe = async () => {
  if (!stripe) {
    const Stripe = (await import('stripe')).default;
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY missing in .env file!');
      throw new Error('Stripe not configured');
    }
    
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully');
  }
  return stripe;
};

router.post('/create-payment-intent', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const stripeInstance = await getStripe();
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'inr',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Payment intent created:', paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error('❌ Stripe Error:', error.message);
    res.status(500).json({ 
      message: 'Payment service error', 
      error: error.message 
    });
  }
});

export default router;