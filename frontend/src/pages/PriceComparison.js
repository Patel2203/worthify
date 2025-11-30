import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../api/axios';

const PriceComparison = () => {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemDetails, setItemDetails] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);

  const fetchPriceHistory = useCallback(async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/prices/history/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.data.priceHistory) {
        setPriceHistory({
          priceHistory: response.data.priceHistory,
          totalListings: response.data.totalListings
        });
      }
    } catch (err) {
      console.error('Failed to load price history:', err);
    }
  }, []);

  const fetchItemDetails = useCallback(async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/items/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setItemDetails(response.data.item);
      fetchPriceHistory(itemId);
    } catch (err) {
      console.error('Failed to load item details:', err);
    }
  }, [fetchPriceHistory]);

  const fetchItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/items', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setItems(response.data.items);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    // Check if item ID is passed in URL params
    const params = new URLSearchParams(location.search);
    const itemId = params.get('item');
    if (itemId) {
      setSelectedItem(itemId);
      fetchItemDetails(itemId);
    }
  }, [location, fetchItems, fetchItemDetails]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setAnalysis(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      // Call price analysis API
      const analysisRes = await axios.post('/api/prices/analyze', {
        itemId: selectedItem,
        keywords: keywords || (itemDetails ? itemDetails.item_name : '')
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setAnalysis(analysisRes.data.analysis);

      // Refresh price history after analysis
      if (selectedItem) {
        fetchPriceHistory(selectedItem);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze prices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedItem(itemId);
    setKeywords(''); // Clear keywords to trigger Google Lens on next analysis

    if (itemId) {
      // Fetch item details when selected from dropdown
      fetchItemDetails(itemId);
    } else {
      setItemDetails(null);
      setPriceHistory(null);
      setAnalysis(null);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Price Comparison</h1>
          <p>Compare prices across multiple marketplaces</p>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Item Details Section */}
        {itemDetails && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2>Item Information</h2>
           
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', marginTop: '20px' }}>
              {/* Item Image */}
              <div>
                {itemDetails.image_url ? (
                  <img
                    src={itemDetails.image_url.startsWith('http') ? itemDetails.image_url : `https://worthify-production.up.railway.app/${itemDetails.image_url}`}
                    alt={itemDetails.item_name}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    paddingTop: '100%',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    No Image
                  </div>
                )}
              </div>

              {/* Item Info */}
              <div>
                <h3 style={{ marginTop: 0, fontSize: '1.5rem', marginBottom: '16px' }}>{itemDetails.item_name}</h3>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 16px',
                    background: '#e7f5ff',
                    color: '#667eea',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    {itemDetails.category || 'Unknown'}
                  </span>
                </div>

                {itemDetails.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Description:</strong>
                    <p style={{ margin: 0, lineHeight: '1.6', color: '#444' }}>{itemDetails.description}</p>
                  </div>
                )}

                {itemDetails.estimated_price && (
                  <div style={{
                    padding: '16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    marginTop: '16px'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '4px' }}>
                      Estimated Price
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                      ${parseFloat(itemDetails.estimated_price).toFixed(2)}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '16px' }}>
                  Added: {new Date(itemDetails.upload_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Form */}
        <div className="card">
          <h2>Analyze Item Prices</h2>
          <form onSubmit={handleAnalyze}>
            <div className="form-group">
              <label>Select Item</label>
              <select
                value={selectedItem}
                onChange={handleItemSelect}
                required
              >
                <option value="">-- Select an item --</option>
                {items.map(item => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.item_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Search Keywords (optional - Image analysis is prioritized)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Leave empty - Image will be analyzed automatically"
              />
              
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Prices'}
            </button>
          </form>
        </div>

        {/* Price Analysis Results */}
        {analysis && (
          <div className="price-comparison">
            {/* Google Lens Results */}
            {analysis.googleLensResults && (
              <div className="card" style={{ marginBottom: '20px', background: '#f0f9ff', borderLeft: '4px solid #3b82f6' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                  🔍 Image Analysis Results
                </h3>

                
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '2px solid #3b82f6'
                  }}>
                    <div style={{ fontSize: '1.3rem', color: '#1e40af', marginTop: '8px', fontWeight: 'bold' }}>
                      {analysis.googleLensResults.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      (This is what's ACTUALLY in your image, not the item name you entered)
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#666' }}>Keywords Generated from Image:</strong>
                    <div style={{
                      marginTop: '8px',
                      padding: '10px',
                      background: '#f1f5f9',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      color: '#374151',
                      fontSize: '0.9rem'
                    }}>
                      {analysis.searchKeywords}
                    </div>
                    
                  </div>

                  
                </div>
              </div>
            )}

            <div className="card">
              <h2>Price Analysis Results</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>${analysis.averagePrice}</h3>
                  <p>Average Price</p>
                </div>
                <div className="stat-card">
                  <h3>${analysis.minPrice}</h3>
                  <p>Minimum Price</p>
                </div>
                <div className="stat-card">
                  <h3>${analysis.maxPrice}</h3>
                  <p>Maximum Price</p>
                </div>
                <div className="stat-card">
                  <h3>{analysis.totalListings}</h3>
                  <p>Total Listings</p>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '20px', background: '#e7f5ff', borderRadius: '8px' }}>
                <strong>Estimated Price Range:</strong>
                <div style={{ fontSize: '1.5rem', color: '#667eea', marginTop: '8px' }}>
                  {analysis.priceRange}
                </div>
              </div>
            </div>

            {/* Marketplace Breakdown */}
            <div className="grid">
              {analysis.marketplaces.map((marketplace, idx) => (
                <div key={idx} className="card marketplace-card" style={{
                  background: marketplace.isVisualMatch ? '#f0fdf4' : '#fff',
                  borderLeft: marketplace.isVisualMatch ? '5px solid #10b981' : '1px solid #ddd',
                  border: marketplace.isVisualMatch ? '2px solid #10b981' : '1px solid #ddd',
                  position: 'relative'
                }}>
                  {marketplace.isVisualMatch && marketplace.priority === 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '4px 12px',
                      background: '#10b981',
                      color: '#fff',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      PRIORITY #1
                    </div>
                  )}
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                    {marketplace.isVisualMatch && '🎯 '}
                    {marketplace.name}
                  </h3>
                  {marketplace.isVisualMatch && (
                    <p style={{ color: '#059669', fontSize: '0.9rem', marginTop: '4px', marginBottom: '8px', fontWeight: '600' }}>
                      ✨ Based on YOUR IMAGE - Not keywords!
                    </p>
                  )}
                  <p style={{ color: '#666', marginBottom: '16px' }}>
                    {marketplace.listings.length} listing(s) found
                  </p>

                  {marketplace.listings.map((listing, listingIdx) => (
                    <div key={listingIdx} className="listing-item" style={{
                      padding: '12px',
                      marginBottom: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#fff'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>{listing.title}</h4>

                      {listing.isVisualMatch && listing.matchScore && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{
                            padding: '2px 8px',
                            background: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {Math.round(listing.matchScore * 100)}% Match
                          </span>
                        </div>
                      )}

                      {!listing.isVisualMatch && (
                        <div className="price" style={{
                          fontSize: '1.3rem',
                          fontWeight: 'bold',
                          color: '#10b981',
                          marginBottom: '8px'
                        }}>
                          ${listing.price.toFixed(2)}
                        </div>
                      )}

                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          background: marketplace.isVisualMatch ? '#10b981' : '#667eea',
                          color: '#fff',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}
                      >
                        {marketplace.isVisualMatch ? '🔍 View Similar Item →' : `View on ${marketplace.name} →`}
                      </a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price History */}
        {priceHistory && priceHistory.priceHistory.length > 0 && (
          <div className="card">
            <h2>Price History</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Total of {priceHistory.totalListings} price records
            </p>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Marketplace</th>
                    <th>Title</th>
                    <th>Price</th>
                    <th>Date</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.priceHistory.slice(0, 20).map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td>
                        <span className="badge badge-user">{log.marketplace}</span>
                      </td>
                      <td>{log.listing_title}</td>
                      <td style={{ fontWeight: '600', color: '#28a745' }}>
                        ${parseFloat(log.price).toFixed(2)}
                      </td>
                      <td>{log.created_at ? new Date(log.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        {log.listing_url && (
                          <a href={log.listing_url} target="_blank" rel="noopener noreferrer">
                            View →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

              
      </div>
    </div>
  );
};

export default PriceComparison;
