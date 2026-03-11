import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../config/api';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (order && order.status === 'Out for Delivery') {
      loadMap();
      const interval = setInterval(fetchDeliveryLocation, 5000);
      return () => clearInterval(interval);
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setMessage('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const loadMap = async () => {
    if (mapLoaded || !window.google) {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAPT_lt5a6Um9qXlhi7BI6KfbBTO0--M7w`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        initMap();
      }
    }
  };

  const initMap = () => {
    try {
      const mapDiv = document.getElementById('map');
      if (!mapDiv || !window.google) return;

      const defaultPos = { lat: 20.5937, lng: 78.9629 };
      
      const map = new window.google.maps.Map(mapDiv, {
        center: defaultPos,
        zoom: 12,
      });

      const marker = new window.google.maps.Marker({
        position: defaultPos,
        map: map,
        title: 'Delivery Person',
      });

      window.deliveryMap = map;
      window.deliveryMarker = marker;
      setMapLoaded(true);
    } catch (error) {
      console.error('Map init error:', error);
    }
  };

  const fetchDeliveryLocation = async () => {
    try {
      const response = await api.get(`/delivery/track/${id}`);
      setDeliveryLocation(response.data);

      if (window.deliveryMap && window.deliveryMarker && response.data) {
        const pos = {
          lat: response.data.latitude,
          lng: response.data.longitude,
        };
        window.deliveryMarker.setPosition(pos);
        window.deliveryMap.panTo(pos);
      }
    } catch (error) {
      console.error('Location fetch error:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/reviews', {
        productId: selectedProduct.product,
        orderId: order._id,
        rating,
        comment,
      });

      setMessage('✅ Review submitted!');
      setShowReviewModal(false);
      setSelectedProduct(null);
      setRating(5);
      setComment('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Review failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#f39c12',
      'Packed': '#3498db',
      'Out for Delivery': '#9b59b6',
      'Delivered': '#27ae60',
      'Cancelled': '#e74c3c',
    };
    return colors[status] || '#95a5a6';
  };

  if (loading) {
    return <div className="loading">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="error-page">
        <h2>Order Not Found</h2>
        <button onClick={() => navigate('/my-orders')} className="btn-back">
          ← Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <h1>Order Details</h1>
      {message && <div className="message">{message}</div>}

      <div className="order-detail-container">
        <div className="order-header">
          <div className="order-number">
            <h2>Order #{order.orderNumber}</h2>
            <span className="order-date">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div 
            className="order-status-badge" 
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {order.status}
          </div>
        </div>

        <div className="order-items-section">
          <h3>Items</h3>
          {order.items?.map((item, index) => (
            <div key={index} className="order-item">
              <img src={item.image} alt={item.name} />
              <div className="item-info">
                <h4>{item.name}</h4>
                <p>Quantity: {item.quantity}</p>
                <p className="item-price">₹{safeToFixed(item.price)}</p>
              </div>
              <div className="item-total">
                ₹{safeToFixed(item.price * item.quantity)}
              </div>
              {order.status === 'Delivered' && user?.role === 'Customer' && (
                <button
                  className="btn-review"
                  onClick={() => {
                    setSelectedProduct(item);
                    setShowReviewModal(true);
                  }}
                >
                  ⭐ Rate
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="order-info-grid">
          <div className="info-section">
            <h3>Delivery Address</h3>
            {order.shippingAddress ? (
              <>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                <p>{order.shippingAddress.zipCode}</p>
              </>
            ) : (
              <p>No address</p>
            )}
          </div>

          <div className="info-section">
            <h3>Payment</h3>
            <p><strong>Method:</strong> {order.paymentMethod}</p>
            <p><strong>Status:</strong> {order.paymentStatus}</p>
            <p><strong>Total:</strong> ₹{safeToFixed(order.totalAmount)}</p>
          </div>
        </div>

        {order.status === 'Out for Delivery' && (
          <div className="map-section">
            <h3>📍 Track Delivery</h3>
            <div id="map" style={{ width: '100%', height: '400px', borderRadius: '8px' }}></div>
            {deliveryLocation && (
              <div className="location-info">
                <p>🚚 {deliveryLocation.deliveryPerson?.name}</p>
                <p>📞 {deliveryLocation.deliveryPerson?.phone}</p>
                <p className="update-time">
                  Updated: {new Date(deliveryLocation.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showReviewModal && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowReviewModal(false)}>
              ×
            </button>
            <h2>Rate Product</h2>
            <form onSubmit={handleSubmitReview}>
              <div className="rating-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${rating >= star ? 'selected' : ''}`}
                    onClick={() => setRating(star)}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review..."
                rows="4"
                required
              />
              <button type="submit" className="btn-submit">
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;