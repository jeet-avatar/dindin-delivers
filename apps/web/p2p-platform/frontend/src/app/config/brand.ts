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

  // Platform Commission & Fees (legacy - use pricing object below)
  commission: {
    restaurantFlatFee: 1.00,  // $1 flat fee per order (not percentage!)
    deliveryFee: 4.99,
    serviceFee: 0,
    stripePercent: 2.9,
    stripeFixed: 0.30,
  },
};

// =============================================================================
// PRICING CONFIGURATION - Matches Android AppConfig.kt and iOS AppConfig.swift
// =============================================================================
// BUSINESS MODEL: MATCHMAKING SERVICE (Not delivery/TNC company)
//
// FOOD DELIVERY - FLAT $1 PRICING (No tiered pricing)
// - Customer: $1 flat per order (per restaurant)
// - Restaurant: $1 flat per restaurant in order
// - Driver: $0 (keeps 100% of delivery fees + tips)
//
// RIDESHARE - TIERED PRICING (Based on fare value)
// - Up to $35 fare:     $1 rider + $1 driver
// - $35.01 - $70 fare:  $2 rider + $2 driver
// - Above $70 fare:     $3 rider + $3 driver
// - Tips: 100% go to driver
// =============================================================================

export const pricing = {
  // ==========================================================================
  // FOOD DELIVERY PRICING - FLAT $1 (No tiered pricing)
  // ==========================================================================
  foodDelivery: {
    customerFee: 1.00,           // $1 flat per order (per restaurant)
    restaurantFee: 1.00,         // $1 flat per restaurant
    driverFee: 0.00,             // FREE - drivers keep 100%
    tipPlatformFee: 0.00,        // 100% of tips go to driver
    minimumOrder: 10.00,         // Minimum order amount

    /**
     * Get customer fee for food delivery.
     * Always $1 flat per restaurant - no tiered pricing for food.
     */
    getCustomerFee: (numberOfRestaurants: number = 1): number => {
      return pricing.foodDelivery.customerFee * numberOfRestaurants;
    },

    /**
     * Get restaurant platform fee.
     * Always $1 flat per restaurant.
     */
    getRestaurantFee: (_orderSubtotal: number): number => {
      return pricing.foodDelivery.restaurantFee;
    },

    /**
     * Get fee description for UI display.
     */
    getFeeDescription: (): string => '$1 Matchmaking Fee per restaurant',
  },

  // ==========================================================================
  // RIDESHARE PRICING - TIERED $1/$2/$3 (Based on fare value)
  // ==========================================================================
  rideshare: {
    // Tier thresholds (by fare value, NOT distance)
    tier1MaxFare: 35.00,         // Fares up to $35
    tier2MaxFare: 70.00,         // Fares $35.01 to $70
    // Tier 3: Fares above $70

    // Platform fees per tier (charged to BOTH rider AND driver)
    tier1Fee: 1.00,              // $1 for fares <= $35
    tier2Fee: 2.00,              // $2 for fares $35.01-$70
    tier3Fee: 3.00,              // $3 for fares > $70

    // Fare calculation - COMPETITIVE PRICING
    baseFare: 2.50,              // Minimum fare (competitive vs Uber/Lyft)
    perMileRate: 1.15,           // Per mile rate (competitive vs Uber/Lyft)
    perMinuteRate: 0.18,         // Per minute rate (competitive vs Uber/Lyft)

    // Tips
    tipPlatformFee: 0.00,        // 100% of tips go to driver

    /**
     * Calculate tiered platform fee for rideshare based on fare value.
     * Returns the fee amount for BOTH rider AND driver (same amount each).
     */
    calculatePlatformFee: (fareAmount: number): number => {
      if (fareAmount <= pricing.rideshare.tier1MaxFare) {
        return pricing.rideshare.tier1Fee;
      } else if (fareAmount <= pricing.rideshare.tier2MaxFare) {
        return pricing.rideshare.tier2Fee;
      } else {
        return pricing.rideshare.tier3Fee;
      }
    },

    /**
     * Get rider platform fee based on fare amount.
     */
    getRiderFee: (fareAmount: number): number => {
      return pricing.rideshare.calculatePlatformFee(fareAmount);
    },

    /**
     * Get driver platform fee based on fare amount.
     */
    getDriverFee: (fareAmount: number): number => {
      return pricing.rideshare.calculatePlatformFee(fareAmount);
    },

    /**
     * Get tier number for display (1, 2, or 3).
     */
    getTier: (fareAmount: number): number => {
      if (fareAmount <= pricing.rideshare.tier1MaxFare) return 1;
      if (fareAmount <= pricing.rideshare.tier2MaxFare) return 2;
      return 3;
    },

    /**
     * Get tier name for display.
     */
    getTierName: (fareAmount: number): string => {
      if (fareAmount <= pricing.rideshare.tier1MaxFare) {
        return 'Tier 1 (up to $35)';
      } else if (fareAmount <= pricing.rideshare.tier2MaxFare) {
        return 'Tier 2 ($35-$70)';
      } else {
        return 'Tier 3 (above $70)';
      }
    },

    /**
     * Get fee description for UI display.
     */
    getFeeDescription: (fareAmount: number): string => {
      const fee = pricing.rideshare.calculatePlatformFee(fareAmount);
      return `$${fee.toFixed(0)} Platform Fee`;
    },

    /**
     * Calculate rideshare fare (before platform fees).
     */
    calculateFare: (distanceMiles: number, durationMinutes: number = 0): number => {
      const distanceFare = distanceMiles * pricing.rideshare.perMileRate;
      const timeFare = durationMinutes * pricing.rideshare.perMinuteRate;
      return Math.max(
        pricing.rideshare.baseFare,
        pricing.rideshare.baseFare + distanceFare + timeFare
      );
    },

    /**
     * Calculate driver earnings after platform fee.
     */
    calculateDriverEarnings: (fare: number, tip: number = 0): number => {
      const platformFee = pricing.rideshare.calculatePlatformFee(fare);
      return fare - platformFee + tip;
    },

    /**
     * Calculate total rider payment.
     */
    calculateRiderTotal: (fare: number, tip: number = 0): number => {
      const platformFee = pricing.rideshare.calculatePlatformFee(fare);
      return fare + platformFee + tip;
    },
  },

  // ==========================================================================
  // DRIVER PAY CONFIGURATION (Food Delivery)
  // ==========================================================================
  driverPay: {
    basePay: 3.00,               // Base pay per delivery
    perMileRate: 0.50,           // Per mile rate

    // Tiered base pay (for larger orders)
    basePayTier1: 3.00,          // Orders <= $35
    basePayTier2: 4.00,          // Orders $35-$70
    basePayTier3: 5.00,          // Orders > $70

    // Tiered per-mile rates
    perMileTier1: 0.50,          // Orders <= $35
    perMileTier2: 0.60,          // Orders $35-$70
    perMileTier3: 0.75,          // Orders > $70

    // Order value tier thresholds
    tier1MaxOrder: 35.00,        // Orders up to $35
    tier2MaxOrder: 70.00,        // Orders $35-$70

    /**
     * Calculate driver earnings for a delivery.
     * Drivers keep 100% of base pay + per mile + tips (no platform fee).
     */
    calculateDriverEarnings: (distanceMiles: number, tip: number): number => {
      return pricing.driverPay.basePay + (distanceMiles * pricing.driverPay.perMileRate) + tip;
    },

    /**
     * Calculate tiered driver earnings based on order value.
     */
    calculateTieredDriverEarnings: (orderSubtotal: number, distanceMiles: number, tip: number): number => {
      let basePay: number;
      let perMile: number;

      if (orderSubtotal <= pricing.driverPay.tier1MaxOrder) {
        basePay = pricing.driverPay.basePayTier1;
        perMile = pricing.driverPay.perMileTier1;
      } else if (orderSubtotal <= pricing.driverPay.tier2MaxOrder) {
        basePay = pricing.driverPay.basePayTier2;
        perMile = pricing.driverPay.perMileTier2;
      } else {
        basePay = pricing.driverPay.basePayTier3;
        perMile = pricing.driverPay.perMileTier3;
      }

      return basePay + (distanceMiles * perMile) + tip;
    },
  },

  // ==========================================================================
  // TAX CONFIGURATION
  // ==========================================================================
  tax: {
    stateTaxRates: {
      'CA': 0.0725,  // California
      'TX': 0.0625,  // Texas
      'NY': 0.08,    // New York
      'FL': 0.06,    // Florida
      'WA': 0.065,   // Washington
      'IL': 0.0625,  // Illinois
      'PA': 0.06,    // Pennsylvania
      'OH': 0.0575,  // Ohio
      'GA': 0.04,    // Georgia
      'NC': 0.0475,  // North Carolina
    } as Record<string, number>,
    defaultTaxRate: 0.0825,      // 8.25% default

    /**
     * Get tax rate for a state.
     */
    getTaxRate: (state: string): number => {
      return pricing.tax.stateTaxRates[state.toUpperCase()] || pricing.tax.defaultTaxRate;
    },
  },

  // ==========================================================================
  // DISPLAY STRINGS (for UI)
  // ==========================================================================
  display: {
    foodDelivery: {
      customerFee: '$1 per restaurant',
      restaurantFee: '$1 per order',
      driverFee: 'Free (keeps 100% + tips)',
      minimumOrder: '$10.00',
    },
    rideshare: {
      tier1: { label: 'Tier 1 (up to $35)', fee: '$1' },
      tier2: { label: 'Tier 2 ($35-$70)', fee: '$2' },
      tier3: { label: 'Tier 3 (above $70)', fee: '$3' },
      summary: 'Tiered by fare: $1 (≤$35) | $2 ($35-$70) | $3 (>$70). Both rider and driver pay.',
    },
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
