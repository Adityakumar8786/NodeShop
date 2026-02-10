import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🛒 NodeShop
        </Link>

        <ul className="navbar-menu">
          <li>
            <Link to="/">Home</Link>
          </li>

          {user ? (
            <>
              {user.role === 'Customer' && (
                <>
                  <li>
                    <Link to="/cart">🛒 Cart</Link>
                  </li>
                  <li>
                    <Link to="/my-orders">📦 My Orders</Link>
                  </li>
                </>
              )}

              {user.role === 'Admin' && (
                <>
                  <li>
                    <Link to="/admin">📊 Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/admin/products">📦 Products</Link>
                  </li>
                  <li>
                    <Link to="/admin/categories">📁 Categories</Link>
                  </li>
                  <li>
                    <Link to="/admin/orders">📋 Orders</Link>
                  </li>
                </>
              )}

              {user.role === 'Delivery' && (
                <li>
                  <Link to="/delivery">🚚 My Deliveries</Link>
                </li>
              )}

              <li className="navbar-user">
                <span>👤 {user.name} ({user.role})</span>
                <Link to="/profile" className="btn-profile">Profile</Link>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;