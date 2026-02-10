import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../config/api';
import './Cart.css';

let stripePromise = null;

const CheckoutForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      onError('Payment system not ready. Please wait...');
      return;
    }

    setProcessing(true);

    try {
      const { data } = await api.post('/payment/create-payment-intent', { amount });

      const { error: stripeError } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (stripeError) {
        onError(stripeError.message);
        setProcessing(false);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      onError(err.response?.data?.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="card-element-wrapper">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      <button type="submit" disabled={!stripe || processing} className="btn-pay">
        {processing ? 'Processing...' : `Pay ₹${amount.toFixed(2)}`}
      </button>
      <p className="test-card-info">
        <small>💳 Test Card: 4242 4242 4242 4242 | Expiry: 12/34 | CVC: 123</small>
      </p>
    </form>
  );
};

const Cart = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
  });

  useEffect(() => {
    fetchCart();
    if (user?.address) {
      setAddress(user.address);
    }
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const initializeStripe = async () => {
    if (stripePromise) return;
    
    try {
      const { data } = await api.get('/payment/stripe-key'); // Use GET instead of POST
      stripePromise = await loadStripe(data.publishableKey);
      setStripeReady(true);
      console.log('✅ Stripe loaded successfully');
    } catch (error) {
      console.error('❌ Stripe initialization error:', error);
      setError('Payment system unavailable. Please contact support.');
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const response = await api.put('/cart/update', { productId, quantity });
      setCart(response.data.cart);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update cart');
    }
  };

  const removeItem = async (productId) => {
    try {
      const response = await api.delete(`/cart/remove/${productId}`);
      setCart(response.data.cart);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove item');
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
        setTimeout(() => setError(''), 5000);
      }
    } else {
      // Initialize Stripe and show payment form
      setShowCheckout(false);
      await initializeStripe();
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      await api.post('/orders/create', {
        paymentMethod: 'Prepaid',
        shippingAddress: address,
      });
      
      setMessage('✅ Payment successful! Order placed.');
      setShowPayment(false);
      setTimeout(() => navigate('/my-orders'), 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Order creation failed');
      setShowPayment(false);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
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
              <img src={item.product.image} alt={item.product.name} />
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
                  💳 Online Payment (Stripe)
                </label>
              </div>

              <button type="submit" className="btn-submit">
                {paymentMethod === 'COD' ? 'Place Order' : 'Continue to Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPayment && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowPayment(false)}>
              ×
            </button>
            <h2>💳 Payment Details</h2>
            <p>Amount to pay: <strong>₹{safeToFixed(cart.totalAmount)}</strong></p>
            
            {!stripeReady ? (
              <div className="loading-payment">
                <p>Loading payment system...</p>
              </div>
            ) : stripePromise ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  amount={cart.totalAmount}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            ) : (
              <div className="error-message">
                Payment system unavailable. Please try COD or contact support.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;