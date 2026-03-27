import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {useRazorpay} from 'react-razorpay';
import api from '../config/api';
import './Cart.css';

const Cart = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { Razorpay, isLoading} = useRazorpay();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showCheckout, setShowCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
  });

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is customer
    if (user.role !== 'Customer') {
      setError('Only customers can access cart');
      setLoading(false);
      return;
    }

    fetchCart();
    if (user?.address) {
      setAddress(user.address);
    }
  }, [user, navigate]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/cart');
      console.log('Cart fetched:', response.data);
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError(error.response?.data?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const response = await api.put('/cart/update', { productId, quantity });
      setCart(response.data.cart);
      setMessage('✅ Cart updated');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update cart');
      setTimeout(() => setError(''), 3000);
    }
  };

  const removeItem = async (productId) => {
    try {
      const response = await api.delete(`/cart/remove/${productId}`);
      setCart(response.data.cart);
      setMessage('✅ Item removed');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove item');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    
    try {
      const { data } = await api.post('/payment/create-order', { 
        amount: cart.totalAmount 
      });

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'NodeShop',
        description: 'Order Payment',
        order_id: data.orderId,
        handler: async function (response) {
          try {
            const verifyResult = await api.post('/payment/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResult.data.success) {
              await api.post('/orders/create', {
                paymentMethod: 'Prepaid',
                shippingAddress: address,
              });

              setMessage('✅ Payment successful! Order placed.');
              setShowCheckout(false);
              setProcessing(false);
              setTimeout(() => navigate('/my-orders'), 2000);
            } else {
              setError('❌ Payment verification failed');
              setProcessing(false);
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setError('❌ Payment verification failed');
            setProcessing(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || '9999999999',
        },
        theme: {
          color: '#4a9eff',
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
          }
        }
      };

      const rzp = new Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        setError('❌ Payment failed. Please try again.');
        setProcessing(false);
        console.error('Payment failed:', response.error);
      });

      rzp.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      setError('❌ Payment initialization failed');
      setProcessing(false);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!address.street || !address.city || !address.zipCode) {
      setError('Please fill complete address');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (paymentMethod === 'COD') {
      try {
        await api.post('/orders/create', {
          paymentMethod,
          shippingAddress: address,
        });
        setMessage('✅ Order placed successfully!');
        setShowCheckout(false);
        setTimeout(() => navigate('/my-orders'), 2000);
      } catch (error) {
        setError(error.response?.data?.message || 'Checkout failed');
        setTimeout(() => setError(''), 3000);
      }
    } else {
      setShowCheckout(false);
      handleRazorpayPayment();
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    const num = parseFloat(value);
    return !isNaN(num) ? num.toFixed(decimals) : '0.00';
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (error && !cart) {
    return (
      <div className="error-page">
        <h2>Cart Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="btn-back">
          ← Back to Home
        </button>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Add some products to get started!</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>
      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      <div className="cart-container">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.product._id} className="cart-item">
              <img 
                src={item.product.image || 'https://via.placeholder.com/100'} 
                alt={item.product.name}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/100?text=No+Image';
                }}
              />
              <div className="cart-item-info">
                <h3>{item.product.name}</h3>
                <p className="cart-item-price">₹{safeToFixed(item.price)}</p>
              </div>
              <div className="cart-item-actions">
                <div className="quantity-controls">
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product._id)}
                  className="btn-remove"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>₹{safeToFixed(cart.totalAmount)}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>₹{safeToFixed(cart.totalAmount)}</span>
          </div>

          <button onClick={() => setShowCheckout(true)} className="btn-checkout">
            Proceed to Checkout
          </button>
        </div>
      </div>

      {showCheckout && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowCheckout(false)}>
              ×
            </button>
            <h2>Delivery Address</h2>
            <form onSubmit={handleCheckout}>
              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Zip Code *</label>
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Country *</label>
                  <input
                    type="text"
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    required
                  />
                </div>
              </div>

              <h3>Payment Method</h3>
              <div className="payment-method">
                <label>
                  <input
                    type="radio"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  💵 Cash on Delivery
                </label>
                <label>
                  <input
                    type="radio"
                    value="Prepaid"
                    checked={paymentMethod === 'Prepaid'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  💳 Pay Online (Razorpay)
                </label>
              </div>

              <button type="submit" className="btn-submit" disabled={processing}>
                {processing ? 'Processing...' : (paymentMethod === 'COD' ? 'Place Order' : 'Continue to Payment')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;