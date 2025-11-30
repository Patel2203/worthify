import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AppraisalForm.css';

const AppraisalForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    item_condition: '',
    estimated_price: '',
    is_public: true
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
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

  const conditions = ['Excellent', 'Good', 'Fair', 'Poor'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should not exceed 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('item_condition', formData.item_condition);
      submitData.append('estimated_price', formData.estimated_price);
      submitData.append('is_public', formData.is_public);
      if (image) {
        submitData.append('image', image);
      }

      const response = await axios.post(
        '/api/appraisals/items',
        submitData,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      alert('Appraisal item submitted successfully!');
      navigate('/my-appraisals');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit appraisal item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appraisal-form-container">
      <div className="appraisal-form-card">
        <h2>Submit Item for Appraisal</h2>
        <p className="form-description">
          Share your antique item with the community for expert appraisals and feedback
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Item Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Victorian Era Pocket Watch"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Provide detailed information about the item, its history, markings, etc."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="item_condition">Condition *</label>
              <select
                id="item_condition"
                name="item_condition"
                value={formData.item_condition}
                onChange={handleChange}
                required
              >
                <option value="">Select Condition</option>
                {conditions.map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="estimated_price">Your Estimated Price (USD)</label>
            <input
              type="number"
              id="estimated_price"
              name="estimated_price"
              value={formData.estimated_price}
              onChange={handleChange}
              step="0.01"
              placeholder="Optional - Your estimate"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">Upload Image *</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_public"
                checked={formData.is_public}
                onChange={handleChange}
              />
              <span>Share publicly for community appraisals</span>
            </label>
            <p className="help-text">
              If unchecked, only you will be able to view this item
            </p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/appraisals')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit for Appraisal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppraisalForm;
