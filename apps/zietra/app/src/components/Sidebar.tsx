import { NavLink } from 'react-router-dom';
import {
  ChartPieIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ChartBarSquareIcon,
  TagIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  SparklesIcon,
  VideoCameraIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ArrowUpTrayIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { Logo } from './Logo';
import type { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onOpenChat?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartPieIcon },
  { name: 'Contacts', href: '/contacts', icon: UserGroupIcon },
  { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
  { name: 'Deals', href: '/deals', icon: ChartBarIcon },
  { name: 'Quotes', href: '/quotes', icon: DocumentTextIcon },
  { name: 'Contracts', href: '/contracts', icon: ClipboardDocumentCheckIcon },
  { name: 'CRM Import', href: '/import', icon: ArrowUpTrayIcon },
  { name: 'Job Leads', href: '/job-leads', icon: BriefcaseIcon },
  { name: 'Activities', href: '/activities', icon: ClipboardDocumentListIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarSquareIcon },
  { name: 'Tags', href: '/tags', icon: TagIcon },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon },
  { name: 'Video Campaigns', href: '/video-campaigns', icon: VideoCameraIcon },
  { name: 'Email Templates', href: '/email-templates', icon: EnvelopeIcon },
  { name: 'Team', href: '/team', icon: UserCircleIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

const sidebarHoverStyle = `
  .sidebar-nav-item:hover {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #CBD5E1 !important;
  }
  .sidebar-nav-item:hover svg {
    color: #94A3B8 !important;
  }
`;

export function Sidebar({ user, onLogout, onOpenChat }: SidebarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: '12px',
        top: '12px',
        height: 'calc(100vh - 24px)',
        width: '248px',
        background: 'rgba(22, 22, 37, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.06)',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      <style>{sidebarHoverStyle}</style>

      {/* Zietra Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <Logo />
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
        }}
      >
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="sidebar-nav-item"
            style={({ isActive }) =>
              isActive
                ? {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.18)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#A5B4FC',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
                    fontWeight: 600,
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    marginBottom: '2px',
                  }
                : {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: '#64748B',
                    fontWeight: 500,
                    fontSize: '14px',
                    textDecoration: 'none',
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    marginBottom: '2px',
                  }
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  style={{
                    width: '18px',
                    height: '18px',
                    flexShrink: 0,
                    color: isActive ? '#818CF8' : '#64748B',
                  }}
                />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Super Admin Link - Only for ethan@zietra.com */}
        {user.email === 'ethan@zietra.com' && (
          <>
            <div
              style={{
                margin: '12px 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            />
            <NavLink
              to="/super-admin"
              className="sidebar-nav-item"
              style={({ isActive }) =>
                isActive
                  ? {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#FCA5A5',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
                      fontWeight: 600,
                      fontSize: '14px',
                      textDecoration: 'none',
                      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: 'pointer',
                    }
                  : {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: '#64748B',
                      fontWeight: 500,
                      fontSize: '14px',
                      textDecoration: 'none',
                      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: 'pointer',
                    }
              }
            >
              {({ isActive }) => (
                <>
                  <ShieldCheckIcon
                    style={{
                      width: '18px',
                      height: '18px',
                      flexShrink: 0,
                      color: isActive ? '#F87171' : '#64748B',
                    }}
                  />
                  <span>Super Admin</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* AI Assistant Button */}
      {onOpenChat && (
        <div style={{ padding: '12px 16px' }}>
          <button
            onClick={onOpenChat}
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title="AI Assistant - Campaign & Contact Help"
          >
            <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>AI Assistant</span>
            <SparklesIcon style={{ width: '16px', height: '16px', marginLeft: 'auto' }} className="animate-pulse" />
          </button>
        </div>
      )}

      {/* User Profile Section */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '12px 16px',
        }}
      >
        {/* User Info Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                height: '40px',
                width: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: '12px', flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#F1F5F9',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {user.firstName} {user.lastName}
            </p>
            <p
              style={{
                fontSize: '11px',
                color: '#64748B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
                fontWeight: 500,
              }}
            >
              {user.email}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 16px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
            transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <ArrowRightOnRectangleIcon style={{ height: '18px', width: '18px' }} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
