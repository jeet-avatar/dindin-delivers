import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Menu,
  X,
  ChevronDown,
  BarChart,
  GitPullRequest,
  GitBranch,
  FileSpreadsheet,
  Wallet,
  Building2
} from 'lucide-react';
import Bridge from '../../constants/Bridge';
import { useUser } from '../../context/UserContext';
import Logo from '../../../assets/img/user.jpg';
import { Modal } from 'antd';

import { ExclamationCircleOutlined } from '@ant-design/icons';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useUser();
  const [notifications, setNotifications] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
 const toggleMenu = (name: string) => setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));

  useEffect(() => {
    getNotifications();
  }, []);

  const getNotifications = () => {
    Bridge.notifications().then((response: Array<{ read: boolean }>) => {
      setNotifications(response);
    }).catch((error: unknown) => {
      console.error(error);
    });
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'System Dashboards', href: '/system-dashboard', icon: BarChart },
    { name: 'Coupa Dashboard', href: '/coupa-dashboard', icon: FileSpreadsheet },
    { name: 'NetSuite Dashboard', href: '/netsuite-dashboard', icon: Building2 },
    { name: 'JIRA Dashboard', href: '/jira-dashboard', icon: GitPullRequest },
    { name: 'ZIP Dashboard', href: '/zip-dashboard', icon: Wallet },
    { name: 'Vendor Management', href: '/vendor-management', icon: User },
    {
      name: 'Transactions',
      href: '/transactions',
      icon: Briefcase,
      children: [
        { name: 'Coupa Transactions', href: '/transactions/coupa', icon: FileSpreadsheet },
        { name: 'NetSuite Transactions', href: '/transactions/netsuite', icon: Building2 },
      ],
    },
    { name: 'Orders', href: '/orders', icon: GitBranch },
    {
      name: 'Accounting',
      href: '/accounting',
      icon: Wallet,
      children: [
        { name: 'Platform Revenue', href: '/accounting/platform-revenue', icon: Wallet },
        { name: 'Vendor Payouts', href: '/accounting/vendor-payouts', icon: FileText },
      ],
    },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Clients', href: '/clients', icon: User },
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const _toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    setUserMenuOpen(false);
  };
  void _toggleNotifications; // Reserved for future notification feature

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    setNotificationsOpen(false);
  };

  const _unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length;
  void _unreadCount; // Reserved for future notification badge

  const showSignoutModal = () => {
    setIsModalOpen(true);
  }

  const handleConfirm = () => {
    setIsModalOpen(false);
    logout();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-neutral-800 bg-opacity-75 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out border-r border-neutral-200 
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <a href="/" className='flex items-center space-x-3'>
              <img 
                src="https://th.bing.com/th/id/OIP.U6BcwosycN9N7WOesvICDQAAAA?cb=iwp2&rs=1&pid=ImgDetMain" 
                alt="DoorDash Logo" 
                className="h-8 w-auto"
              />
              <span className="text-lg font-semibold text-neutral-900">DoorDash P2P</span>
            </a>
          </div>
          <button 
            onClick={closeSidebar}
            className="md:hidden text-neutral-500 hover:text-neutral-700"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;

            // render parent with children (expandable)
            if (item.children && item.children.length) {
              const parentOpen =
                openMenus[item.name] ?? location.pathname.startsWith(item.href);
              return (
                <div key={item.name}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.name)}
                    className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-primary-50 text-primary-600"
                        : "text-neutral-600 hover:bg-neutral-100"
                    } transition-colors duration-150`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? "text-primary-500" : "text-neutral-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-neutral-400 transform ${
                        parentOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {parentOpen && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const childActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => {
                              closeSidebar();
                            }}
                            className={`flex items-center px-4 py-2 text-sm rounded-md ${
                              childActive
                                ? "bg-primary-50 text-primary-600"
                                : "text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            <child.icon
                              className={`mr-3 h-4 w-4 ${
                                childActive
                                  ? "text-primary-500"
                                  : "text-neutral-400"
                              }`}
                            />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center px-4 py-3 text-sm font-medium rounded-md text-neutral-400 cursor-not-allowed opacity-50"
                >
                  <item.icon
                    className="mr-3 h-5 w-5 text-neutral-300"
                    aria-hidden="true"
                  />
                  {item.name}
                </div>
              );
            }
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeSidebar}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                  isActive
                     ? "bg-primary-50 text-primary-600"
                    : "text-neutral-600 hover:bg-neutral-100"
                } transition-colors duration-150 ease-in-out`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    isActive ? "text-primary-500" : "text-neutral-400"
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white h-16 flex items-center justify-between border-b border-neutral-200 px-4">
          <button
            className="text-neutral-500 md:hidden"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center space-x-4">
            {/* User Profile */}
            <div className="relative">
              <button
                onClick={toggleUserMenu}
                className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors duration-150"
              >
                {user ? (
                  <>
                    <img
                      src={user.avatar ? user.avatar : Logo}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-neutral-700">
                        {user.full_name || user.name}
                        {user.role && <span className="text-xs text-neutral-500 ml-1">({user.role})</span>}
                        {user.groups && (() => {
                          const group = user.groups?.find(g => g === 'Admin' || g === 'User');
                          if (group) {
                            return <span className="text-xs text-neutral-500 ml-1">({group})</span>;
                          }
                          return null;
                        })()}
                      </p>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                  </>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-neutral-200 animate-pulse" />
                )}
                <ChevronDown size={16} className="text-neutral-400" />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 py-1 border border-neutral-200">
                  <button type="button" className="block px-4 py-2 text-sm w-48 text-neutral-700 hover:bg-neutral-100 bg-transparent border-none p-0 cursor-pointer text-left" aria-label="Your Profile">Your Profile</button>
                  <button type="button" className="block px-4 py-2 text-sm w-48 text-neutral-700 hover:bg-neutral-100 bg-transparent border-none p-0 cursor-pointer text-left" aria-label="Settings">Settings</button>
                  <div className="border-t border-neutral-200"></div>
                  <button type="button" className="block px-4 py-2 text-sm w-48 text-neutral-700 hover:bg-neutral-100 bg-transparent border-none p-0 cursor-pointer text-left" aria-label="Settings" onClick={()=>showSignoutModal()}>Sign out</button>
                </div>
              )}
            </div>

            {/* Notifications */}
            {/* <div className="relative">
              <button 
                onClick={toggleNotifications}
                className="relative p-1.5 text-neutral-400 hover:text-neutral-500 rounded-full hover:bg-neutral-100 transition-colors duration-150"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-primary-600 rounded-full flex items-center justify-center text-[10px] text-white font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {notificationsOpen && (
                <NotificationDropdown 
                  notifications={notifications} 
                  onClose={() => setNotificationsOpen(false)}
                />
              )}
            </div> */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Modal
          title="Do you want to sign out?"
          icon={<ExclamationCircleOutlined />}
          content="If you sign out, you will no longer be able to access your account. Are you sure you want to sign out?"
          okText="Yes"
          okType="primary"
          cancelText="No"
          onOk={handleConfirm}
          onCancel={handleCancel}
          open={isModalOpen}
          width={350}
        >
          <p className="pt-3 text-sm text-neutral-500">If you sign out, you will no longer be able to access your account. Are you sure you want to sign out?</p>
        </Modal>

    </div>
  );
};

export default MainLayout;