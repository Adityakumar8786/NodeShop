import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './AdminCategories.css';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', { name: categoryName });
      setMessage('Category created successfully!');
      setShowModal(false);
      setCategoryName('');
      fetchCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setMessage('Category deleted successfully!');
      fetchCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="admin-categories">
      <div className="admin-header">
        <h1>Category Management</h1>
        <button className="btn-add" onClick={() => setShowModal(true)}>
          ➕ Add Category
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category._id} className="category-card">
            <div className="category-info">
              <h3>{category.name}</h3>
            </div>
            <button className="btn-delete-cat" onClick={() => handleDelete(category._id)}>
              ❌ Delete
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ×
            </button>
            <h2>Add New Category</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Electronics, Fashion, Books"
                  required
                />
              </div>

              <button type="submit" className="btn-submit">
                Create Category
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;