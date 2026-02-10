import express from 'express';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { isAuthenticated, isCustomer } from '../middleware/auth.js';

const router = express.Router();

router.post('/', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your order' });
    }

    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'Cannot review before delivery is complete' });
    }

    const productInOrder = order.items.some(
      (item) => item.product.toString() === productId
    );

    if (!productInOrder) {
      return res.status(400).json({ message: 'You did not purchase this product in this order' });
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
      order: orderId,
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order' });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      order: orderId,
      rating,
      comment,
    });

    await review.save();

    const reviews = await Review.find({ product: productId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      'ratings.average': avgRating,
      'ratings.count': reviews.length,
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }
    console.error('Review submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort('-createdAt');
    res.json(reviews);
  } catch (error) {
    console.error('Fetch reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;