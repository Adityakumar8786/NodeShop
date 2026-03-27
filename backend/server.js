import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import connectDB from './config/database.js';
import './config/passport.js';

import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

connectDB();

// CRITICAL FIX: CORS Configuration
const allowedOrigins = [
  'https://nodeshop-2.onrender.com',
  'http://localhost:5173'
];

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['set-cookie'],
  })
);

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRITICAL FIX: Session Configuration
app.set('trust proxy', 1); // Trust first proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'aditya_7864_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // Must be true for HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'none', // CRITICAL for cross-origin
      path: '/', // Available on all paths
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Middleware to log session info (for debugging)
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Authenticated:', req.isAuthenticated());
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 CORS origin: https://nodeshop-2.onrender.com`);
  console.log(`🔐 Secure cookies: true`);
  console.log(`🍪 SameSite: none`);
});
