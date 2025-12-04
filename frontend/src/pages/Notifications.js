import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = filter === 'unread'
        ? '/api/appraisals/notifications?unread_only=true'
        : '/api/appraisals/notifications';

      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setNotifications(response.data.notifications || []);
      setError('');
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/appraisals/notifications/${notificationId}/read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.notification_id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        '/api/appraisals/notifications/read-all',
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `/api/appraisals/notifications/${notificationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Remove from local state
      setNotifications(prev =>
        prev.filter(notif => notif.notification_id !== notificationId)
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }

    // Navigate to the related item/appraisal
    if (notification.appraisal_item_id) {
      navigate(`/appraisals/${notification.appraisal_item_id}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_appraisal':
        return '💎';
      case 'item_reported':
        return '⚠️';
      case 'item_removed':
        return '🚫';
      default:
        return '🔔';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="loading">Loading notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container notifications-container">
        <div className="page-header">
          <h1>Notifications</h1>
          <p>Stay updated with appraisals and activity on your items</p>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Header Actions */}
        <div className="notifications-header">
          <div className="notification-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={markAllAsRead}>
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
              >
                <div
                  className="notification-content"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.notification_type)}
                  </div>

                  <div className="notification-body">
                    <div className="notification-message">
                      {notification.message}
                    </div>

                    {notification.item_title && (
                      <div className="notification-item-title">
                        Item: <strong>{notification.item_title}</strong>
                      </div>
                    )}

                    <div className="notification-meta">
                      <span className="notification-time">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                      <span className={`notification-type ${notification.notification_type}`}>
                        {notification.notification_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {notification.item_image && (
                    <div className="notification-thumbnail">
                      <img
                        src={notification.item_image}
                        alt={notification.item_title}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/80?text=No+Image';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="notification-actions">
                  {!notification.is_read && (
                    <button
                      className="btn-icon"
                      onClick={() => markAsRead(notification.notification_id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="btn-icon delete"
                    onClick={() => deleteNotification(notification.notification_id)}
                    title="Delete notification"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
