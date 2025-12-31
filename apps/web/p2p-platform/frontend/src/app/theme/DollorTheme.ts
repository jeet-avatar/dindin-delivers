/**
 * Dollor.ai Unified Theme System
 *
 * BASE: iOS Design (eatfair-ios)
 * Must match exactly across:
 * - iOS: eatfair-ios-shared/Sources/EatFairShared/DollorTheme.swift
 * - Android: app/src/main/java/com/eatfair/app/ui/theme/DollorTheme.kt
 *
 * Usage: import { DollorTheme } from '@/app/theme';
 */

export const DollorTheme = {
  /**
   * Brand Colors - Primary identity colors
   */
  Brand: {
    green: '#06C167',       // Primary - buttons, highlights
    greenLight: '#4ADE80',  // Gradients, hover states
    greenDark: '#059669',   // Pressed states

    orange: '#F2994A',      // Secondary - accents, welcome
    orangeLight: '#FFB876', // Gradients
    orangeDark: '#D97706',  // Pressed states

    blue: '#3B82F6',        // Ride/info elements
    blueLight: '#60A5FA',   // Gradients
    blueDark: '#2563EB',    // Pressed states

    gold: '#FFD700',        // $ logo, premium
    goldLight: '#FFE066',   // Gradients
    goldDark: '#D4AF37',    // Pressed states

    purple: '#8B5CF6',      // AI features, special actions
    purpleLight: '#A78BFA', // Gradients
    purpleDark: '#7C3AED',  // Pressed states
  },

  /**
   * Background Colors
   */
  Background: {
    primary: '#F5F5F5',     // Main background (grey)
    secondary: '#FFFFFF',   // Cards, surfaces
    tertiary: '#F0F0F0',    // Subtle backgrounds
    dark: '#1D1B1E',        // Dark mode background
  },

  /**
   * Text Colors
   */
  Text: {
    primary: '#101010',     // Main text (black)
    secondary: '#757575',   // Subtle text (grey)
    tertiary: '#9CA3AF',    // Disabled/placeholder
    inverse: '#FFFFFF',     // Text on dark backgrounds
    link: '#06C167',        // Clickable text (same as brand green)
  },

  /**
   * Status Colors - For feedback and states
   */
  Status: {
    success: '#06C167',     // Same as brand green
    successBg: '#E8F5E9',   // Light green background

    error: '#F44336',       // Red
    errorBg: '#FFEBEE',     // Light red background

    warning: '#FF9800',     // Orange/amber
    warningBg: '#FFF8E1',   // Light amber background

    info: '#2196F3',        // Blue
    infoBg: '#E3F2FD',      // Light blue background

    pending: '#FF9800',     // Same as warning
    pendingBg: '#FFF3E0',   // Light orange background
  },

  /**
   * Order Status Colors
   */
  OrderStatus: {
    // Placed
    placedBg: '#E3F2FD',
    placedText: '#1976D2',

    // Accepted
    acceptedBg: '#F3E5F5',
    acceptedText: '#7B1FA2',

    // Preparing
    preparingBg: '#FFF3E0',
    preparingText: '#E65100',

    // Ready for Pickup
    readyBg: '#E8F5E9',
    readyText: '#388E3C',

    // Picked Up / On the Way
    onWayBg: '#E8F5E9',
    onWayText: '#06C167',

    // Delivered
    deliveredBg: '#E8F5E9',
    deliveredText: '#2E7D32',

    // Cancelled
    cancelledBg: '#FFEBEE',
    cancelledText: '#D32F2F',

    // Default
    defaultBg: '#F5F5F5',
    defaultText: '#9E9E9E',

    getColors: (status: string): { bg: string; text: string } => {
      switch (status) {
        case 'Placed': return { bg: '#E3F2FD', text: '#1976D2' };
        case 'Accepted': return { bg: '#F3E5F5', text: '#7B1FA2' };
        case 'Preparing': return { bg: '#FFF3E0', text: '#E65100' };
        case 'Ready': return { bg: '#E8F5E9', text: '#388E3C' };
        case 'PickedUp':
        case 'OnTheWay': return { bg: '#E8F5E9', text: '#06C167' };
        case 'Delivered': return { bg: '#E8F5E9', text: '#2E7D32' };
        case 'Cancelled': return { bg: '#FFEBEE', text: '#D32F2F' };
        default: return { bg: '#F5F5F5', text: '#9E9E9E' };
      }
    },
  },

  /**
   * Payment Status Colors
   */
  PaymentStatus: {
    completed: '#4CAF50',
    processing: '#FF9800',
    failed: '#F44336',
    initiated: '#2196F3',
    refunded: '#4CAF50',

    getColor: (status: string): string => {
      switch (status.toLowerCase()) {
        case 'completed':
        case 'refunded': return '#4CAF50';
        case 'processing':
        case 'pending': return '#FF9800';
        case 'failed':
        case 'denied': return '#F44336';
        case 'initiated': return '#2196F3';
        default: return '#9E9E9E';
      }
    },
  },

  /**
   * Deal/Promo Card Gradient Colors
   */
  Deals: {
    percentage: ['#A855F7', '#EC4899'],  // Purple to pink
    bogo: ['#F97316', '#EF4444'],        // Orange to red
    freeDelivery: ['#06C167', '#14B8A6'], // Green to teal
    flatAmount: ['#3B82F6', '#6366F1'],  // Blue to indigo

    getGradient: (type: string): string => {
      switch (type) {
        case 'percentage': return 'linear-gradient(135deg, #A855F7, #EC4899)';
        case 'bogo': return 'linear-gradient(135deg, #F97316, #EF4444)';
        case 'free_delivery': return 'linear-gradient(135deg, #06C167, #14B8A6)';
        case 'flat_amount': return 'linear-gradient(135deg, #3B82F6, #6366F1)';
        default: return 'linear-gradient(135deg, #6B7280, #9CA3AF)';
      }
    },

    getBadgeColor: (type: string): string => {
      switch (type) {
        case 'percentage': return '#A855F7';
        case 'bogo': return '#F97316';
        case 'free_delivery': return '#06C167';
        case 'flat_amount': return '#3B82F6';
        default: return '#6B7280';
      }
    },
  },

  /**
   * Action Colors - For buttons and interactions
   */
  Action: {
    primary: '#06C167',         // Primary buttons
    secondary: '#F2994A',       // Secondary buttons
    danger: '#EF4444',          // Delete, cancel
    dangerBg: '#FFF0F0',        // Danger section background
    dangerBorder: '#FFF5F7',    // Danger border

    disabled: '#E5E5E5',        // Disabled buttons
    disabledText: '#9CA3AF',    // Disabled text
  },

  /**
   * Rating Colors
   */
  Rating: {
    star: '#FFD700',        // Star yellow
    starEmpty: '#E5E5E5',   // Empty star
    excellent: '#4CAF50',   // 4.5+
    good: '#8BC34A',        // 3.5-4.5
    average: '#FF9800',     // 2.5-3.5
    poor: '#F44336',        // Below 2.5

    getColor: (rating: number): string => {
      if (rating >= 4.5) return '#4CAF50';
      if (rating >= 3.5) return '#8BC34A';
      if (rating >= 2.5) return '#FF9800';
      return '#F44336';
    },
  },

  /**
   * AI/Special Features
   */
  AI: {
    purple: '#9C27B0',
    pink: '#E91E63',
    gradient: 'linear-gradient(135deg, #9C27B0, #E91E63)',
  },

  /**
   * Border Colors
   */
  Border: {
    light: '#E5E5E5',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
    focus: '#06C167',
  },

  /**
   * Shadow/Elevation
   */
  Shadow: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.2)',
    dark: 'rgba(0, 0, 0, 0.3)',
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 4px 12px rgba(0, 0, 0, 0.12)',
    modal: '0 8px 32px rgba(0, 0, 0, 0.16)',
  },

  /**
   * Typography (matching iOS system fonts)
   */
  Typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  /**
   * Spacing (matching iOS)
   */
  Spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
  },

  /**
   * Border Radius
   */
  BorderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },
};

