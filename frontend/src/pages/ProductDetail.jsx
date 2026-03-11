import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../config/api';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [reviews, setReviews] = useState([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews/product/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
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
      await api.post('/cart/add', {
        productId: id,
        quantity,
      });
      setMessage('✅ Added to cart!');
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
      setMessage('Only customers can purchase items');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await api.post('/cart/add', {
        productId: id,
        quantity,
      });
      navigate('/cart');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add to cart');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    
    if (!aiQuestion.trim()) {
      return;
    }

    setAiLoading(true);
    setAiAnswer('');

    try {
      const response = await api.post('/ai/ask-product', {
        productId: id,
        question: aiQuestion,
      });
      setAiAnswer(response.data.answer);
    } catch (error) {
      setAiAnswer('Sorry, AI service is currently unavailable.');
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

  if (error || !product) {
    return (
      <div className="error-page">
        <h2>Product Not Found</h2>
        <p>{error || 'This product does not exist'}</p>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      {message && <div className="message">{message}</div>}

      <div className="product-detail-container">
        <div className="product-image-section">
          <img src={product.image} alt={product.name} onError={(e) => {
            e.target.src = 'https://via.placeholder.com/500x500?text=No+Image';
          }} />
        </div>

        <div className="product-info-section">
          <h1>{product.name}</h1>
          
          <div className="product-rating">
            <span className="rating-stars">
              {'⭐'.repeat(Math.round(product.ratings?.average || 0))}
            </span>
            <span className="rating-text">
              {(product.ratings?.average || 0).toFixed(1)} ({product.ratings?.count || 0} reviews)
            </span>
          </div>

          <div className="product-price">
            {product.discount > 0 ? (
              <>
                <span className="final-price">₹{safeToFixed(product.finalPrice)}</span>
                <span className="original-price">₹{safeToFixed(product.price)}</span>
                <span className="discount-badge">{product.discount}% OFF</span>
              </>
            ) : (
              <span className="final-price">₹{safeToFixed(product.price)}</span>
            )}
          </div>

          <div className="product-category">
            <strong>Category:</strong> {product.category?.name || 'N/A'}
          </div>

          <div className="product-stock">
            <strong>Stock:</strong> 
            {product.stock > 0 ? (
              <span className="in-stock"> {product.stock} units available</span>
            ) : (
              <span className="out-of-stock"> Out of Stock</span>
            )}
          </div>

          <div className="product-description">
            <h3>Description</h3>
            <p>{product.description}</p>
          </div>

          {user && user.role === 'Customer' && product.stock > 0 && (
            <div className="product-actions">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <div className="quantity-controls">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="action-buttons">
                <button onClick={handleAddToCart} className="btn-add-to-cart">
                  🛒 Add to Cart
                </button>
                <button onClick={handleBuyNow} className="btn-buy-now">
                  ⚡ Buy Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {user && user.role === 'Customer' && (
        <div className="ai-chatbot-section">
          <h2>🤖 Ask Product Expert</h2>
          <form onSubmit={handleAskAI} className="ai-form">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Ask anything about this product..."
              disabled={aiLoading}
            />
            <button type="submit" disabled={aiLoading || !aiQuestion.trim()}>
              {aiLoading ? 'Asking...' : 'Ask AI'}
            </button>
          </form>
          {aiAnswer && (
            <div className="ai-answer">
              <strong>AI Expert:</strong>
              <p>{aiAnswer}</p>
            </div>
          )}
        </div>
      )}

      <div className="reviews-section">
        <h2>Customer Reviews</h2>
        {reviews.length > 0 ? (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <span className="reviewer-name">{review.user?.name}</span>
                  <span className="review-rating">
                    {'⭐'.repeat(review.rating)}
                  </span>
                </div>
                <p className="review-comment">{review.comment}</p>
                <span className="review-date">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;