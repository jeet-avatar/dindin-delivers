import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, List, Button, Switch, Tag, Spin, message, Modal } from 'antd';
import {
  UserOutlined,
  HeartOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  BellOutlined,
  GiftOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  RightOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DollorTheme } from '../../theme';
import { getApiUrl } from '../../api/api';

const { Title, Text } = Typography;

/**
 * Customer Profile Screen - Aligned with iOS ProfileView.swift
 *
 * Features matched from iOS:
 * - Profile header with avatar and user info
 * - Account section (Addresses, Payment, Favorites)
 * - App Settings section (Settings, Notifications, Refer & Earn, Help)
 * - Logout button
 * - Delete Account with confirmation (Apple App Store Guideline 5.1.1)
 */

interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at?: string;
}

const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Account deletion states (Apple App Store Guideline 5.1.1)
  const [showDeleteAccountAlert, setShowDeleteAccountAlert] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    fetchCustomerProfile();
  }, []);

  const fetchCustomerProfile = async () => {
    setLoading(true);
    try {
      // Get customer data from localStorage
      const customerUserStr = localStorage.getItem('customer_user');
      const customerName = localStorage.getItem('customer_name');
      const customerEmail = localStorage.getItem('customer_email');

      if (customerUserStr) {
        const user = JSON.parse(customerUserStr);
        setCustomerData({
          id: user.id || 0,
          name: user.name || customerName || 'User',
          email: user.email || customerEmail || 'No Email',
          phone: user.phone,
          created_at: user.created_at
        });
      } else {
        // Fallback to individual localStorage items
        setCustomerData({
          id: parseInt(localStorage.getItem('p2p_customer_id') || '0'),
          name: customerName || 'User',
          email: customerEmail || 'No Email'
        });
      }
    } catch (error) {
      console.error('Failed to fetch customer profile:', error);
      message.error('Failed to load profile');

      // Set minimal fallback data
      setCustomerData({
        id: 0,
        name: localStorage.getItem('customer_name') || 'User',
        email: localStorage.getItem('customer_email') || 'No Email'
      });
    } finally {
      setLoading(false);
    }
  };

  const accountItems = [
    {
      key: 'addresses',
      icon: <EnvironmentOutlined />,
      label: 'Manage Addresses',
      description: 'Saved delivery locations',
      onClick: () => navigate('/customer/addresses'),
    },
    {
      key: 'payment',
      icon: <CreditCardOutlined />,
      label: 'Payment Methods',
      description: 'Cards and payment options',
      onClick: () => navigate('/customer/payment-methods'),
    },
    {
      key: 'favorites',
      icon: <HeartOutlined />,
      label: 'Favorites',
      description: 'Your favorite restaurants',
      onClick: () => navigate('/customer/favorites'),
    },
  ];

  const settingsItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      description: 'App preferences',
      onClick: () => navigate('/customer/settings'),
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
      description: 'Manage alerts',
      onClick: () => navigate('/customer/notifications'),
    },
    {
      key: 'refer',
      icon: <GiftOutlined />,
      label: 'Refer & Earn',
      description: 'Invite friends, get rewards',
      onClick: () => navigate('/customer/refer'),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
      description: 'FAQs and contact support',
      onClick: () => navigate('/customer/help'),
    },
  ];

  const handleLogout = () => {
    // Clear all customer-related localStorage items
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    localStorage.removeItem('customer_name');
    localStorage.removeItem('customer_email');
    localStorage.removeItem('p2p_customer_id');
    localStorage.removeItem('p2p_customer_name');
    localStorage.removeItem('p2p_customer_email');
    localStorage.removeItem('p2p_customer_access_token');
    localStorage.removeItem('p2p_access_token');
    localStorage.removeItem('access_token');

    message.success('Logged out successfully');
    navigate('/customer/login');
  };

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);

    try {
      const customerId = customerData?.id || parseInt(localStorage.getItem('p2p_customer_id') || '0');

      if (!customerId || customerId === 0) {
        message.error('Unable to identify account. Please try logging out and back in.');
        setIsDeletingAccount(false);
        return;
      }

      const token = localStorage.getItem('customer_token') || localStorage.getItem('access_token');

      // Call delete account API
      const response = await fetch(`${API_URL}/api/customers/${customerId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear all local data
      clearAllLocalData();

      message.success('Account deleted successfully');
      navigate('/customer/login');

    } catch (error) {
      console.error('Failed to delete account:', error);
      message.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirmation(false);
      setShowDeleteAccountAlert(false);
    }
  };

  const clearAllLocalData = () => {
    // Clear UserDefaults equivalent
    const customerKeys = [
      'p2p_customer_id',
      'p2p_customer_name',
      'p2p_customer_email',
      'p2p_customer_access_token',
      'p2p_access_token',
      'customer_token',
      'customer_user',
      'customer_name',
      'customer_email',
      'access_token',
      'saved_addresses',
      'favorites',
      'cart_items'
    ];

    customerKeys.forEach(key => localStorage.removeItem(key));
  };

  const handleEditProfile = () => {
    // Navigate to edit profile or show edit modal
    message.info('Edit profile feature coming soon');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  const userName = customerData?.name || 'User';
  const userEmail = customerData?.email || 'No Email';
  const userInitial = userName.charAt(0).toUpperCase();
  const memberSince = customerData?.created_at
    ? new Date(customerData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '--';

  return (
    <div className="customer-profile-screen">
      {/* Profile Header */}
      <Card className="profile-header-card">
        <div className="profile-header">
          <div className="avatar-container">
            <Avatar
              size={100}
              style={{
                background: `linear-gradient(135deg, ${DollorTheme.Brand.green} 0%, ${DollorTheme.Brand.greenDark} 100%)`,
                fontSize: 40,
                fontWeight: 'bold'
              }}
            >
              {userInitial}
            </Avatar>
            <Button
              icon={<EditOutlined />}
              className="edit-badge"
              onClick={handleEditProfile}
              shape="circle"
              style={{
                background: DollorTheme.Brand.orange,
                border: '2px solid white',
                color: 'white'
              }}
            />
          </div>
          <div className="profile-info">
            <Title level={3} style={{ margin: 0, color: DollorTheme.Text.primary }}>
              {userName}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>{userEmail}</Text>
          </div>
        </div>
      </Card>

      {/* Account Section */}
      <div className="section">
        <Text className="section-header">ACCOUNT</Text>
        <Card className="menu-card">
          <List
            dataSource={accountItems}
            renderItem={(item) => (
              <List.Item className="menu-item" onClick={item.onClick}>
                <div className="menu-item-content">
                  <div className="menu-icon" style={{ color: DollorTheme.Brand.orange }}>
                    {item.icon}
                  </div>
                  <div className="menu-text">
                    <Text strong>{item.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                  </div>
                  <div className="menu-action">
                    <RightOutlined style={{ color: '#ccc' }} />
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* App Settings Section */}
      <div className="section">
        <Text className="section-header">APP SETTINGS</Text>
        <Card className="menu-card">
          <List
            dataSource={settingsItems}
            renderItem={(item) => (
              <List.Item className="menu-item" onClick={item.onClick}>
                <div className="menu-item-content">
                  <div className="menu-icon" style={{ color: DollorTheme.Brand.orange }}>
                    {item.icon}
                  </div>
                  <div className="menu-text">
                    <Text strong>{item.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                  </div>
                  <div className="menu-action">
                    <RightOutlined style={{ color: '#ccc' }} />
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* Logout Button */}
      <Button
        icon={<LogoutOutlined />}
        size="large"
        block
        onClick={handleLogout}
        className="logout-btn"
        style={{
          background: DollorTheme.Text.primary,
          color: 'white',
          fontWeight: 600,
          height: 50,
          borderRadius: 12,
          marginBottom: 16,
          border: 'none'
        }}
      >
        Log Out
      </Button>

      {/* Delete Account Button (Apple App Store Guideline 5.1.1) */}
      <Button
        icon={isDeletingAccount ? <LoadingOutlined /> : <DeleteOutlined />}
        size="large"
        block
        onClick={() => setShowDeleteAccountAlert(true)}
        disabled={isDeletingAccount}
        className="delete-account-btn"
        style={{
          background: 'rgba(244, 67, 54, 0.1)',
          color: DollorTheme.Action.danger,
          fontWeight: 600,
          height: 50,
          borderRadius: 12,
          marginBottom: 24,
          border: 'none'
        }}
      >
        {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
      </Button>

      {/* Footer */}
      <div className="footer">
        <Text type="secondary" style={{ fontSize: 12 }}>
          Member since {memberSince}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Dollor Customer App v1.0.0
        </Text>
      </div>

      {/* Delete Account Alert - First Confirmation */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: DollorTheme.Action.danger }}>
            <ExclamationCircleOutlined />
            <span>Delete Account?</span>
          </div>
        }
        open={showDeleteAccountAlert}
        onCancel={() => setShowDeleteAccountAlert(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDeleteAccountAlert(false)}>
            Cancel
          </Button>,
          <Button
            key="continue"
            type="primary"
            danger
            onClick={() => {
              setShowDeleteAccountAlert(false);
              setShowDeleteConfirmation(true);
            }}
          >
            Continue
          </Button>
        ]}
      >
        <p>
          This will permanently delete your account, including all your order history,
          saved addresses, and payment methods. This action cannot be undone.
        </p>
      </Modal>

      {/* Delete Account Alert - Final Confirmation */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: DollorTheme.Action.danger }}>
            <ExclamationCircleOutlined />
            <span>Final Confirmation</span>
          </div>
        }
        open={showDeleteConfirmation}
        onCancel={() => setShowDeleteConfirmation(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowDeleteConfirmation(false)}>
            Cancel
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            loading={isDeletingAccount}
            onClick={performAccountDeletion}
          >
            Delete Forever
          </Button>
        ]}
      >
        <p>
          Are you absolutely sure? Your account and all associated data will be permanently deleted.
        </p>
      </Modal>

      <style>{`
        .customer-profile-screen {
          padding: 0;
          max-width: 800px;
          margin: 0 auto;
          background: ${DollorTheme.Background.primary};
        }

        .profile-header-card {
          border-radius: 20px;
          margin-bottom: 20px;
          box-shadow: ${DollorTheme.Shadow.card};
        }

        .profile-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px 0;
        }

        .avatar-container {
          position: relative;
        }

        .edit-badge {
          position: absolute;
          bottom: 0;
          right: 0;
        }

        .profile-info {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-header {
          font-size: 11px;
          font-weight: bold;
          color: ${DollorTheme.Text.secondary};
          padding: 0 20px 10px 20px;
          display: block;
        }

        .menu-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
        }

        .menu-card .ant-card-body {
          padding: 0;
        }

        .menu-item {
          cursor: pointer;
          padding: 16px 20px !important;
          transition: background 0.2s;
          border-bottom: 1px solid ${DollorTheme.Border.light};
        }

        .menu-item:last-child {
          border-bottom: none;
        }

        .menu-item:hover {
          background: ${DollorTheme.Background.tertiary};
        }

        .menu-item-content {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .menu-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .menu-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-action {
          display: flex;
          align-items: center;
        }

        .logout-btn:hover {
          opacity: 0.9;
        }

        .delete-account-btn:hover {
          background: rgba(244, 67, 54, 0.15) !important;
        }

        .footer {
          text-align: center;
          padding: 20px 0 40px 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        @media (max-width: 576px) {
          .profile-header {
            padding: 10px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerProfile;
