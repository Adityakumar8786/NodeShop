import express from 'express';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter).populate('category', 'name');
    res.json(products);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const reviews = await Review.find({ product: req.params.id })
      .populate('user', 'name')
      .sort('-createdAt');

    res.json({ product, reviews });
  } catch (error) {
    console.error('Fetch product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, price, discount, image, category, stock } = req.body;

    const product = new Product({
      name,
      description,
      price: Number(price),
      discount: Number(discount) || 0,
      image,
      category,
      stock: Number(stock),
    });

    await product.save();
    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, price, discount, image, category, stock } = req.body;

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (discount !== undefined) product.discount = Number(discount);
    if (image) product.image = image;
    if (category) product.category = category;
    if (stock !== undefined) product.stock = Number(stock);

    await product.save();
    
    const updatedProduct = await Product.findById(product._id).populate('category', 'name');
    res.json({ message: 'Product updated', product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;