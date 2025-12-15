import React, { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Tag } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  BellOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const VendorLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    navigate('/vendor/login');
  };

  const menuItems = [
    {
      key: '/vendor/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/vendor/menu',
      icon: <ShoppingOutlined />,
      label: 'Menu Management',
    },
    {
      key: '/vendor/earnings',
      icon: <DollarOutlined />,
      label: 'Earnings',
    },
    {
      key: '/vendor/documents',
      icon: <FileTextOutlined />,
      label: 'Documents',
    },
    {
      key: '/vendor/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Profile
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout className="vendor-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="vendor-sider"
        width={260}
      >
        <div className="vendor-logo">
          <div className="logo-circle">
            <span className="logo-dollar">$</span>
          </div>
          {!collapsed && (
            <div className="logo-text-container">
              <span className="logo-text">$ai</span>
              <span className="logo-subtitle">Restaurant Partner</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="tagline">
            World's first $ online for everything
          </div>
        )}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="vendor-menu"
        />
        {!collapsed && (
          <div className="sidebar-footer">
            <div className="help-card">
              <ShopOutlined className="help-icon" />
              <div className="help-text">
                <span className="help-title">Need Help?</span>
                <span className="help-desc">Contact Support</span>
              </div>
            </div>
          </div>
        )}
      </Sider>
      <Layout>
        <Header className="vendor-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="trigger-btn"
            />
            <Tag color="green" className="status-tag">Restaurant Partner</Tag>
          </div>
          <div className="header-right">
            <Button type="text" icon={<BellOutlined />} className="notification-btn" />
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div className="user-info">
                <Avatar
                  icon={<UserOutlined />}
                  className="user-avatar"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                />
                <div className="user-details">
                  <span className="user-name">{user?.full_name || 'Restaurant Owner'}</span>
                  <span className="user-role">Partner</span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="vendor-content">
          <Outlet />
        </Content>
      </Layout>

      <style>{`
        .vendor-layout {
          min-height: 100vh;
        }
        .vendor-sider {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%) !important;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          position: relative;
          z-index: 10;
        }
        .vendor-sider .ant-layout-sider-children {
          display: flex;
          flex-direction: column;
        }
        .vendor-logo {
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
        .vendor-menu {
          flex: 1;
          background: transparent !important;
          border: none;
          padding: 16px 8px;
        }
        .vendor-menu .ant-menu-item {
          margin: 4px 8px;
          border-radius: 10px;
          height: 48px;
          line-height: 48px;
          font-size: 14px;
        }
        .vendor-menu .ant-menu-item:hover {
          background: rgba(16, 185, 129, 0.15) !important;
        }
        .vendor-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
        }
        .sidebar-footer {
          padding: 16px;
          margin-top: auto;
        }
        .help-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .help-card:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .help-icon {
          font-size: 24px;
          color: #10B981;
        }
        .help-text {
          display: flex;
          flex-direction: column;
        }
        .help-title {
          color: white;
          font-weight: 600;
          font-size: 14px;
        }
        .help-desc {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }
        .vendor-header {
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
          gap: 16px;
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
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
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
          margin-left: 8px;
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
        .vendor-content {
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

export default VendorLayout;
