import React, { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Tag, Badge } from 'antd';
import {
  HomeOutlined,
  CarOutlined,
  HistoryOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  GiftOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const CustomerLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const customerId = localStorage.getItem('customer_id');
    const customerName = localStorage.getItem('customer_name');
    const customerEmail = localStorage.getItem('customer_email');

    if (token && customerId) {
      setUser({
        id: customerId,
        name: customerName || 'Customer',
        email: customerEmail
      });
    } else {
      navigate('/customer/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('customer_name');
    localStorage.removeItem('customer_email');
    navigate('/customer/login');
  };

  const menuItems = [
    {
      key: '/customer/dashboard',
      icon: <HomeOutlined />,
      label: 'Home',
    },
    {
      key: '/customer/ride',
      icon: <CarOutlined />,
      label: 'Book a Ride',
    },
    {
      key: '/customer/history',
      icon: <HistoryOutlined />,
      label: 'Ride History',
    },
    {
      key: '/customer/wallet',
      icon: <DollarOutlined />,
      label: 'Wallet',
    },
    {
      key: '/customer/promotions',
      icon: <GiftOutlined />,
      label: 'Promotions',
    },
    {
      key: '/customer/support',
      icon: <CustomerServiceOutlined />,
      label: 'Support',
    },
    {
      key: '/customer/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        My Profile
      </Menu.Item>
      <Menu.Item key="payment" icon={<DollarOutlined />}>
        Payment Methods
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout className="customer-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="customer-sider"
        width={260}
      >
        <div className="customer-logo">
          <div className="logo-circle">
            <span className="logo-dollar">$</span>
          </div>
          {!collapsed && (
            <div className="logo-text-container">
              <span className="logo-text">$ai</span>
              <span className="logo-subtitle">Ride</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="tagline">
            Only $1 platform fee
          </div>
        )}

        {/* Quick Book Card */}
        {!collapsed && (
          <div className="quick-book">
            <div
              className="quick-book-card"
              onClick={() => navigate('/customer/ride')}
            >
              <CarOutlined className="quick-book-icon" />
              <div className="quick-book-text">
                <span className="quick-book-title">Book a Ride</span>
                <span className="quick-book-desc">Flat $1 fee, drivers keep 100%</span>
              </div>
            </div>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="customer-menu"
        />

        {!collapsed && (
          <div className="sidebar-footer">
            <div className="promo-card">
              <GiftOutlined className="promo-icon" />
              <div className="promo-text">
                <span className="promo-title">Invite Friends</span>
                <span className="promo-desc">Earn $5 per referral</span>
              </div>
            </div>
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="customer-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="trigger-btn"
            />
            <Tag color="green" className="fee-tag">
              <DollarOutlined /> Only $1 Platform Fee
            </Tag>
          </div>
          <div className="header-right">
            <Badge count={2} size="small">
              <Button type="text" icon={<BellOutlined />} className="notification-btn" />
            </Badge>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div className="user-info">
                <Avatar
                  icon={<UserOutlined />}
                  className="user-avatar"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                />
                <div className="user-details">
                  <span className="user-name">{user?.name || 'Customer'}</span>
                  <span className="user-role">Rider</span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="customer-content">
          <Outlet />
        </Content>
      </Layout>

      <style>{`
        .customer-layout {
          min-height: 100vh;
        }
        .customer-sider {
          background: linear-gradient(180deg, #064e3b 0%, #065f46 100%) !important;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          position: relative;
          z-index: 10;
        }
        .customer-sider .ant-layout-sider-children {
          display: flex;
          flex-direction: column;
        }
        .customer-logo {
          height: 80px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          flex-shrink: 0;
        }
        .logo-dollar {
          font-size: 28px;
          font-weight: 900;
          color: white;
          font-family: 'Arial Black', sans-serif;
        }
        .logo-text-container {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .logo-text {
          font-size: 26px;
          font-weight: 900;
          background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }
        .logo-subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .tagline {
          padding: 12px 20px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 500;
        }
        .quick-book {
          padding: 16px;
        }
        .quick-book-card {
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%);
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .quick-book-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }
        .quick-book-icon {
          font-size: 24px;
          color: #10B981;
        }
        .quick-book-text {
          display: flex;
          flex-direction: column;
        }
        .quick-book-title {
          color: white;
          font-weight: 600;
          font-size: 14px;
        }
        .quick-book-desc {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }
        .customer-menu {
          flex: 1;
          background: transparent !important;
          border: none;
          padding: 16px 8px;
        }
        .customer-menu .ant-menu-item {
          margin: 4px 8px;
          border-radius: 10px;
          height: 48px;
          line-height: 48px;
          font-size: 14px;
        }
        .customer-menu .ant-menu-item:hover {
          background: rgba(16, 185, 129, 0.15) !important;
        }
        .customer-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
        }
        .sidebar-footer {
          padding: 16px;
          margin-top: auto;
        }
        .promo-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .promo-card:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .promo-icon {
          font-size: 24px;
          color: #fbbf24;
        }
        .promo-text {
          display: flex;
          flex-direction: column;
        }
        .promo-title {
          color: white;
          font-weight: 600;
          font-size: 13px;
        }
        .promo-desc {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }
        .customer-header {
          background: #fff;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          position: relative;
          z-index: 9;
          height: 72px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .trigger-btn {
          font-size: 20px;
          width: 40px;
          height: 40px;
        }
        .fee-tag {
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .notification-btn {
          font-size: 20px;
          width: 40px;
          height: 40px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 12px;
          transition: background 0.3s;
        }
        .user-info:hover {
          background: #f5f5f5;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
        }
        .user-details {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
        }
        .user-role {
          font-size: 12px;
          color: #64748b;
        }
        .customer-content {
          margin: 24px;
          padding: 24px;
          background: #f8fafc;
          border-radius: 16px;
          min-height: calc(100vh - 120px);
        }
      `}</style>
    </Layout>
  );
};

export default CustomerLayout;
