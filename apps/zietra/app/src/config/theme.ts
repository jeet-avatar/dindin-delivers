/**
 * UI Theme Configuration
 *
 * This file contains all UI customization options.
 * Change these values to customize the entire application's appearance.
 */

export const theme = {
  // Brand Colors
  colors: {
    // Primary brand color (used for main actions, links)
    primary: {
      50: 'rgba(99, 102, 241, 0.08)',
      100: 'rgba(99, 102, 241, 0.15)',
      200: '#A5B4FC',
      300: '#818CF8',
      400: '#6366F1',
      500: '#818CF8', // Main primary color (Indigo)
      600: '#6366F1',
      700: '#4F46E5',
      800: '#4338CA',
      900: '#312E81',
    },

    // Secondary colors for variety
    purple: {
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
    },

    green: {
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },

    red: {
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },

    orange: {
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
    },

    yellow: {
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
    },

    // Neutral grays
    gray: {
      50: '#161625',
      100: '#12121F',
      200: '#1E1E30',
      300: '#2A2A42',
      400: '#64748B',
      500: '#94A3B8',
      600: '#CBD5E1',
      700: '#E2E8F0',
      800: '#F1F5F9',
      900: '#F8FAFC',
    },
  },

  // Gradient combinations (used in buttons, headers)
  gradients: {
    primary: 'from-indigo-500 to-purple-600',
    success: 'from-emerald-500 to-green-600',
    danger: 'from-red-500 to-rose-600',
    warning: 'from-amber-500 to-orange-600',
    info: 'from-indigo-500 to-violet-600',
    apollo: 'from-purple-600 to-indigo-600',
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(99, 102, 241, 0.12)',
    glowHover: '0 0 30px rgba(99, 102, 241, 0.2)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
};

/**
 * Contact Status Colors
 * Customize the badge colors for different contact statuses
 */
export const statusColors = {
  LEAD: 'bg-blue-100 text-blue-500 border border-blue-200',
  PROSPECT: 'bg-purple-100 text-purple-500 border border-purple-200',
  CUSTOMER: 'bg-green-100 text-green-700 border border-green-200',
  COLD: 'bg-gray-100 text-gray-700 border border-gray-200',
  WARM: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  HOT: 'bg-red-100 text-red-700 border border-red-200',
  CLOSED_WON: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CLOSED_LOST: 'bg-slate-100 text-slate-700 border border-slate-200',
};

/**
 * Deal Stage Colors
 * Customize colors for deal pipeline stages
 */
export const dealStageColors = {
  QUALIFICATION: 'bg-amber-500',
  PROPOSAL: 'bg-indigo-500',
  NEGOTIATION: 'bg-purple-500',
  CLOSED_WON: 'bg-green-500',
  CLOSED_LOST: 'bg-gray-400',
};

/**
 * Priority Colors
 * Customize colors for priority levels
 */
export const priorityColors = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default theme;
