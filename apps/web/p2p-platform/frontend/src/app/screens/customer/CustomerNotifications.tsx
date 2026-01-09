import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Empty, Spin, message } from 'antd';
import {
  ArrowLeftOutlined,
  BellOutlined,
  ShoppingOutlined,
  TagOutlined,
  GiftOutlined,
  CarOutlined,
  LoadingOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text } = Typography;

/**
 * CustomerNotifications - View notifications
 * Matches iOS NotificationView.swift for platform parity
 */

type NotificationType = 'order' | 'promotion' | 'system' | 'delivery';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  is_read: boolean;
}

// Notification type styling
const notificationTypeConfig: Record<NotificationType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  order: {
    icon: <ShoppingOutlined />,
    color: '#1890ff',
    bgColor: 'rgba(24, 144, 255, 0.1)'
  },
  promotion: {
    icon: <TagOutlined />,
    color: DollorTheme.Brand.orange,
    bgColor: 'rgba(242, 153, 74, 0.1)'
  },
  system: {
    icon: <BellOutlined />,
    color: '#8c8c8c',
    bgColor: 'rgba(140, 140, 140, 0.1)'
  },
  delivery: {
    icon: <CarOutlined />,
    color: DollorTheme.Brand.green,
    bgColor: 'rgba(6, 193, 103, 0.1)'
  }
};

// Time ago formatting
const formatTimeAgo = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const CustomerNotifications: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [clearing, setClearing] = useState(false);

  const customerId = localStorage.getItem('customer_id');

  useEffect(() => {
    if (customerId) {
      fetchNotifications();
    } else {
      message.error('Please log in to view notifications');
      navigate('/customer/login');
    }
  }, [customerId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('customer_token');
      const response = await axios.get(`${API_URL}/api/customer/notifications/${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNotifications(response.data?.notifications || []);
    } catch (error) {
      // Graceful degradation - show empty state on error
      console.log('Notifications API not available, showing empty state');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: NotificationItem) => {
    try {
      const token = localStorage.getItem('customer_token');
      await axios.post(
        `${API_URL}/api/customer/notifications/${customerId}/${notification.id}/read`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      ).catch(() => {});

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      // Silently fail - just update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const token = localStorage.getItem('customer_token');
      await axios.delete(`${API_URL}/api/customer/notifications/${customerId}/clear`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(() => {});

      setNotifications([]);
      message.success('All notifications cleared');
    } catch (error) {
      setNotifications([]);
      message.success('Notifications cleared');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary" style={{ marginTop: 16 }}>Loading notifications...</Text>
      </div>
    );
  }

  return (
    <div className="notifications-screen">
      {/* Header */}
      <div className="screen-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-btn"
        />
        <Title level={4} style={{ margin: 0 }}>Notifications</Title>
        {notifications.length > 0 ? (
          <Button
            type="text"
            onClick={handleClearAll}
            loading={clearing}
            style={{ color: DollorTheme.Brand.green }}
          >
            Clear All
          </Button>
        ) : (
          <div style={{ width: 70 }} />
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <BellOutlined />
          </div>
          <Text strong className="empty-title">No Notifications</Text>
          <Text type="secondary" className="empty-message">
            You don't have any notifications yet.
            {'\n'}We'll notify you about orders and promotions.
          </Text>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => {
            const typeConfig = notificationTypeConfig[notification.type] || notificationTypeConfig.system;
            return (
              <div
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleMarkAsRead(notification)}
              >
                {/* Icon */}
                <div
                  className="notification-icon"
                  style={{
                    backgroundColor: typeConfig.bgColor,
                    color: typeConfig.color
                  }}
                >
                  {typeConfig.icon}
                </div>

                {/* Content */}
                <div className="notification-content">
                  <div className="notification-header">
                    <Text
                      strong={!notification.is_read}
                      className="notification-title"
                    >
                      {notification.title}
                    </Text>
                    {!notification.is_read && <span className="unread-dot" />}
                  </div>
                  <Text type="secondary" className="notification-message">
                    {notification.message}
                  </Text>
                  <Text className="notification-time">
                    {formatTimeAgo(notification.timestamp)}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .notifications-screen {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 16px 24px 16px;
          background: ${DollorTheme.Background.primary};
          min-height: 100vh;
        }

        .screen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          position: sticky;
          top: 0;
          background: ${DollorTheme.Background.primary};
          z-index: 10;
        }

        .back-btn {
          font-size: 18px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${DollorTheme.Background.secondary};
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .empty-icon .anticon {
          font-size: 36px;
          color: ${DollorTheme.Text.tertiary};
        }

        .empty-title {
          font-size: 18px;
          display: block;
          margin-bottom: 8px;
        }

        .empty-message {
          font-size: 14px;
          white-space: pre-line;
          line-height: 1.6;
        }

        /* Notifications List */
        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-card {
          display: flex;
          gap: 14px;
          padding: 16px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .notification-card.unread {
          background: rgba(6, 193, 103, 0.03);
          border: 1px solid rgba(6, 193, 103, 0.1);
        }

        .notification-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notification-icon .anticon {
          font-size: 18px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .notification-title {
          font-size: 15px;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${DollorTheme.Brand.green};
          flex-shrink: 0;
        }

        .notification-message {
          display: block;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notification-time {
          font-size: 12px;
          color: ${DollorTheme.Text.tertiary};
        }

        @media (max-width: 576px) {
          .screen-header {
            padding: 12px 0;
          }

          .notification-card {
            padding: 14px;
          }

          .notification-icon {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerNotifications;
