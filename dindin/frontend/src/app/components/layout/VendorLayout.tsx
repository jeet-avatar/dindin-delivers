import React, { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
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
  ShopOutlined
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
        width={250}
      >
        <div className="vendor-logo">
          <ShopOutlined className="logo-icon" />
          {!collapsed && <span className="logo-text">Vendor Portal</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="vendor-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="trigger-btn"
          />
          <div className="header-right">
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} className="user-avatar" />
                <span className="user-name">{user?.full_name || 'Vendor User'}</span>
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
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
          position: relative;
          z-index: 10;
        }
        .vendor-logo {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.1);
          margin: 16px;
          border-radius: 8px;
        }
        .logo-icon {
          font-size: 28px;
          color: #fff;
        }
        .logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
        .vendor-header {
          background: #fff;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 9;
        }
        .trigger-btn {
          font-size: 18px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 4px 12px;
          border-radius: 8px;
          transition: background 0.3s;
        }
        .user-info:hover {
          background: #f5f5f5;
        }
        .user-avatar {
          background: #667eea;
        }
        .user-name {
          font-weight: 500;
        }
        .vendor-content {
          margin: 24px;
          padding: 24px;
          background: #f0f2f5;
          border-radius: 8px;
          min-height: calc(100vh - 112px);
        }
      `}</style>
    </Layout>
  );
};

export default VendorLayout;
