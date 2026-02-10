import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import './MyOrders.css';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
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
    return <div className="loading">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="no-orders">
        <h2>No orders yet</h2>
        <p>Start shopping to see your orders here</p>
        <Link to="/" className="btn-primary">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="my-orders">
      <h1>My Orders</h1>

      <div className="orders-list">
        {orders.map((order) => (
          <Link to={`/order/${order._id}`} key={order._id} className="order-card">
            <div className="order-header">
              <div>
                <h3>Order #{order.orderNumber}</h3>
                <p className="order-date">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div
                className="order-status"
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {order.status}
              </div>
            </div>

            <div className="order-items">
              {order.items.slice(0, 3).map((item, index) => (
                <div key={index} className="order-item-preview">
                  <img src={item.image} alt={item.name} />
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <span className="more-items">+{order.items.length - 3} more</span>
              )}
            </div>

            <div className="order-footer">
              <div className="order-total">
                Total: <strong>${safeToFixed(order.totalAmount)}</strong>
              </div>
              <div className="order-payment">
                {order.paymentMethod} - {order.paymentStatus}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;