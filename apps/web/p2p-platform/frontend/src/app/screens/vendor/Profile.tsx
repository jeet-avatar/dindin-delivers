import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Button, List, Switch, Tag, Spin, message, Modal } from 'antd';
import {
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  EditOutlined,
  LoadingOutlined,
  CarOutlined,
  ShoppingCartOutlined,
  RightOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getVendor, updateVendor, deleteVendor, getCurrentVendorId, Vendor } from '../../api/api';

const { Title, Text } = Typography;

/**
 * Vendor Profile Screen - Aligned with iOS RestaurantSettingsView.swift
 *
 * Features matched from iOS:
 * - Restaurant profile header with logo, name, cuisine type, address
 * - Online/Offline status toggle
 * - Verified Partner badge
 * - Contact information (phone, email)
 * - Quick Actions (Accept Orders, Delivery Orders, Pickup Orders toggles)
 * - Operating Hours section
 * - Business Documents link
 * - Payment & Payouts section
 * - Support Section
 * - Logout Button
 * - Delete Account Button (Apple App Store Guideline 5.1.1)
 */

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState<Vendor | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    setLoading(true);
    try {
      const vendorId = getCurrentVendorId();
      if (vendorId) {
        const data = await getVendor(vendorId);
        setVendorData(data);
        setDeliveryEnabled(data.delivery_enabled ?? true);
        setAcceptingOrders(data.onboarding_status === 'approved');
        setIsOnline(data.onboarding_status === 'approved');
        setPickupEnabled(true);
      }
    } catch (error) {
      console.error('Failed to fetch vendor profile:', error);
      message.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVendor = async (updates: Partial<Vendor>) => {
    const vendorId = getCurrentVendorId();
    if (!vendorId) return;

    try {
      await updateVendor(vendorId, updates);
      message.success('Settings updated successfully');
      fetchVendorProfile();
    } catch (error) {
      console.error('Failed to update vendor:', error);
      message.error('Failed to update settings');
    }
  };

  const handleToggleDelivery = (checked: boolean) => {
    setDeliveryEnabled(checked);
    handleUpdateVendor({ delivery_enabled: checked });
  };

  const handleLogout = () => {
    localStorage.removeItem('id_token');
    localStorage.removeItem('user');
    navigate('/vendor/login');
  };

  const handleDeleteAccount = async () => {
    const vendorId = getCurrentVendorId();
    if (!vendorId) {
      message.error('Unable to identify account');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteVendor(vendorId);
      message.success('Account deleted successfully');
      localStorage.removeItem('id_token');
      localStorage.removeItem('user');
      navigate('/vendor/login');
    } catch (error) {
      console.error('Failed to delete account:', error);
      message.error('Failed to delete account. Please contact support.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const menuItems = [
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: 'Business Documents',
      description: 'License, Tax ID, Health Permit',
      badge: !vendorData?.food_license || !vendorData?.health_permit || !vendorData?.w9_form ? 'Required' : null,
      onClick: () => navigate('/vendor/documents'),
    },
    {
      key: 'payment',
      icon: <DollarOutlined />,
      label: 'Payment & Payouts',
      description: 'Bank account, payout schedule',
      onClick: () => navigate('/vendor/payouts'),
    },
    {
      key: 'operating-hours',
      icon: <ClockCircleOutlined />,
      label: 'Operating Hours',
      description: 'Mon-Sat: 10am-10pm',
      onClick: () => console.log('Operating hours'),
    },
  ];

  const supportItems = [
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help Center',
      description: 'FAQs and support articles',
    },
    {
      key: 'contact',
      icon: <PhoneOutlined />,
      label: 'Contact Support',
      description: '1-800-DOLLOR-AI',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  const isVerified = vendorData?.onboarding_status === 'approved';
  const fullAddress = [vendorData?.address, vendorData?.city, vendorData?.state, vendorData?.zip_code]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="profile-screen">
      {/* Profile Header */}
      <Card className="profile-header-card">
        <div className="profile-header">
          <Avatar
            size={100}
            icon={<ShopOutlined />}
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
          />
          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Title level={3} style={{ margin: 0 }}>{vendorData?.restaurant_name || vendorData?.company_name || 'Restaurant'}</Title>
              {isVerified && (
                <Tag color="green" style={{ margin: 0 }}>
                  <CheckCircleOutlined /> Verified Partner
                </Tag>
              )}
            </div>
            {vendorData?.cuisine_type && (
              <Tag color="orange" style={{ marginBottom: 4 }}>
                {vendorData.cuisine_type}
              </Tag>
            )}
            {fullAddress && (
              <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <EnvironmentOutlined /> {fullAddress}
              </Text>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isOnline ? '#10B981' : '#EF4444',
                }}
              />
              <Text style={{ color: isOnline ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </div>
          </div>
          <Button icon={<EditOutlined />} className="edit-btn" onClick={() => navigate('/vendor/edit-profile')}>
            Edit
          </Button>
        </div>

        {/* Contact Info */}
        <div className="contact-info">
          {vendorData?.contact_phone && (
            <div className="contact-item">
              <PhoneOutlined style={{ color: '#F59E0B' }} />
              <Text>{vendorData.contact_phone}</Text>
            </div>
          )}
          {vendorData?.contact_email && (
            <div className="contact-item">
              <MailOutlined style={{ color: '#F59E0B' }} />
              <Text>{vendorData.contact_email}</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="quick-actions-card">
        <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
          Quick Actions
        </Text>
        <List
          dataSource={[
            {
              key: 'accept-orders',
              icon: <CheckCircleOutlined style={{ color: acceptingOrders ? '#10B981' : '#EF4444' }} />,
              label: 'Accept Orders',
              description: acceptingOrders
                ? 'Your restaurant is visible to customers'
                : 'Customers cannot place orders',
              toggle: true,
              checked: acceptingOrders,
              onChange: setAcceptingOrders,
            },
            {
              key: 'delivery',
              icon: <CarOutlined style={{ color: '#3B82F6' }} />,
              label: 'Delivery Orders',
              description: 'Allow customers to order for delivery',
              toggle: true,
              checked: deliveryEnabled,
              onChange: handleToggleDelivery,
            },
            {
              key: 'pickup',
              icon: <ShoppingCartOutlined style={{ color: '#8B5CF6' }} />,
              label: 'Pickup Orders',
              description: 'Allow customers to pick up orders',
              toggle: true,
              checked: pickupEnabled,
              onChange: setPickupEnabled,
            },
          ]}
          renderItem={(item) => (
            <List.Item className="action-item">
              <div className="action-item-content">
                <div className="action-icon">{item.icon}</div>
                <div className="action-text">
                  <Text strong>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.description}
                  </Text>
                </div>
                <div className="action-control">
                  {item.toggle && (
                    <Switch
                      checked={item.checked}
                      onChange={item.onChange}
                      style={{ background: item.checked ? '#10B981' : undefined }}
                    />
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Profile Menu */}
      <Card className="menu-card">
        <List
          dataSource={menuItems}
          renderItem={(item) => (
            <List.Item className="menu-item" onClick={item.onClick}>
              <div className="menu-item-content">
                <div className="menu-icon" style={{ color: '#F59E0B' }}>
                  {item.icon}
                </div>
                <div className="menu-text">
                  <Text strong>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.description}
                  </Text>
                </div>
                <div className="menu-action">
                  {item.badge && (
                    <Tag color="orange" style={{ marginRight: 8 }}>
                      {item.badge}
                    </Tag>
                  )}
                  <RightOutlined style={{ color: '#ccc' }} />
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Support */}
      <Card className="menu-card">
        <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
          Support
        </Text>
        <List
          dataSource={supportItems}
          renderItem={(item) => (
            <List.Item className="menu-item" onClick={() => console.log(item.key)}>
              <div className="menu-item-content">
                <div className="menu-icon" style={{ color: '#6366F1' }}>
                  {item.icon}
                </div>
                <div className="menu-text">
                  <Text strong>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.description}
                  </Text>
                </div>
                <div className="menu-action">
                  <RightOutlined style={{ color: '#ccc' }} />
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Logout Button */}
      <Button
        danger
        icon={<LogoutOutlined />}
        size="large"
        block
        onClick={() => setShowLogoutConfirm(true)}
        className="logout-btn"
      >
        Log Out
      </Button>

      {/* Delete Account Button - Apple App Store Guideline 5.1.1 */}
      <Button
        danger
        icon={<DeleteOutlined />}
        size="large"
        block
        onClick={() => setShowDeleteConfirm(true)}
        className="delete-btn"
        loading={isDeleting}
      >
        Delete Account
      </Button>

      {/* Footer */}
      <div className="footer">
        <Text type="secondary" style={{ fontSize: 12 }}>
          Member since{' '}
          {vendorData?.created_at
            ? new Date(vendorData.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })
            : '--'}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Vendor ID: {vendorData?.id || '--'}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Dollor Vendor App v1.0.0
        </Text>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        title="Log Out?"
        open={showLogoutConfirm}
        onOk={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        okText="Log Out"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to log out of your account?</p>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        title={
          <span>
            <ExclamationCircleOutlined style={{ color: '#EF4444', marginRight: 8 }} />
            Delete Account?
          </span>
        }
        open={showDeleteConfirm}
        onOk={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
        okText="Delete Forever"
        okButtonProps={{ danger: true, loading: isDeleting }}
      >
        <p>
          This will <strong>permanently delete</strong> your restaurant account, including all menu items, order
          history, and earnings data.
        </p>
        <p style={{ marginTop: 16 }}>
          <strong>This action cannot be undone.</strong>
        </p>
        <p style={{ marginTop: 16, color: '#EF4444' }}>Are you absolutely sure?</p>
      </Modal>

      <style>{`
        .profile-screen {
          padding: 0;
          max-width: 800px;
          margin: 0 auto;
        }
        .profile-header-card {
          border-radius: 20px;
          margin-bottom: 20px;
        }
        .profile-header {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 20px;
        }
        .profile-info {
          flex: 1;
        }
        .edit-btn {
          border-radius: 10px;
        }
        .contact-info {
          border-top: 1px solid #f0f0f0;
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .quick-actions-card {
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .action-item {
          padding: 16px 0 !important;
          border-bottom: 1px solid #f0f0f0;
        }
        .action-item:last-child {
          border-bottom: none;
        }
        .action-item-content {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .action-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .action-control {
          display: flex;
          align-items: center;
        }
        .menu-card {
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .menu-item {
          cursor: pointer;
          padding: 16px 0 !important;
          transition: background 0.2s;
        }
        .menu-item:hover {
          background: #f8fafc;
        }
        .menu-item-content {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .menu-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
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
        .logout-btn {
          height: 50px;
          border-radius: 12px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .delete-btn {
          height: 50px;
          border-radius: 12px;
          font-weight: 600;
          margin-bottom: 24px;
          background: transparent;
          border-color: #EF4444;
          color: #EF4444;
        }
        .delete-btn:hover {
          background: #FEE2E2 !important;
          border-color: #EF4444 !important;
          color: #EF4444 !important;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        @media (max-width: 576px) {
          .profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .profile-info {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