// CSS Variables export
export const cssVariables = `
  :root {
    /* Brand Colors */
    --color-brand-green: ${DollorTheme.Brand.green};
    --color-brand-green-light: ${DollorTheme.Brand.greenLight};
    --color-brand-green-dark: ${DollorTheme.Brand.greenDark};
    --color-brand-orange: ${DollorTheme.Brand.orange};
    --color-brand-orange-light: ${DollorTheme.Brand.orangeLight};
    --color-brand-blue: ${DollorTheme.Brand.blue};
    --color-brand-gold: ${DollorTheme.Brand.gold};
    --color-brand-purple: ${DollorTheme.Brand.purple};

    /* Background */
    --color-bg-primary: ${DollorTheme.Background.primary};
    --color-bg-secondary: ${DollorTheme.Background.secondary};

    /* Text */
    --color-text-primary: ${DollorTheme.Text.primary};
    --color-text-secondary: ${DollorTheme.Text.secondary};
    --color-text-tertiary: ${DollorTheme.Text.tertiary};

    /* Status */
    --color-success: ${DollorTheme.Status.success};
    --color-error: ${DollorTheme.Status.error};
    --color-warning: ${DollorTheme.Status.warning};
    --color-info: ${DollorTheme.Status.info};

    /* Actions */
    --color-action-primary: ${DollorTheme.Action.primary};
    --color-action-secondary: ${DollorTheme.Action.secondary};
    --color-action-danger: ${DollorTheme.Action.danger};

    /* Borders */
    --color-border-light: ${DollorTheme.Border.light};
    --color-border-medium: ${DollorTheme.Border.medium};

    /* Typography */
    --font-family: ${DollorTheme.Typography.fontFamily};

    /* Spacing */
    --spacing-xs: ${DollorTheme.Spacing.xs};
    --spacing-sm: ${DollorTheme.Spacing.sm};
    --spacing-md: ${DollorTheme.Spacing.md};
    --spacing-lg: ${DollorTheme.Spacing.lg};
    --spacing-xl: ${DollorTheme.Spacing.xl};

    /* Border Radius */
    --radius-sm: ${DollorTheme.BorderRadius.sm};
    --radius-md: ${DollorTheme.BorderRadius.md};
    --radius-lg: ${DollorTheme.BorderRadius.lg};
    --radius-xl: ${DollorTheme.BorderRadius.xl};
  }
`;

export default DollorTheme;
