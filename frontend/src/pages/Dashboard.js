import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload form states
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your dashboard');
        setLoading(false);
        return;
      }

      const [itemsRes, statsRes] = await Promise.all([
        axios.get('/api/items', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/users/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setItems(itemsRes.data.items);
      setStats(statsRes.data.stats);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to upload items');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('item_name', name);
      formData.append('description', description);
      formData.append('category', category);

      await axios.post('/api/items', formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Reset form
      setName('');
      setDescription('');
      setCategory('');
      setSelectedFile(null);
      setPreviewUrl('');
      setShowUploadForm(false);

      // Refresh data
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload item');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const viewItemDetails = (itemId) => {
    // Navigate to price comparison page or item details
    window.location.href = `/price-comparison?item=${itemId}`;
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {user.username}!</p>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.totalItems}</h3>
              <p>Total Items</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalPriceLogs}</h3>
              <p>Price Analyses</p>
            </div>
            <div className="stat-card">
              <h3>${parseFloat(stats.averageEstimatedPrice || 0).toFixed(2)}</h3>
              <p>Avg. Item Value</p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>My Antique Items</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowUploadForm(!showUploadForm)}
            >
              {showUploadForm ? 'Cancel' : '+ Add New Item'}
            </button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <form onSubmit={handleUpload} style={{ marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Victorian Pocket Watch"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the item..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select category</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Watches">Watches</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Art">Art</option>
                  <option value="Ceramics">Ceramics</option>
                  <option value="Textiles">Textiles</option>
                  <option value="Books">Books</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Upload Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  required
                />
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="preview-image" />
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Item'}
              </button>
            </form>
          )}
        </div>

        {/* Items List */}
        <div className="card">
          <h3>Your Items</h3>
          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No items yet. Add your first antique item to get started!
            </p>
          ) : (
            <div className="items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {items.map((item) => (
                <div key={item.item_id} className="item-card" style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                  {/* Item Image */}
                  <div style={{ position: 'relative', paddingTop: '75%', background: '#f5f5f5' }}>
                    {item.image_url ? (
                      <img
                        src={item.image_url.startsWith('http') ? item.image_url : `http://localhost:5002/${item.image_url}`}
                        alt={item.item_name}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300x225?text=No+Image';
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999'
                      }}>
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div style={{ padding: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{item.item_name}</h4>
                    <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '0.9rem' }}>
                      {item.description ? item.description.substring(0, 80) + '...' : 'No description'}
                    </p>

                    <div style={{ marginBottom: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: '#e7f5ff',
                        color: '#667eea',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500'
                      }}>
                        {item.category || 'Unknown'}
                      </span>
                    </div>

                    <div style={{
                      padding: '12px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>
                        Estimated Price
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                        {item.estimated_price
                          ? `$${parseFloat(item.estimated_price).toFixed(2)}`
                          : 'Analyzing...'}
                      </div>
                    </div>

                    {item.marketplace_count > 0 && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#667eea',
                        marginBottom: '12px',
                        padding: '8px',
                        background: '#e7f5ff',
                        borderRadius: '4px',
                        textAlign: 'center'
                      }}>
                        📊 {item.marketplace_count} marketplace price{item.marketplace_count !== 1 ? 's' : ''} found
                      </div>
                    )}

                    <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '12px' }}>
                      Added: {new Date(item.upload_date).toLocaleDateString()}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '0.9rem' }}
                        onClick={() => viewItemDetails(item.item_id)}
                      >
                        View Details
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.9rem' }}
                        onClick={() => handleDelete(item.item_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
