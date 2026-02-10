import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete user "${userName}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      setMessage('User deleted successfully!');
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delete failed');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const filteredUsers = users.filter(user => 
    filter === 'All' ? true : user.role === filter
  );

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>User Management</h1>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="filter-buttons">
        <button 
          className={filter === 'All' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('All')}
        >
          All Users ({users.length})
        </button>
        <button 
          className={filter === 'Customer' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('Customer')}
        >
          Customers ({users.filter(u => u.role === 'Customer').length})
        </button>
        <button 
          className={filter === 'Admin' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('Admin')}
        >
          Admins ({users.filter(u => u.role === 'Admin').length})
        </button>
        <button 
          className={filter === 'Delivery' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('Delivery')}
        >
          Delivery ({users.filter(u => u.role === 'Delivery').length})
        </button>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone || 'N/A'}</td>
                <td>
                  <span className={`role-badge role-${user.role.toLowerCase()}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteUser(user._id, user.name)}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;