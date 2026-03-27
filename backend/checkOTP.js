import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Order from './models/Order.js';
import User from './models/User.js'; // MUST IMPORT THIS

const checkOTP = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const orders = await Order.find({ status: 'Out for Delivery' })
      .populate('user', 'name phone')
      .sort('-createdAt');

    console.log('\n📦 OUT FOR DELIVERY ORDERS:');
    console.log('═══════════════════════════════════════');
    
    if (orders.length === 0) {
      console.log('No orders with status "Out for Delivery"');
    }
    
    orders.forEach(order => {
      console.log(`\nOrder: ${order.orderNumber}`);
      console.log(`Customer: ${order.user?.name}`);
      console.log(`Payment: ${order.paymentMethod}`);
      console.log(`OTP: ${order.deliveryOTP || 'NOT GENERATED'}`);
      console.log(`Status: ${order.status}`);
    });
    
    console.log('\n═══════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkOTP();