import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Row, Col, Button, List, Switch, Tag, Spin, message } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  FileTextOutlined,
  BankOutlined,
  StarOutlined,
  SettingOutlined,
  RightOutlined,
  EditOutlined,
  SafetyOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getDriverProfile, getCurrentDriverId, DriverProfile as DriverProfileType } from '../../api/api';

const { Title, Text } = Typography;

/**
 * Profile Screen - Aligned with iOS DriverProfileView.swift
 *
 * Features matched from iOS:
 * - Driver info header with avatar
 * - Stats summary (Rating, Deliveries, Earnings)
 * - Menu items for profile sections
 * - Documents status
 * - Vehicle info
 * - Bank/Payout settings
 * - App settings
 */

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [driverData, setDriverData] = useState<DriverProfileType | null>(null);

  useEffect(() => {
    fetchDriverProfile();
  }, []);

  const fetchDriverProfile = async () => {
    setLoading(true);
    try {
      const driverId = getCurrentDriverId();
      if (driverId) {
        const data = await getDriverProfile(driverId);
        setDriverData(data);
      }
    } catch (error) {
      console.error('Failed to fetch driver profile:', error);
      message.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'personal',
      icon: <UserOutlined />,
      label: 'Personal Information',
      description: 'Name, email, phone number',
    },
    {
      key: 'vehicle',
      icon: <CarOutlined />,
      label: 'Vehicle Information',
      description: driverData ? `${driverData.vehicle_make || ''} ${driverData.vehicle_model || ''}`.trim() || 'Not set' : 'Not set',
    },
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: 'Documents',
      description: 'License, insurance, registration',
      badge: driverData && !driverData.drivers_license ? 1 : 0,
    },
    {
      key: 'bank',
      icon: <BankOutlined />,
      label: 'Bank & Payouts',
      description: 'Payment methods and history',
    },
    {
      key: 'ratings',
      icon: <StarOutlined />,
      label: 'Ratings & Reviews',
      description: `${driverData?.rating?.toFixed(1) || '5.0'} average rating`,
    },
  ];

  const settingsItems = [
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Push Notifications',
      type: 'switch',
    },
    {
      key: 'safety',
      icon: <SafetyOutlined />,
      label: 'Safety Features',
      description: 'Emergency contacts, share trip',
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Support',
      description: 'FAQs, contact support',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'App Settings',
      description: 'Language, appearance',
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    navigate('/driver/login');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  const fullName = driverData ? `${driverData.first_name} ${driverData.last_name}` : 'Driver';

  return (
    <div className="profile-screen">
      {/* Profile Header */}
      <Card className="profile-header-card">
        <div className="profile-header">
          <Avatar
            size={100}
            src={driverData?.photo_url}
            icon={<UserOutlined />}
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          />
          <div className="profile-info">
            <Title level={3} style={{ margin: 0 }}>{fullName}</Title>
            <Text type="secondary">{driverData?.email}</Text>
            <Tag color="green" style={{ marginTop: 8 }}>
              <CheckCircleOutlined /> {driverData?.status === 'approved' ? 'Verified Driver' : 'Pending Verification'}
            </Tag>
          </div>
          <Button icon={<EditOutlined />} className="edit-btn">Edit</Button>
        </div>

        {/* Stats */}
        <Row gutter={16} className="stats-row">
          <Col span={8}>
            <div className="stat-item">
              <Text strong style={{ fontSize: 24, color: '#F59E0B' }}>
                <StarOutlined /> {driverData?.rating?.toFixed(1) || '5.0'}
              </Text>
              <Text type="secondary">Rating</Text>
            </div>
          </Col>
          <Col span={8}>
            <div className="stat-item">
              <Text strong style={{ fontSize: 24, color: '#6366F1' }}>
                {driverData?.total_deliveries || 0}
              </Text>
              <Text type="secondary">Deliveries</Text>
            </div>
          </Col>
          <Col span={8}>
            <div className="stat-item">
              <Text strong style={{ fontSize: 24, color: '#10B981' }}>
                --
              </Text>
              <Text type="secondary">Earned</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Documents Status */}
      <Card className="documents-card">
        <div className="section-header">
          <Text strong style={{ fontSize: 16 }}>
            <FileTextOutlined /> Documents Status
          </Text>
          <Button type="link" size="small" onClick={() => navigate('/driver/documents')}>View All</Button>
        </div>
        <div className="documents-grid">
          <div className={`doc-item ${driverData?.drivers_license ? 'verified' : 'pending'}`}>
            <CheckCircleOutlined />
            <Text>Driver's License</Text>
            <Tag color={driverData?.drivers_license ? 'green' : 'orange'} size="small">
              {driverData?.drivers_license ? 'verified' : 'pending'}
            </Tag>
          </div>
          <div className={`doc-item ${driverData?.insurance ? 'verified' : 'pending'}`}>
            <CheckCircleOutlined />
            <Text>Insurance</Text>
            <Tag color={driverData?.insurance ? 'green' : 'orange'} size="small">
              {driverData?.insurance ? 'verified' : 'pending'}
            </Tag>
          </div>
          <div className={`doc-item ${driverData?.background_check ? 'verified' : 'pending'}`}>
            <CheckCircleOutlined />
            <Text>Background Check</Text>
            <Tag color={driverData?.background_check ? 'green' : 'orange'} size="small">
              {driverData?.background_check ? 'verified' : 'pending'}
            </Tag>
          </div>
        </div>
      </Card>

      {/* Profile Menu */}
      <Card className="menu-card">
        <List
          dataSource={menuItems}
          renderItem={(item) => (
            <List.Item className="menu-item" onClick={() => {
              if (item.key === 'documents') {
                navigate('/driver/documents');
              } else {
                console.log(item.key);
              }
            }}>
              <div className="menu-item-content">
                <div className="menu-icon" style={{ color: '#10B981' }}>
                  {item.icon}
                </div>
                <div className="menu-text">
                  <Text strong>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                </div>
                <div className="menu-action">
                  {item.badge ? (
                    <Tag color="orange" style={{ marginRight: 8 }}>{item.badge}</Tag>
                  ) : null}
                  <RightOutlined style={{ color: '#ccc' }} />
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      {/* Settings */}
      <Card className="menu-card">
        <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
          Settings
        </Text>
        <List
          dataSource={settingsItems}
          renderItem={(item) => (
            <List.Item className="menu-item" onClick={() => item.type !== 'switch' && console.log(item.key)}>
              <div className="menu-item-content">
                <div className="menu-icon" style={{ color: '#6366F1' }}>
                  {item.icon}
                </div>
                <div className="menu-text">
                  <Text strong>{item.label}</Text>
                  {item.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                  )}
                </div>
                <div className="menu-action">
                  {item.type === 'switch' ? (
                    <Switch
                      checked={notificationsEnabled}
                      onChange={setNotificationsEnabled}
                      style={{ background: notificationsEnabled ? '#10B981' : undefined }}
                    />
                  ) : (
                    <RightOutlined style={{ color: '#ccc' }} />
                  )}
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
        onClick={handleLogout}
        className="logout-btn"
      >
        Log Out
      </Button>

      {/* Footer */}
      <div className="footer">
        <Text type="secondary" style={{ fontSize: 12 }}>
          Member since {driverData?.created_at ? new Date(driverData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '--'}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Dollor Driver App v1.0.0
        </Text>
      </div>

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
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }
        .profile-info {
          flex: 1;
        }
        .edit-btn {
          border-radius: 10px;
        }
        .stats-row {
          border-top: 1px solid #f0f0f0;
          padding-top: 20px;
        }
        .stat-item {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .documents-card {
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .documents-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .doc-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          background: #f8fafc;
        }
        .doc-item.verified .anticon {
          color: #10B981;
        }
        .doc-item.pending .anticon {
          color: #F59E0B;
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
          background: rgba(16, 185, 129, 0.1);
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
          margin-bottom: 24px;
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
            text-align: center;
          }
          .profile-info {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;
