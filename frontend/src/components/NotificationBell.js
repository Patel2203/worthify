import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import './NotificationBell.css';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('/api/appraisals/notifications/unread/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setUnreadCount(response.data.unread_count || 0);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <div className="notification-bell" onClick={handleClick}>
      <span className="bell-icon">🔔</span>
      {unreadCount > 0 && (
        <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </div>
  );
};

export default NotificationBell;
