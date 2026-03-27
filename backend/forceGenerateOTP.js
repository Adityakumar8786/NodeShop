import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Order from './models/Order.js';
import User from './models/User.js';

const forceGenerateOTP = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all Out for Delivery orders with Prepaid payment and no OTP
    const orders = await Order.find({ 
      status: 'Out for Delivery',
      paymentMethod: 'Prepaid',
      $or: [
        { deliveryOTP: null },
        { deliveryOTP: { $exists: false } },
        { deliveryOTP: '' }
      ]
    }).populate('user', 'name phone');

    console.log(`\nFound ${orders.length} Prepaid orders without OTP\n`);

    for (const order of orders) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      order.deliveryOTP = otp;
      await order.save();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Generated OTP for Order ${order.orderNumber}`);
      console.log(`Customer: ${order.user?.name}`);
      console.log(`OTP: ${otp}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    console.log('\n✅ Done! All Prepaid orders now have OTP.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

forceGenerateOTP();