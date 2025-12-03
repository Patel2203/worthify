import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import './Moderation.css';

const Moderation = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'reviewed',
    admin_notes: '',
    action: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'items') {
      fetchItems();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/appraisals/admin/stats');
      setStats(response.data.statistics);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchReports = async (status = 'pending') => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/appraisals/admin/reports', {
        params: { status }
      });
      setReports(response.data.reports);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (status = '') => {
    setLoading(true);
    setError('');
    try {
      const params = status ? { status } : {};
      const response = await axios.get('/api/appraisals/admin/items', { params });
      setItems(response.data.items);
    } catch (err) {
      setError('Failed to load items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId) => {
    setError('');
    setSuccess('');

    try {
      await axios.put(`/api/appraisals/admin/reports/${reportId}/review`, reviewForm);
      setSuccess('Report reviewed successfully');
      setSelectedReport(null);
      setReviewForm({ status: 'reviewed', admin_notes: '', action: '' });
      fetchReports();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review report');
    }
  };

  const handleUpdateItemStatus = async (itemId, newStatus, reason = '') => {
    if (!window.confirm(`Are you sure you want to change this item's status to ${newStatus}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axios.put(`/api/appraisals/admin/items/${itemId}/status`, {
        status: newStatus,
        reason
      });
      setSuccess('Item status updated successfully');
      fetchItems();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update item status');
    }
  };

  const renderStats = () => (
    <div className="stats-grid">
      <div className="stat-card pending">
        <div className="stat-number">{stats?.pending_reports || 0}</div>
        <div className="stat-label">Pending Reports</div>
      </div>
      <div className="stat-card reported">
        <div className="stat-number">{stats?.reported_items || 0}</div>
        <div className="stat-label">Reported Items</div>
      </div>
      <div className="stat-card active">
        <div className="stat-number">{stats?.active_items || 0}</div>
        <div className="stat-label">Active Items</div>
      </div>
      <div className="stat-card removed">
        <div className="stat-number">{stats?.removed_items || 0}</div>
        <div className="stat-label">Removed Items</div>
      </div>
      <div className="stat-card total">
        <div className="stat-number">{stats?.total_appraisals || 0}</div>
        <div className="stat-label">Total Appraisals</div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="reports-section">
      <div className="section-header">
        <h2>Reports Management</h2>
        <select onChange={(e) => fetchReports(e.target.value)} className="status-filter">
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="action_taken">Action Taken</option>
          <option value="dismissed">Dismissed</option>
          <option value="">All</option>
        </select>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">No reports found</div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report.report_id} className={`report-card ${report.status}`}>
              <div className="report-header">
                <span className={`badge badge-${report.status}`}>{report.status}</span>
                <span className="report-type">{report.report_type}</span>
                <span className="report-date">
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="report-body">
                <div className="report-info">
                  <strong>Reporter:</strong> {report.reporter_name} ({report.reporter_email})
                </div>
                {report.item_title && (
                  <div className="report-info">
                    <strong>Item:</strong> {report.item_title}
                  </div>
                )}
                <div className="report-info">
                  <strong>Reason:</strong> {report.reason}
                </div>
                {report.admin_notes && (
                  <div className="report-info">
                    <strong>Admin Notes:</strong> {report.admin_notes}
                  </div>
                )}
                {report.reviewed_by_name && (
                  <div className="report-info">
                    <strong>Reviewed By:</strong> {report.reviewed_by_name}
                  </div>
                )}
              </div>

              {report.status === 'pending' && (
                <div className="report-actions">
                  {selectedReport === report.report_id ? (
                    <div className="review-form">
                      <select
                        value={reviewForm.status}
                        onChange={(e) => setReviewForm({...reviewForm, status: e.target.value})}
                      >
                        <option value="reviewed">Reviewed</option>
                        <option value="action_taken">Action Taken</option>
                        <option value="dismissed">Dismissed</option>
                      </select>

                      <select
                        value={reviewForm.action}
                        onChange={(e) => setReviewForm({...reviewForm, action: e.target.value})}
                      >
                        <option value="">No Action</option>
                        <option value="remove_item">Remove Item</option>
                        <option value="remove_appraisal">Remove Appraisal</option>
                      </select>

                      <textarea
                        placeholder="Admin notes..."
                        value={reviewForm.admin_notes}
                        onChange={(e) => setReviewForm({...reviewForm, admin_notes: e.target.value})}
                        rows="3"
                      />

                      <div className="form-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleReviewReport(report.report_id)}
                        >
                          Submit Review
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedReport(null);
                            setReviewForm({ status: 'reviewed', admin_notes: '', action: '' });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => setSelectedReport(report.report_id)}
                    >
                      Review Report
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderItems = () => (
    <div className="items-section">
      <div className="section-header">
        <h2>Items Management</h2>
        <select onChange={(e) => fetchItems(e.target.value)} className="status-filter">
          <option value="">All Items</option>
          <option value="active">Active</option>
          <option value="reported">Reported</option>
          <option value="removed">Removed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">No items found</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Appraisals</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.appraisal_item_id}>
                  <td>{item.appraisal_item_id}</td>
                  <td>{item.title}</td>
                  <td>
                    {item.owner_name}
                    <br />
                    <small>{item.owner_email}</small>
                  </td>
                  <td>
                    <span className={`badge badge-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.appraisal_count || 0}</td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateItemStatus(item.appraisal_item_id, e.target.value)}
                      className="status-select"
                    >
                      <option value="active">Active</option>
                      <option value="reported">Reported</option>
                      <option value="removed">Removed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Content Moderation</h1>
          <p>Manage reports and monitor content</p>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
          <button
            className={`tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items
          </button>
        </div>

        <div className="tab-content">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <>
              {activeTab === 'stats' && renderStats()}
              {activeTab === 'reports' && renderReports()}
              {activeTab === 'items' && renderItems()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Moderation;
