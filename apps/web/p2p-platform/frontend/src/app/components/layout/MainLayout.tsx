import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  User,
  Menu,
  X,
  ChevronDown,
  GitPullRequest,
  Wallet,
  ClipboardCheck,
  ClipboardList,
  Utensils,
  FileCheck,
  LogOut,
  Car,
  Users,
  DollarSign,
  ShoppingBag,
  Truck,
  PieChart
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

  // =========================================================================
  // DOLLOR.AI ADMIN NAVIGATION
  // Matchmaking Platform for Food Delivery & Rideshare
  // Revenue Model: $1 customer + $1 restaurant (food) | Tiered fees (rideshare)
  // =========================================================================
  const navigation = [
    // === MAIN DASHBOARD ===
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },

    // === FOOD DELIVERY ===
    {
      name: 'Food Delivery',
      href: '/admin/orders',
      icon: ShoppingBag,
      children: [
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Restaurants', href: '/admin/vendor-management', icon: Utensils },
        { name: 'Menu Review', href: '/admin/menu-review', icon: FileCheck },
      ],
    },

    // === RIDESHARE ===
    {
      name: 'Rideshare',
      href: '/admin/rideshare',
      icon: Car,
      children: [
        { name: 'Ride Requests', href: '/admin/rideshare/requests', icon: Car },
        { name: 'Active Rides', href: '/admin/rideshare/active', icon: Truck },
      ],
    },

    // === PARTNERS ===
    {
      name: 'Partners',
      href: '/admin/vendor-management',
      icon: Users,
      children: [
        { name: 'Restaurants', href: '/admin/vendor-management', icon: Utensils },
        { name: 'Drivers', href: '/admin/drivers', icon: Truck },
        { name: 'Customers', href: '/admin/customers', icon: Users },
        { name: 'Document Review', href: '/admin/document-review', icon: FileCheck },
        { name: 'Onboarding (ZIP)', href: '/admin/zip-dashboard', icon: ClipboardCheck },
      ],
    },

    // === FINANCE (Platform Revenue Only - Not Pass-Throughs) ===
    {
      name: 'Finance',
      href: '/admin/accounting/platform-revenue',
      icon: DollarSign,
      children: [
        { name: 'Platform Revenue', href: '/admin/accounting/platform-revenue', icon: DollarSign },
        { name: 'Financial Reports', href: '/admin/accounting/reports', icon: PieChart },
        { name: 'Settlement', href: '/admin/accounting/vendor-payouts', icon: Wallet },
      ],
    },

    // === CUSTOMERS ===
    { name: 'Customers', href: '/admin/clients', icon: User },

    // === PROJECT TRACKER ===
    { name: 'Project Tracker', href: '/admin/project-tracker', icon: ClipboardList },

    // === CHANGE MANAGEMENT ===
    { name: 'Change Management', href: '/admin/change-management', icon: GitPullRequest },

    // === INVOICES ===
    { name: 'Invoices', href: '/admin/invoices', icon: FileText },
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
            <a href="/admin" className='flex items-center space-x-3'>
              <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">$</span>
              </div>
              <span className="text-lg font-semibold text-neutral-900">Dollor.ai Admin</span>
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

            {/* Logout Button - Visible */}
            <button
              onClick={showSignoutModal}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
              aria-label="Sign out"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Sign Out</span>
            </button>
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