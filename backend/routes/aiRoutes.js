import express from 'express';
import axios from 'axios';
import Product from '../models/Product.js';
import { isAuthenticated, isCustomer } from '../middleware/auth.js';

const router = express.Router();

router.post('/ask-product', isAuthenticated, isCustomer, async (req, res) => {
  try {
    const { productId, question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ message: 'Question is required' });
    }

    const product = await Product.findById(productId).populate('category', 'name');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const context = `
Product Name: ${product.name}
Category: ${product.category?.name || 'N/A'}
Price: ₹${product.finalPrice || product.price} (Original: ₹${product.price}, Discount: ${product.discount}%)
Stock: ${product.stock} units
Description: ${product.description}
Rating: ${product.ratings?.average || 0}/5 (${product.ratings?.count || 0} reviews)
`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a helpful product expert assistant for an Indian e-commerce platform. Answer questions about products based on the provided context. Prices are in Indian Rupees (₹). Be concise and helpful. If you don't have enough information, say so politely.`,
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    const answer = response.data.choices[0].message.content;

    res.json({ question, answer });
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'AI service temporarily unavailable',
      error: error.response?.data?.error?.message || error.message,
    });
  }
});

export default router;