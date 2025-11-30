import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AppraisalList.css';

const AppraisalList = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    sort: 'recent'
  });

  const categories = [
    'All Categories',
    'Furniture',
    'Jewelry',
    'Artwork',
    'Ceramics',
    'Glassware',
    'Silverware',
    'Books',
    'Coins',
    'Stamps',
    'Textiles',
    'Toys',
    'Other'
  ];

  const fetchAppraisalItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All Categories') {
        params.append('category', filters.category);
      }
      params.append('sort', filters.sort);

      const response = await axios.get(`/api/appraisals/items/public?${params.toString()}`);
      setItems(response.data.items || []);
    } catch (err) {
      setError('Failed to fetch appraisal items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAppraisalItems();
  }, [fetchAppraisalItems]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleItemClick = (itemId) => {
    navigate(`/appraisals/${itemId}`);
  };

  return (
    <div className="appraisal-list-container">
      <div className="appraisal-list-header">
        <div>
          <h1>Community Appraisals</h1>
          <p>Browse antique items and share your expert opinion</p>
        </div>
        <button
          className="btn-submit-item"
          onClick={() => navigate('/appraisals/new')}
        >
          + Submit Your Item
        </button>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Category:</label>
          <select name="category" value={filters.category} onChange={handleFilterChange}>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select name="sort" value={filters.sort} onChange={handleFilterChange}>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Viewed</option>
            <option value="most_appraised">Most Appraised</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading appraisal items...</div>
      ) : items.length === 0 ? (
        <div className="no-items">
          <p>No items found. Be the first to submit an item for appraisal!</p>
          <button className="btn-primary" onClick={() => navigate('/appraisals/new')}>
            Submit Item
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <div
              key={item.appraisal_item_id}
              className="item-card"
              onClick={() => handleItemClick(item.appraisal_item_id)}
            >
              <div className="item-image">
                {item.image_url ? (
                  <img
                    src={item.image_url.startsWith('http') ? item.image_url : `https://worthify-production.up.railway.app${item.image_url}`}
                    alt={item.title}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>

              <div className="item-content">
                <h3>{item.title}</h3>
                <p className="item-description">{item.description.substring(0, 100)}...</p>

                <div className="item-meta">
                  <span className="category-badge">{item.category}</span>
                  <span className="condition-badge">{item.item_condition}</span>
                </div>

                <div className="item-stats">
                  <div className="stat">
                    <span className="stat-label">Owner's Estimate:</span>
                    <span className="stat-value">
                      {item.estimated_price ? `$${parseFloat(item.estimated_price).toFixed(2)}` : 'N/A'}
                    </span>
                  </div>
                  {item.avg_appraisal_price && (
                    <div className="stat">
                      <span className="stat-label">Avg Appraisal:</span>
                      <span className="stat-value">${parseFloat(item.avg_appraisal_price).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="item-footer">
                  <span className="appraisal-count">
                    {item.appraisal_count || 0} Appraisal{item.appraisal_count !== 1 ? 's' : ''}
                  </span>
                  <span className="view-count">
                    {item.view_count || 0} View{item.view_count !== 1 ? 's' : ''}
                  </span>
                  <span className="owner">by {item.owner_name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppraisalList;
