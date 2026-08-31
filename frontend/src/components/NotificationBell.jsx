import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);
  const lastSeenIdRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/admin/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);

      // Show a toast if there's a brand-new notification since last check
      const latest = response.data.notifications[0];
      if (latest && lastSeenIdRef.current && latest._id !== lastSeenIdRef.current) {
        setToast(latest);
        setTimeout(() => setToast(null), 8000);
      }
      if (latest) {
        lastSeenIdRef.current = latest._id;
      }
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/admin/notifications/read-all');
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  };

  return (
    <>
      <div className="notification-bell-wrap" ref={dropdownRef}>
        <button className="notification-bell" onClick={toggleOpen} aria-label="Notifications">
          🔔
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>

        {open && (
          <div className="notification-dropdown">
            <div className="notification-dropdown-header">Notifications</div>
            {notifications.length === 0 ? (
              <p className="empty-note" style={{ padding: '1rem' }}>No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className="notification-item">
                  <p>{n.message}</p>
                  <span>{timeAgo(n.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="notification-toast" onClick={() => setToast(null)}>
          <strong>🔔 New update</strong>
          <p>{toast.message}</p>
        </div>
      )}
    </>
  );
}