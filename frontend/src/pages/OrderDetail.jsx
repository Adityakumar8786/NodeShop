import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/api';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  if (loading) return <div className="loading">Loading order details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!order) return <div className="no-order">Order not found</div>;

  return (
    <div className="order-detail-page">
      <h1>Order #{order.orderNumber}</h1>
      <div className="order-detail-container">
        <div className="order-info">
          <h2>Order Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Status:</strong>
              <span className={`status-${order.status.toLowerCase().replace(' ', '-')}`}>
                {order.status}
              </span>
            </div>
            <div className="info-item">
              <strong>Payment Method:</strong> {order.paymentMethod}
            </div>
            <div className="info-item">
              <strong>Payment Status:</strong> {order.paymentStatus}
            </div>
            <div className="info-item">
              <strong>Total Amount:</strong> ₹{safeToFixed(order.totalAmount)}
            </div>
            <div className="info-item">
              <strong>Placed On:</strong> {new Date(order.createdAt).toLocaleString()}
            </div>
            {order.deliveredAt && (
              <div className="info-item">
                <strong>Delivered On:</strong> {new Date(order.deliveredAt).toLocaleString()}
              </div>
            )}
          </div>

          {/* Add OTP display for customer */}
          {order.paymentMethod === 'Prepaid' && order.deliveryOTP && order.status === 'Out for Delivery' && (
            <div className="otp-section">
              <h3>Delivery Verification OTP</h3>
              <div className="otp-box">
                <h2>{order.deliveryOTP}</h2>
              </div>
              <div className="otp-instructions">
                <p>📱 <strong>IMPORTANT:</strong> Share this OTP with the delivery person when they arrive.</p>
                <p>🔒 Do not share this OTP with anyone except the delivery person.</p>
              </div>
            </div>
          )}
        </div>

        <div className="shipping-info">
          <h2>Shipping Address</h2>
          <p>{order.shippingAddress.street}</p>
          <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
          <p>{order.shippingAddress.country}</p>
        </div>

        <div className="delivery-person-info">
          {order.deliveryPerson && (
            <>
              <h2>Delivery Person</h2>
              <p><strong>Name:</strong> {order.deliveryPerson.name}</p>
              <p><strong>Phone:</strong> {order.deliveryPerson.phone}</p>
            </>
          )}
        </div>

        <div className="order-items">
          <h2>Order Items</h2>
          {order.items.map((item, index) => (
            <div key={index} className="order-item">
              <img src={item.image} alt={item.name} className="item-image" />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p>Quantity: {item.quantity}</p>
                <p>Price: ₹{safeToFixed(item.price)}</p>
                <p>Subtotal: ₹{safeToFixed(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => navigate('/my-orders')} className="btn-back">
        ← Back to My Orders
      </button>
    </div>
  );
};

export default OrderDetail;