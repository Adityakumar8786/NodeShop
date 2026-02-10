import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchDeliveryPersons();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPersons = async () => {
    try {
      const response = await api.get('/admin/delivery-persons');
      setDeliveryPersons(response.data);
    } catch (error) {
      console.error('Error fetching delivery persons:', error);
    }
  };

  const handleAssignDelivery = async (orderId) => {
    if (!selectedDelivery) {
      setMessage('Please select a delivery person');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      await api.put(`/orders/${orderId}/assign-delivery`, {
        deliveryPersonId: selectedDelivery,
      });
      setMessage('Delivery person assigned successfully!');
      setSelectedOrder(null);
      setSelectedDelivery('');
      fetchOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Assignment failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      setMessage('Order status updated!');
      fetchOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Update failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await api.delete(`/admin/orders/${orderId}`);
      setMessage('Order deleted successfully!');
      fetchOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delete failed');
      setTimeout(() => setMessage(''), 3000);
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

  return (
    <div className="admin-orders">
      <h1>Order Management</h1>
      {message && <div className="message">{message}</div>}

      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Delivery Person</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order.orderNumber}</td>
                <td>
                  <div>{order.user?.name || 'N/A'}</div>
                  <small>{order.user?.email || ''}</small>
                </td>
                <td>{order.items?.length || 0} items</td>
                <td>₹{safeToFixed(order.totalAmount)}</td>
                <td>
                  {order.paymentMethod}
                  <br />
                  <small>{order.paymentStatus}</small>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </span>
                </td>
                <td>
                  {order.deliveryPerson ? (
                    <div>
                      {order.deliveryPerson.name}
                      <br />
                      <small>{order.deliveryPerson.phone}</small>
                    </div>
                  ) : (
                    <button
                      className="btn-assign"
                      onClick={() => setSelectedOrder(order._id)}
                    >
                      Assign
                    </button>
                  )}
                </td>
                <td>
                  <div className="order-actions">
                    {order.status === 'Pending' && (
                      <button
                        className="btn-action"
                        onClick={() => handleStatusChange(order._id, 'Packed')}
                      >
                        Mark Packed
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteOrder(order._id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>
              ×
            </button>
            <h2>Assign Delivery Person</h2>
            <div className="form-group">
              <label>Select Delivery Person *</label>
              <select
                value={selectedDelivery}
                onChange={(e) => setSelectedDelivery(e.target.value)}
              >
                <option value="">-- Select Delivery Person --</option>
                {deliveryPersons.map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.name} - {person.phone}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-submit"
              onClick={() => handleAssignDelivery(selectedOrder)}
            >
              Assign Delivery Person
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;