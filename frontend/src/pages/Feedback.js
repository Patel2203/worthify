import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Feedback.css';

const Feedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    message: '',
    rating: 5
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.post('/api/feedback', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Thank you for your feedback! We appreciate your input.');
      setFormData({
        message: '',
        rating: 5
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`star ${formData.rating >= star ? 'active' : ''}`}
        onClick={() => setFormData({ ...formData, rating: star })}
      >
        ★
      </span>
    ));
  };

  if (!user) {
    return (
      <div className="page">
        <div className="container">
          <div className="feedback-login-prompt">
            <h2>Please log in to submit feedback</h2>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="feedback-container">
          <div className="feedback-header">
            <h1>We Value Your Feedback</h1>
            <p>Help us improve Worthify by sharing your thoughts and experiences</p>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div className="feedback-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>How would you rate your experience?</label>
                <div className="star-rating">
                  {renderStars()}
                  <span className="rating-text">
                    {formData.rating === 5 && 'Excellent'}
                    {formData.rating === 4 && 'Very Good'}
                    {formData.rating === 3 && 'Good'}
                    {formData.rating === 2 && 'Fair'}
                    {formData.rating === 1 && 'Poor'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Your Feedback *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Tell us what you think about Worthify. What features do you love? What could we improve?"
                />
              </div>

              <div className="feedback-info">
                <p>
                  💡 Your feedback helps us make Worthify better for everyone.
                  We read every submission and use your insights to prioritize new features and improvements.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>

          <div className="feedback-stats">
            <h3>What We're Working On</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">🚀</div>
                <h4>AI Improvements</h4>
                <p>Enhancing price prediction accuracy</p>
              </div>
              <div className="stat-item">
                <div className="stat-icon">👥</div>
                <h4>Community Features</h4>
                <p>Better appraisal collaboration tools</p>
              </div>
              <div className="stat-item">
                <div className="stat-icon">📱</div>
                <h4>Mobile App</h4>
                <p>iOS and Android apps coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
