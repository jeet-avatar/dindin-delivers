import { useLocation } from 'react-router-dom';
import {
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import type { User } from '../types';

interface TopbarProps {
  user: User;
}

// Map pathnames to human-readable page titles
const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/companies': 'Companies',
  '/deals': 'Deals',
  '/quotes': 'Quotes',
  '/contracts': 'Contracts',
  '/import': 'CRM Import',
  '/job-leads': 'Job Leads',
  '/activities': 'Activities',
  '/analytics': 'Analytics',
  '/tags': 'Tags',
  '/campaigns': 'Campaigns',
  '/video-campaigns': 'Video Campaigns',
  '/email-templates': 'Email Templates',
  '/team': 'Team',
  '/settings': 'Settings',
  '/super-admin': 'Super Admin',
};

export function Topbar({ user }: TopbarProps) {
  const location = useLocation();
  // Match exact or prefix (e.g. /contacts/123 → Contacts)
  const title =
    PAGE_TITLES[location.pathname] ??
    Object.entries(PAGE_TITLES).find(([key]) =>
      key !== '/' && location.pathname.startsWith(key)
    )?.[1] ??
    'Zietra';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(15, 15, 26, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Page title */}
      <h1
        style={{
          fontFamily: "'Lexend', sans-serif",
          fontSize: '18px',
          fontWeight: 600,
          color: '#F1F5F9',
          letterSpacing: '-0.02em',
          margin: 0,
        }}
      >
        {title}
      </h1>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Cmd+K trigger — visual only */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            color: '#64748B',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          title="Command palette (Cmd+K)"
        >
          <MagnifyingGlassIcon style={{ width: '14px', height: '14px' }} />
          <span>Search</span>
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '1px 5px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#475569',
              fontFamily: "'Fira Code', monospace",
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        <button
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            color: '#64748B',
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          title="Notifications"
        >
          <BellIcon style={{ width: '18px', height: '18px' }} />
          {/* Notification badge */}
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              background: '#818CF8',
              borderRadius: '50%',
              border: '2px solid #0F0F1A',
            }}
          />
        </button>

        {/* User avatar */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)',
            flexShrink: 0,
          }}
          title={`${user.firstName} ${user.lastName}`}
        >
          {user.firstName[0]}{user.lastName[0]}
        </div>
      </div>
    </header>
  );
}
