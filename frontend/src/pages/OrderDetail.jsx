import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import api from '../config/api';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
  if (order && order.status === 'Out for Delivery') {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAPT_lt5a6Um9qXlhi7BI6KfbBTO0--M7w&libraries=maps,marker`;
    script.async = true;
    script.onload = () => {
      initializeMap();
      const interval = setInterval(fetchTracking, 5000);
      return () => clearInterval(interval);
    };
    document.head.appendChild(script);
  }
}, [order]);


  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async () => {
    try {
      const response = await api.get(`/delivery/track/${id}`);
      setTrackingData(response.data);
      if (marker && response.data.currentLocation) {
        marker.setPosition({
          lat: response.data.currentLocation.latitude,
          lng: response.data.currentLocation.longitude,
        });
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
    }
  };

  const initializeMap = async () => {
  try {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const mapInstance = new Map(document.getElementById('map'), {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 12,
      mapId: 'DEMO_MAP_ID'
    });

    const markerInstance = new AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: 20.5937, lng: 78.9629 },
      title: 'Delivery Person',
    });

    setMap(mapInstance);
    setMarker(markerInstance);
  } catch (error) {
    console.error('Error loading map:', error);
  }
};

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', {
        productId: selectedProduct,
        orderId: id,
        rating,
        comment,
      });
      setMessage('Review submitted successfully!');
      setSelectedProduct(null);
      setRating(5);
      setComment('');
      fetchOrder();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#f39c12';
      case 'Packed':
        return '#3498db';
      case 'Out for Delivery':
        return '#9b59b6';
      case 'Delivered':
        return '#27ae60';
      case 'Cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  if (loading) {
    return <div className="loading">Loading order details...</div>;
  }

  if (!order) {
    return <div className="error">Order not found</div>;
  }

  return (
    <div className="order-detail">
      <h1>Order Details</h1>
      {message && <div className="message">{message}</div>}

      <div className="order-detail-header">
        <div>
          <h2>Order #{order.orderNumber}</h2>
          <p className="order-detail-date">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div
          className="order-detail-status"
          style={{ backgroundColor: getStatusColor(order.status) }}
        >
          {order.status}
        </div>
      </div>

      <div className="order-detail-grid">
        <div className="order-detail-section">
          <h3>Items</h3>
          <div className="order-items-list">
            {order.items.map((item, index) => (
              <div key={index} className="order-detail-item">
                <img src={item.image} alt={item.name} />
                <div className="order-item-info">
                  <h4>{item.name}</h4>
                  <p>Quantity: {item.quantity}</p>
                  <p className="order-item-price">₹{safeToFixed(item.price)}</p>
                </div>
                {order.status === 'Delivered' && (
                  <button
                    onClick={() => setSelectedProduct(item.product)}
                    className="btn-review"
                  >
                    ⭐ Rate Product
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="order-detail-section">
          <h3>Delivery Information</h3>
          <div className="info-box">
            <p>
              <strong>Address:</strong>
            </p>
            {order.shippingAddress ? (
              <>
                <p>{order.shippingAddress.street || 'N/A'}</p>
                <p>
                  {order.shippingAddress.city || ''}, {order.shippingAddress.state || ''}{' '}
                  {order.shippingAddress.zipCode || ''}
                </p>
                <p>{order.shippingAddress.country || ''}</p>
              </>
            ) : (
              <p>No address provided</p>
            )}
          </div>

          {order.deliveryPerson && (
            <div className="info-box">
              <p>
                <strong>Delivery Person:</strong>
              </p>
              <p>{order.deliveryPerson.name}</p>
              <p>{order.deliveryPerson.phone}</p>
            </div>
          )}

          <div className="info-box">
            <p>
              <strong>Payment:</strong>
            </p>
            <p>Method: {order.paymentMethod}</p>
            <p>Status: {order.paymentStatus}</p>
          </div>

          <div className="order-detail-total">
            <strong>Total Amount:</strong>
            <span>₹{safeToFixed(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {order.status === 'Out for Delivery' && (
        <div className="tracking-section">
          <h3>🗺️ Live Tracking</h3>
          <div id="map" className="map-container"></div>
          {trackingData && (
            <p className="tracking-info">
              Last updated: {new Date(trackingData.updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {selectedProduct && (
        <div className="review-modal">
          <div className="review-modal-content">
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>
            <h3>Rate this Product</h3>
            <form onSubmit={handleSubmitReview}>
              <div className="rating-selector">
                <label>Rating:</label>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={star <= rating ? 'star active' : 'star'}
                      onClick={() => setRating(star)}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Comment (optional):</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="4"
                  placeholder="Share your experience..."
                />
              </div>

              <button type="submit" className="btn-submit-review">
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