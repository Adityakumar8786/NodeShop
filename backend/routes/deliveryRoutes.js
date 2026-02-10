import express from 'express';
import DeliveryLocation from '../models/DeliveryLocation.js';
import Order from '../models/Order.js';
import { isAuthenticated, isDelivery } from '../middleware/auth.js';

const router = express.Router();

router.post('/update-location', isAuthenticated, isDelivery, async (req, res) => {
  try {
    const { orderId, latitude, longitude } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to you' });
    }

    let location = await DeliveryLocation.findOne({ order: orderId });

    if (location) {
      location.currentLocation = { latitude, longitude };
      location.updatedAt = new Date();
    } else {
      location = new DeliveryLocation({
        order: orderId,
        deliveryPerson: req.user._id,
        currentLocation: { latitude, longitude },
      });
    }

    await location.save();

    res.json({ message: 'Location updated', location });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/track/:orderId', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const location = await DeliveryLocation.findOne({ order: req.params.orderId })
      .populate('deliveryPerson', 'name phone');

    if (!location) {
      return res.status(404).json({ message: 'Tracking not available yet' });
    }

    res.json(location);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/end-tracking/:orderId', isAuthenticated, isDelivery, async (req, res) => {
  try {
    const location = await DeliveryLocation.findOne({ order: req.params.orderId });
    
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    if (location.deliveryPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your delivery' });
    }

    location.isActive = false;
    await location.save();

    res.json({ message: 'Tracking ended' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;