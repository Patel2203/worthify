import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyAppraisals.css';

const MyAppraisals = () => {
  const navigate = useNavigate();
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyItems();
  }, []);

  const fetchMyItems = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('/api/appraisals/items/my/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyItems(response.data.items || []);
    } catch (err) {
      setError('Failed to fetch your items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/appraisals/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Item deleted successfully');
      fetchMyItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  return (
    <div className="my-appraisals-container">
      <div className="page-header">
        <h1>My Appraisal Items</h1>
        <button className="btn-new-item" onClick={() => navigate('/appraisals/new')}>
          + Submit New Item
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading your items...</div>
      ) : myItems.length === 0 ? (
        <div className="no-items">
          <p>You haven't submitted any items yet.</p>
          <button className="btn-primary" onClick={() => navigate('/appraisals/new')}>
            Submit Your First Item
          </button>
        </div>
      ) : (
        <div className="items-table">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Your Estimate</th>
                <th>Appraisals</th>
                <th>Avg Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myItems.map(item => (
                <tr key={item.appraisal_item_id}>
                  <td>
                    <div className="item-cell">
                      {item.image_url && (
                        <img
                          src={item.image_url.startsWith('http') ? item.image_url : `http://localhost:5002${item.image_url}`}
                          alt={item.title}
                          className="item-thumbnail"
                        />
                      )}
                      <div>
                        <div className="item-title">{item.title}</div>
                        <div className="item-date">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td>{item.item_condition}</td>
                  <td>${item.estimated_price ? parseFloat(item.estimated_price).toFixed(2) : 'N/A'}</td>
                  <td>{item.appraisal_count || 0}</td>
                  <td>
                    {item.avg_appraisal_price
                      ? `$${parseFloat(item.avg_appraisal_price).toFixed(2)}`
                      : 'N/A'}
                  </td>
                  <td>
                    <span className={`status-badge ${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-view"
                        onClick={() => navigate(`/appraisals/${item.appraisal_item_id}`)}
                      >
                        View
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(item.appraisal_item_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyAppraisals;
