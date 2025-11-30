import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>📜 Welcome to Worthify</h1>
          
        </div>

        <div className="card">
          <p style={{ lineHeight: '1.8', color: '#555' }}>
            Our advanced platform helps you determine the value of your antique items
            by analyzing images and comparing prices across multiple marketplaces including
            eBay, Etsy, Amazon, and more. Using cutting-edge image recognition and
            real-time market data, we provide accurate price estimates for your collectibles.
          </p>
        </div>

        <div className="grid" style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
          <div className="card" style={{ borderLeft: '4px solid #667eea', flex: '0 1 400px' }}>
            <h3>🖼️ Image Analysis</h3>
            <p>Upload or capture an image of your antique item and our AI will identify it.</p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #28a745', flex: '0 1 400px' }}>
            <h3>💰 Price Prediction</h3>
            <p>Get real-time price comparisons from multiple online marketplaces.</p>
          </div>
        </div>

        {!user && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>
              Get Started Today
            </h2>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <Link to="/register">
                <button className="btn btn-primary" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                  Sign Up Free
                </button>
              </Link>
              <Link to="/login">
                <button className="btn btn-secondary" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                  Login
                </button>
              </Link>
            </div>
          </div>
        )}

        {user && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>
              Ready to Start?
            </h2>
            <Link to="/dashboard">
              <button className="btn btn-primary" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                Go to Dashboard
              </button>
            </Link>
          </div>
        )}

        <div className="card" style={{ marginTop: '40px' }}>
          <h3>How It Works</h3>
          <ol style={{ lineHeight: '2', color: '#555', paddingLeft: '20px' }}>
            <li><strong>Create an Account:</strong> Sign up for free to access all features</li>
            <li><strong>Upload Image:</strong> Take a photo or upload an image of your antique item</li>
            <li><strong>AI Analysis:</strong> Our system identifies the item category and characteristics</li>
            <li><strong>Price Comparison:</strong> We fetch real-time prices from multiple marketplaces</li>
            <li><strong>Get Results:</strong> Receive estimated value and detailed market analysis</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Home;
