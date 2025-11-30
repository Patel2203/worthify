import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AppraisalDetail.css';

const AppraisalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [appraisals, setAppraisals] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [appraisalForm, setAppraisalForm] = useState({
    estimated_price: '',
    comments: '',
    authenticity_rating: '',
    confidence_level: 'Medium'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItemDetails();
    fetchAppraisals();
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/appraisals/items/${id}`);
      setItem(response.data.item);
    } catch (err) {
      setError('Failed to fetch item details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppraisals = async () => {
    try {
      const response = await axios.get(`/api/appraisals/items/${id}/appraisals`);
      setAppraisals(response.data.appraisals || []);
      setStatistics(response.data.statistics);
    } catch (err) {
      console.error('Failed to fetch appraisals:', err);
    }
  };

  const handleAppraisalFormChange = (e) => {
    const { name, value } = e.target;
    setAppraisalForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitAppraisal = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.post(
        '/api/appraisals/appraisals',
        {
          appraisal_item_id: id,
          ...appraisalForm
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Appraisal submitted successfully!');
      setShowAppraisalForm(false);
      setAppraisalForm({
        estimated_price: '',
        comments: '',
        authenticity_rating: '',
        confidence_level: 'Medium'
      });
      fetchAppraisals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit appraisal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    const reason = prompt('Please provide a reason for reporting this item:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.post(
        '/api/appraisals/reports',
        {
          appraisal_item_id: id,
          report_type: 'inappropriate_content',
          reason
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Report submitted successfully. Our team will review it.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit report');
    }
  };

  if (loading) {
    return <div className="loading">Loading item details...</div>;
  }

  if (!item) {
    return <div className="error-message">Item not found</div>;
  }

  return (
    <div className="appraisal-detail-container">
      <button className="btn-back" onClick={() => navigate('/appraisals')}>
        ← Back to Appraisals
      </button>

      <div className="item-detail-section">
        <div className="item-image-large">
          {item.image_url ? (
            <img
              src={item.image_url.startsWith('http') ? item.image_url : `https://worthify-production.up.railway.app${item.image_url}`}
              alt={item.title}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x400?text=No+Image';
              }}
            />
          ) : (
            <div className="no-image-large">No Image Available</div>
          )}
        </div>

        <div className="item-info">
          <h1>{item.title}</h1>

          <div className="item-badges">
            <span className="badge category">{item.category}</span>
            <span className="badge condition">{item.item_condition}</span>
            <span className="badge status">{item.status}</span>
          </div>

          <div className="item-description-section">
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          <div className="item-details-grid">
            <div className="detail-item">
              <span className="label">Owner's Estimate:</span>
              <span className="value">
                {item.estimated_price ? `$${parseFloat(item.estimated_price).toFixed(2)}` : 'Not provided'}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Submitted by:</span>
              <span className="value">{item.owner_name}</span>
            </div>
            <div className="detail-item">
              <span className="label">Date Posted:</span>
              <span className="value">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <span className="label">Views:</span>
              <span className="value">{item.view_count || 0}</span>
            </div>
          </div>

          <div className="item-actions">
            <button
              className="btn-appraise"
              onClick={() => setShowAppraisalForm(!showAppraisalForm)}
            >
              {showAppraisalForm ? 'Cancel' : 'Add Your Appraisal'}
            </button>
            <button className="btn-report" onClick={handleReport}>
              Report Item
            </button>
          </div>
        </div>
      </div>

      {showAppraisalForm && (
        <div className="appraisal-form-section">
          <h2>Submit Your Appraisal</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmitAppraisal}>
            <div className="form-group">
              <label>Your Estimated Price (USD) *</label>
              <input
                type="number"
                name="estimated_price"
                value={appraisalForm.estimated_price}
                onChange={handleAppraisalFormChange}
                step="0.01"
                required
                placeholder="Enter your price estimate"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Authenticity Rating (1-5)</label>
                <select
                  name="authenticity_rating"
                  value={appraisalForm.authenticity_rating}
                  onChange={handleAppraisalFormChange}
                >
                  <option value="">Select Rating</option>
                  <option value="1">1 - Likely Fake</option>
                  <option value="2">2 - Questionable</option>
                  <option value="3">3 - Uncertain</option>
                  <option value="4">4 - Likely Authentic</option>
                  <option value="5">5 - Authentic</option>
                </select>
              </div>

              <div className="form-group">
                <label>Confidence Level</label>
                <select
                  name="confidence_level"
                  value={appraisalForm.confidence_level}
                  onChange={handleAppraisalFormChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Comments</label>
              <textarea
                name="comments"
                value={appraisalForm.comments}
                onChange={handleAppraisalFormChange}
                rows="4"
                placeholder="Share your expert opinion, reasoning, or additional insights..."
              />
            </div>

            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Appraisal'}
            </button>
          </form>
        </div>
      )}

      {statistics && statistics.total_appraisals > 0 && (
        <div className="statistics-section">
          <h2>Appraisal Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">${statistics.avg_price}</div>
              <div className="stat-label">Average Price</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${statistics.min_price}</div>
              <div className="stat-label">Minimum Price</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${statistics.max_price}</div>
              <div className="stat-label">Maximum Price</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{statistics.total_appraisals}</div>
              <div className="stat-label">Total Appraisals</div>
            </div>
            {statistics.avg_authenticity > 0 && (
              <div className="stat-card">
                <div className="stat-value">{statistics.avg_authenticity}/5</div>
                <div className="stat-label">Avg Authenticity</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="appraisals-section">
        <h2>Community Appraisals ({appraisals.length})</h2>

        {appraisals.length === 0 ? (
          <div className="no-appraisals">
            <p>No appraisals yet. Be the first to share your expert opinion!</p>
          </div>
        ) : (
          <div className="appraisals-list">
            {appraisals.map(appraisal => (
              <div key={appraisal.appraisal_id} className="appraisal-card">
                <div className="appraisal-header">
                  <div>
                    <h4>{appraisal.appraiser_name}</h4>
                    <span className="appraisal-date">
                      {new Date(appraisal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="appraisal-price">
                    ${parseFloat(appraisal.estimated_price).toFixed(2)}
                  </div>
                </div>

                <div className="appraisal-ratings">
                  {appraisal.authenticity_rating && (
                    <span className="rating-badge">
                      Authenticity: {appraisal.authenticity_rating}/5
                    </span>
                  )}
                  {appraisal.confidence_level && (
                    <span className="confidence-badge">
                      Confidence: {appraisal.confidence_level}
                    </span>
                  )}
                </div>

                {appraisal.comments && (
                  <div className="appraisal-comments">
                    <p>{appraisal.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppraisalDetail;
