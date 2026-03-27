import express from 'express';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { isAuthenticated, isAdmin, isDelivery, isCustomer } from '../middleware/auth.js';

const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/create', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const { paymentMethod, shippingAddress } = req.body;

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      return res.status(400).json({ message: 'Complete shipping address is required' });
    }

    if (!req.user.phone) {
      return res.status(400).json({ message: 'Phone number is required. Please update your profile.' });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    for (const item of cart.items) {
      if (!item.product || item.product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.product?.name || 'product'}`,
        });
      }
    }

    const orderNumber = `ORD${Date.now()}`;

    const order = new Order({
      orderNumber,
      user: req.user._id,
      items: cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        image: item.product.image,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: cart.totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'Prepaid' ? 'Paid' : 'Pending',
      shippingAddress,
    });

    await order.save();

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    cart.items = [];
    await cart.save();

    res.status(201).json({ 
      message: 'Order created successfully!', 
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/my-orders', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('deliveryPerson', 'name phone')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('deliveryPerson', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (
      req.user.role === 'Customer' &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (
      req.user.role === 'Delivery' &&
      (!order.deliveryPerson || order.deliveryPerson._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Fetch order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('deliveryPerson', 'name phone')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    console.error('Fetch all orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/assign-delivery', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { deliveryPersonId } = req.body;

    const deliveryPerson = await User.findById(deliveryPersonId);
    if (!deliveryPerson || deliveryPerson.role !== 'Delivery') {
      return res.status(400).json({ message: 'Invalid delivery person' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        deliveryPerson: deliveryPersonId,
        status: 'Packed',
      },
      { new: true, runValidators: false }
    ).populate('user', 'name email phone').populate('deliveryPerson', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Delivery person assigned', order });
  } catch (error) {
    console.error('Assign delivery error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (status === 'Delivered') {
      return res.status(403).json({
        message: 'Only delivery person can mark order as delivered',
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: false }
    ).populate('user', 'name email phone').populate('deliveryPerson', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/delivery/assigned', isAuthenticated, isDelivery, async (req, res) => {
  try {
    const orders = await Order.find({ deliveryPerson: req.user._id })
      .populate('user', 'name phone')
      .sort('-createdAt');
    res.json(orders);
  } catch (error) {
    console.error('Fetch assigned orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// FIX: Generate OTP when marking "Out for Delivery"
router.put('/:id/out-for-delivery', isAuthenticated, isDelivery, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.deliveryPerson || order.deliveryPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }

    // IMPORTANT: Generate OTP for PREPAID orders when marking out for delivery
    if (order.paymentMethod === 'Prepaid' && !order.deliveryOTP) {
      const otp = generateOTP();
      order.deliveryOTP = otp;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 DELIVERY OTP GENERATED');
      console.log(`Order ID: ${order._id}`);
      console.log(`Order Number: ${order.orderNumber}`);
      console.log(`Customer: ${order.user?.name}`);
      console.log(`Customer Phone: ${order.user?.phone}`);
      console.log(`Payment Method: ${order.paymentMethod}`);
      console.log(`Generated OTP: ${otp}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    order.status = 'Out for Delivery';
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('user', 'name phone')
      .populate('deliveryPerson', 'name phone');

    res.json({ 
      message: 'Order marked as out for delivery', 
      order: updatedOrder 
    });
  } catch (error) {
    console.error('Out for delivery error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/deliver', isAuthenticated, isDelivery, async (req, res) => {
  try {
    const { cashReceived, deliveryOTP } = req.body;

    const order = await Order.findById(req.params.id).populate('user', 'name phone');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.deliveryPerson || order.deliveryPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }

    // For Prepaid orders - verify OTP
    if (order.paymentMethod === 'Prepaid') {
      if (!deliveryOTP) {
        return res.status(400).json({ message: 'OTP required for prepaid orders' });
      }
      if (deliveryOTP !== order.deliveryOTP) {
        return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
      }
      console.log('✅ OTP Verified Successfully');
    }

    // For COD orders - verify cash received
    if (order.paymentMethod === 'COD' && !cashReceived) {
      return res.status(400).json({ message: 'Please confirm cash received for COD orders' });
    }

    // Mark as delivered
    order.status = 'Delivered';
    order.deliveredAt = new Date();
    order.cashReceived = cashReceived || false;
    order.deliveryOTP = null; // Clear OTP after successful delivery
    
    if (order.paymentMethod === 'COD') {
      order.paymentStatus = 'Paid';
    }

    await order.save();

    console.log('✅ Order Delivered Successfully');
    console.log(`Order: ${order.orderNumber}`);
    console.log(`Payment Method: ${order.paymentMethod}`);

    res.json({ message: 'Order delivered successfully', order });
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;