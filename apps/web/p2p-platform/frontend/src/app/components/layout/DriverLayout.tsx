import React, { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Tag, Badge } from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  DollarOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  EnvironmentOutlined,
  StarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const DriverLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/driver/login');
  };

  const menuItems = [
    {
      key: '/driver/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/driver/deliveries',
      icon: <CarOutlined />,
      label: 'Deliveries',
    },
    {
      key: '/driver/earnings',
      icon: <DollarOutlined />,
      label: 'Earnings',
    },
    {
      key: '/driver/documents',
      icon: <FileTextOutlined />,
      label: 'Documents',
    },
    {
      key: '/driver/ratings',
      icon: <StarOutlined />,
      label: 'Ratings',
    },
    {
      key: '/driver/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Profile
      </Menu.Item>
      <Menu.Item key="vehicle" icon={<CarOutlined />}>
        Vehicle Info
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout className="driver-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="driver-sider"
        width={260}
      >
        <div className="driver-logo">
          <div className="logo-circle">
            <span className="logo-dollar">$</span>
          </div>
          {!collapsed && (
            <div className="logo-text-container">
              <span className="logo-text">$ai</span>
              <span className="logo-subtitle">Driver Partner</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="tagline">
            Deliver anything, earn more
          </div>
        )}

        {/* Online/Offline Toggle */}
        {!collapsed && (
          <div className="status-toggle">
            <div
              className={`toggle-card ${isOnline ? 'online' : 'offline'}`}
              onClick={() => setIsOnline(!isOnline)}
            >
              <div className="toggle-indicator">
                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
              </div>
              <div className="toggle-text">
                <span className="toggle-label">{isOnline ? 'You\'re Online' : 'You\'re Offline'}</span>
                <span className="toggle-desc">{isOnline ? 'Accepting deliveries' : 'Tap to go online'}</span>
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
          className="driver-menu"
        />

        {!collapsed && (
          <div className="sidebar-footer">
            <div className="stats-card">
              <div className="stat-item">
                <ClockCircleOutlined />
                <span>4.2 hrs today</span>
              </div>
              <div className="stat-item">
                <EnvironmentOutlined />
                <span>12 deliveries</span>
              </div>
            </div>
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="driver-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="trigger-btn"
            />
            <Tag
              color={isOnline ? 'green' : 'default'}
              className="status-tag"
            >
              <span className={`status-dot-small ${isOnline ? 'online' : 'offline'}`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </Tag>
            <Tag color="blue" className="rating-tag">
              <StarOutlined /> 4.9
            </Tag>
          </div>
          <div className="header-right">
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />} className="notification-btn" />
            </Badge>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div className="user-info">
                <Avatar
                  icon={<UserOutlined />}
                  className="user-avatar"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
                />
                <div className="user-details">
                  <span className="user-name">{user?.full_name || 'Driver'}</span>
                  <span className="user-role">Delivery Partner</span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="driver-content">
          <Outlet />
        </Content>
      </Layout>

      <style>{`
        .driver-layout {
          min-height: 100vh;
        }
        .driver-sider {
          background: linear-gradient(180deg, #1e1b4b 0%, #312e81 100%) !important;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          position: relative;
          z-index: 10;
        }
        .driver-sider .ant-layout-sider-children {
          display: flex;
          flex-direction: column;
        }
        .driver-logo {
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
          background: linear-gradient(135deg, #10B981 0%, #8B5CF6 100%);
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
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .status-toggle {
          padding: 16px;
        }
        .toggle-card {
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .toggle-card.online {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .toggle-card.offline {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .toggle-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .status-dot.online {
          background: #10B981;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }
        .status-dot.offline {
          background: #64748b;
        }
        .status-dot-small {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .status-dot-small.online {
          background: #10B981;
        }
        .status-dot-small.offline {
          background: #64748b;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .toggle-text {
          display: flex;
          flex-direction: column;
        }
        .toggle-label {
          color: white;
          font-weight: 600;
          font-size: 14px;
        }
        .toggle-desc {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }
        .driver-menu {
          flex: 1;
          background: transparent !important;
          border: none;
          padding: 16px 8px;
        }
        .driver-menu .ant-menu-item {
          margin: 4px 8px;
          border-radius: 10px;
          height: 48px;
          line-height: 48px;
          font-size: 14px;
        }
        .driver-menu .ant-menu-item:hover {
          background: rgba(139, 92, 246, 0.15) !important;
        }
        .driver-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%) !important;
        }
        .sidebar-footer {
          padding: 16px;
          margin-top: auto;
        }
        .stats-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }
        .stat-item .anticon {
          color: #8B5CF6;
        }
        .driver-header {
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
        .status-tag {
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
        }
        .rating-tag {
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
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
        .driver-content {
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

export default DriverLayout;
