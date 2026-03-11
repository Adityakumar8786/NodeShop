import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import './Home.css';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory
        ? `/products?category=${selectedCategory}`
        : '/products';
      const response = await api.get(url);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const safeToFixed = (value, decimals = 2) => {
    return value ? Number(value).toFixed(decimals) : '0.00';
  };

  return (
    <div className="home">
      <div className="home-header">
        <h1>Welcome to NodeShop</h1>
        <p>Your one-stop shop for everything</p>
      </div>

      <div className="category-filter">
        <button
          className={!selectedCategory ? 'category-btn active' : 'category-btn'}
          onClick={() => setSelectedCategory('')}
        >
          All Products
        </button>
        {categories.map((category) => (
          <button
            key={category._id}
            className={
              selectedCategory === category._id ? 'category-btn active' : 'category-btn'
            }
            onClick={() => setSelectedCategory(category._id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <Link
              to={`/product/${product._id}`}
              key={product._id}
              className="product-card"
            >
              <div className="product-image">
                <img src={product.image} alt={product.name} />
                {product.discount > 0 && (
                  <span className="discount-badge">{product.discount}% OFF</span>
                )}
              </div>
              
              <div className="product-info">
                <h3>{product.name}</h3>
                
                <div className="product-price">
                  <span className="final-price">₹{safeToFixed(product.finalPrice || product.price)}</span>
                  {product.discount > 0 && (
                    <span className="original-price">₹{safeToFixed(product.price)}</span>
                  )}
                </div>

                <div className="product-rating">
                  ⭐ {safeToFixed(product.ratings?.average || 0, 1)} | {product.ratings?.count || 0} reviews
                </div>

                <div className="product-stock">
                  {product.stock > 0 ? (
                    <span className="in-stock">In Stock</span>
                  ) : (
                    <span className="out-of-stock">Out of Stock</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="no-products">
          <p>No products found in this category</p>
        </div>
      )}
    </div>
  );
};

export default Home;