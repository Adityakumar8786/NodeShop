import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../config/api';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.product);
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'Customer') {
      setMessage('Only customers can add items to cart');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await api.post('/cart/add', { productId: id, quantity });
      setMessage('Added to cart successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add to cart');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'Customer') {
      setMessage('Only customers can purchase products');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await api.post('/cart/add', { productId: id, quantity });
      navigate('/cart');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to process');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    setAiLoading(true);
    setAiAnswer('');

    try {
      const response = await api.post('/ai/ask-product', {
        productId: id,
        question: aiQuestion,
      });
      setAiAnswer(response.data.answer);
    } catch (error) {
      setAiAnswer(error.response?.data?.message || 'Sorry, I could not get an answer. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  if (loading) {
    return <div className="loading">Loading product...</div>;
  }

  if (!product) {
    return <div className="error">Product not found</div>;
  }

  const isCustomer = user && user.role === 'Customer';

  return (
    <div className="product-detail">
      {message && <div className="message success">{message}</div>}

      <div className="product-detail-container">
        <div className="product-detail-image">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>
          
          <div className="product-detail-rating">
            ⭐ {safeToFixed(product.ratings?.average || 0, 1)} | {product.ratings?.count || 0} reviews
          </div>

          <div className="product-detail-price">
            <span className="final-price">₹{safeToFixed(product.finalPrice || product.price)}</span>
            {product.discount > 0 && (
              <>
                <span className="original-price">₹{safeToFixed(product.price)}</span>
                <span className="discount-badge">{product.discount}% OFF</span>
              </>
            )}
          </div>

          <div className="product-detail-stock">
            {product.stock > 0 ? (
              <span className="in-stock">In Stock ({product.stock} available)</span>
            ) : (
              <span className="out-of-stock">Out of Stock</span>
            )}
          </div>

          <div className="product-detail-category">
            <strong>Category:</strong> {product.category?.name || 'N/A'}
          </div>

          <div className="product-detail-description">
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>

          {isCustomer && product.stock > 0 && (
            <div className="product-detail-actions">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="action-buttons">
                <button onClick={handleAddToCart} className="btn-add-cart">
                  🛒 Add to Cart
                </button>
                <button onClick={handleBuyNow} className="btn-buy-now">
                  ⚡ Buy Now
                </button>
              </div>
            </div>
          )}

          {!isCustomer && user && (
            <div className="role-message">
              <p>⚠️ Only customers can purchase products</p>
            </div>
          )}
        </div>
      </div>

      {isCustomer && (
        <div className="ai-qa-section">
          <h2>🤖 Ask Item Expert</h2>
          <form onSubmit={handleAskQuestion} className="ai-form">
            <input
              type="text"
              placeholder="Ask a question about this product..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              disabled={aiLoading}
            />
            <button type="submit" disabled={aiLoading}>
              {aiLoading ? 'Asking...' : 'Ask'}
            </button>
          </form>

          {aiAnswer && (
            <div className="ai-answer">
              <strong>Answer:</strong>
              <p>{aiAnswer}</p>
            </div>
          )}
        </div>
      )}

      <div className="reviews-section">
        <h2>Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet. Be the first to review!</p>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <strong>{review.user?.name || 'Anonymous'}</strong>
                  <span className="review-rating">
                    {'⭐'.repeat(review.rating)}
                  </span>
                </div>
                {review.comment && <p>{review.comment}</p>}
                <small>{new Date(review.createdAt).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;