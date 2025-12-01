import React, { useState, useEffect } from 'react';
import axios from '../api/axios';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');

    try {
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      setSuccess('User role updated successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axios.delete(`/api/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1>Admin Panel</h1>
          <p>User Management Dashboard</p>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="card">
          <h2>All Users ({users.length})</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.user_id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge badge-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteUser(user.user_id)}
                          style={{ marginLeft: '10px' }}
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
        </div>

        <div className="grid">
          <div className="card">
            <h3>Role Distribution</h3>
            <div style={{ marginTop: '20px' }}>
              {['admin', 'user', 'guest'].map(role => {
                const count = users.filter(u => u.role === role).length;
                const percentage = users.length > 0 ? (count / users.length * 100).toFixed(1) : 0;
                return (
                  <div key={role} style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span className={`badge badge-${role}`}>{role}</span>
                      <span>{count} ({percentage}%)</span>
                    </div>
                    <div style={{ background: '#e0e0e0', borderRadius: '10px', height: '8px' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          background: role === 'admin' ? '#dc3545' : role === 'user' ? '#28a745' : '#6c757d',
                          height: '100%',
                          borderRadius: '10px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3>Quick Stats</h3>
            <div style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '15px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                <strong>Total Users:</strong> {users.length}
              </div>
              <div style={{ marginBottom: '15px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                <strong>Active Today:</strong> {users.filter(u => {
                  if (!u.last_login) return false;
                  const today = new Date().toDateString();
                  return new Date(u.last_login).toDateString() === today;
                }).length}
              </div>
              <div style={{ marginBottom: '15px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                <strong>New This Month:</strong> {users.filter(u => {
                  const created = new Date(u.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() &&
                         created.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
