import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './DeliveryDashboard.css';

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState({});
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [customerOTP, setCustomerOTP] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');

  useEffect(() => {
    fetchAssignedOrders();
    const interval = setInterval(fetchAssignedOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAssignedOrders = async () => {
    try {
      const response = await api.get('/orders/delivery/assigned');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleOutForDelivery = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/out-for-delivery`);
      setMessage('Order marked as out for delivery!');
      fetchAssignedOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Update failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeliver = async (order) => {
    console.log('🚀 Starting deliver for order:', order._id); // NEW LOG
    console.log('💳 Order payment method:', order.paymentMethod); // NEW LOG

    setCurrentOrder(order);
    
    if (order.paymentMethod === 'COD') {
      const cashReceived = window.confirm('Have you collected the cash payment from the customer?');
      if (!cashReceived) {
        setMessage('❌ Cash collection required for COD orders');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      
      // Directly deliver for COD
      try {
        await api.put(`/orders/${order._id}/deliver`, { cashReceived: true });
        setMessage('✅ Order delivered successfully!');
        fetchAssignedOrders();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error('❌ COD deliver error:', error); // NEW LOG
        setMessage(error.response?.data?.message || 'Delivery failed');
        setTimeout(() => setMessage(''), 3000);
      }
    } else {
      // Generate OTP for Prepaid
      try {
        const response = await api.put(`/orders/${order._id}/deliver`, {});
        console.log('📡 Deliver API response:', response.data); // NEW LOG
        
        if (response.data.requiresOTP) {
          setGeneratedOTP(response.data.mockOTP);
          setShowOTPModal(true);
        }
      } catch (error) {
        console.error('❌ Prepaid deliver error:', error); // NEW LOG
        setMessage(error.response?.data?.message || 'Failed to generate OTP');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    console.log('🔑 Submitting OTP:', customerOTP); // NEW LOG
    
    try {
      await api.put(`/orders/${currentOrder._id}/deliver`, { 
        deliveryOTP: customerOTP 
      });
      
      setMessage('✅ OTP Verified! Order delivered successfully!');
      setShowOTPModal(false);
      setCustomerOTP('');
      setGeneratedOTP('');
      setCurrentOrder(null);
      fetchAssignedOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ OTP submit error:', error); // NEW LOG
      setMessage(error.response?.data?.message || 'Invalid OTP');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateLocation = async (orderId) => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      return;
    }

    setUpdatingLocation({ ...updatingLocation, [orderId]: true });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post('/delivery/update-location', {
            orderId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setMessage('📍 Location updated!');
          setTimeout(() => setMessage(''), 2000);
        } catch (error) {
          setMessage('Failed to update location');
        } finally {
          setUpdatingLocation({ ...updatingLocation, [orderId]: false });
        }
      },
      () => {
        setMessage('Unable to retrieve location');
        setUpdatingLocation({ ...updatingLocation, [orderId]: false });
      }
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Packed':
        return '#3498db';
      case 'Out for Delivery':
        return '#9b59b6';
      case 'Delivered':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  return (
    <div className="delivery-dashboard">
      <h1>🚚 My Deliveries</h1>
      {message && <div className="message">{message}</div>}

      {orders.length === 0 ? (
        <div className="no-orders">
          <p>No orders assigned to you yet</p>
        </div>
      ) : (
        <div className="delivery-orders">
          {orders.map((order) => (
            <div key={order._id} className="delivery-order-card">
              <div className="delivery-order-header">
                <h3>Order #{order.orderNumber}</h3>
                <span
                  className="delivery-status"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status}
                </span>
              </div>

              <div className="delivery-order-info">
                <div className="info-row">
                  <strong>Customer Name:</strong> {order.user?.name || 'N/A'}
                </div>
                <div className="info-row">
                  <strong>Phone:</strong> {order.user?.phone || 'N/A'}
                </div>
                <div className="info-row">
                  <strong>Delivery Address:</strong>
                  <span>
                    {order.shippingAddress?.street}, {order.shippingAddress?.city},{' '}
                    {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                  </span>
                </div>
                <div className="info-row">
                  <strong>Number of Products:</strong> {order.items?.length || 0} items
                </div>
                <div className="info-row payment-highlight">
                  <strong>Payment Type:</strong> 
                  <span className={order.paymentMethod === 'COD' ? 'cod-badge' : 'prepaid-badge'}>
                    {order.paymentMethod}
                  </span>
                </div>
                <div className="info-row">
                  <strong>Total Order Amount:</strong> 
                  <span className="amount-highlight">₹{safeToFixed(order.totalAmount)}</span>
                </div>
                <div className="info-row">
                  <strong>Payment Status:</strong> {order.paymentStatus}
                </div>
              </div>

              <div className="delivery-actions">
                {order.status === 'Packed' && (
                  <button
                    className="btn-out-delivery"
                    onClick={() => handleOutForDelivery(order._id)}
                  >
                    🚚 Mark Out for Delivery
                  </button>
                )}

                {order.status === 'Out for Delivery' && (
                  <>
                    <button
                      className="btn-location"
                      onClick={() => updateLocation(order._id)}
                      disabled={updatingLocation[order._id]}
                    >
                      📍 {updatingLocation[order._id] ? 'Updating...' : 'Update Location'}
                    </button>
                    <button
                      className="btn-delivered"
                      onClick={() => handleDeliver(order)}
                    >
                      ✅ Mark as Delivered
                    </button>
                  </>
                )}

                {order.status === 'Delivered' && (
                  <div className="delivered-info">
                    <p>✅ Delivered on {new Date(order.deliveredAt).toLocaleString()}</p>
                    {order.paymentMethod === 'COD' && order.cashReceived && (
                      <p className="cash-collected">💰 Cash Collected</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showOTPModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>📱 Customer OTP Verification</h2>
            <div className="otp-info">
              <p>OTP has been sent to customer's phone.</p>
              <div className="otp-display-box">
                <p>Demo OTP (In production, customer receives via SMS):</p>
                <h3>{generatedOTP}</h3>
              </div>
              <p className="otp-instruction">Ask the customer for their 6-digit OTP:</p>
            </div>
            <form onSubmit={handleOTPSubmit}>
              <div className="form-group">
                <label>Enter Customer's OTP *</label>
                <input
                  type="text"
                  value={customerOTP}
                  onChange={(e) => setCustomerOTP(e.target.value)}
                  placeholder="000000"
                  maxLength="6"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-verify">
                  ✅ Verify & Complete Delivery
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => {
                    setShowOTPModal(false);
                    setCustomerOTP('');
                    setGeneratedOTP('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;