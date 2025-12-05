/**
 * $ai Brand Configuration
 *
 * Centralized branding configuration for the entire application.
 * Update these values to change branding across all pages and components.
 */

export const brand = {
  // Company Information
  name: '$ai',
  fullName: '$ai - Everything Delivered',
  tagline: "World's first $ online for everything",
  description: 'From delivery to rides to household chores - powered by AI',

  // Website & Domain
  website: 'https://dollor.ai',
  supportEmail: 'support@dollor.ai',

  // Colors
  colors: {
    // Primary - Dollar Green
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#34D399',

    // Secondary - AI Purple
    secondary: '#6366F1',
    secondaryDark: '#4F46E5',
    secondaryLight: '#8B5CF6',

    // Accent
    accent: '#F59E0B',
    accentLight: '#FBBF24',

    // Neutral
    text: '#1F2937',
    textLight: '#6B7280',
    background: '#F9FAFB',
    white: '#FFFFFF',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    secondary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    hero: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #6366F1 100%)',
    dark: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
  },

  // Logo paths (relative to public folder)
  logos: {
    full: '/logo-dollar-ai.svg',
    icon: '/favicon.svg',
    white: '/logo-dollar-ai-white.svg',
  },

  // Social Links
  social: {
    twitter: 'https://twitter.com/dollorai',
    facebook: 'https://facebook.com/dollorai',
    instagram: 'https://instagram.com/dollorai',
    linkedin: 'https://linkedin.com/company/dollorai',
  },

  // App Store Links
  appStore: {
    ios: 'https://apps.apple.com/app/dollar-ai',
    android: 'https://play.google.com/store/apps/details?id=ai.dollor',
  },

  // Platform Commission & Fees
  commission: {
    restaurantFlatFee: 1.00,  // $1 flat fee per order (not percentage!)
    deliveryFee: 4.99,
    serviceFee: 0,
    stripePercent: 2.9,
    stripeFixed: 0.30,
  },
};

// CSS Variables for use in styled components or inline styles
export const cssVars = `
  :root {
    --brand-primary: ${brand.colors.primary};
    --brand-primary-dark: ${brand.colors.primaryDark};
    --brand-primary-light: ${brand.colors.primaryLight};
    --brand-secondary: ${brand.colors.secondary};
    --brand-secondary-dark: ${brand.colors.secondaryDark};
    --brand-secondary-light: ${brand.colors.secondaryLight};
    --brand-accent: ${brand.colors.accent};
    --brand-text: ${brand.colors.text};
    --brand-text-light: ${brand.colors.textLight};
    --brand-background: ${brand.colors.background};
    --brand-gradient-primary: ${brand.gradients.primary};
    --brand-gradient-secondary: ${brand.gradients.secondary};
    --brand-gradient-hero: ${brand.gradients.hero};
  }
`;

export default brand;
