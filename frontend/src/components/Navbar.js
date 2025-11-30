import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Worthify
        </Link>

        <div className="nav-menu">
          <Link to="/" className="nav-link">Home</Link>

          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/price-comparison" className="nav-link">Price Comparison</Link>
              <Link to="/appraisals" className="nav-link">Appraisals</Link>
              <Link to="/my-appraisals" className="nav-link">My Items</Link>
              <Link to="/feedback" className="nav-link">Feedback</Link>

              {user.role === 'admin' && (
                <Link to="/admin" className="nav-link">Admin Panel</Link>
              )}

              <div className="nav-user">
                <span className="user-name">{user.name}</span>
                <span className={`user-badge badge-${user.role}`}>{user.role}</span>
                <button onClick={handleLogout} className="btn btn-logout">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/appraisals" className="nav-link">Appraisals</Link>
              <Link to="/feedback" className="nav-link">Feedback</Link>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">
                <button className="btn btn-primary">Sign Up</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
