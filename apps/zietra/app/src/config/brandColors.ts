/**
 * Zietra Design System - Centralized Color & Gradient Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all colors and gradients in the application.
 * Change colors here and they will automatically apply across ALL pages.
 *
 * Design Philosophy: Zietra Blue
 * - Primary: Sky-Blue (Premium, Intelligence, Innovation)
 * - Success: Emerald-Green (Growth, Success, Prosperity)
 * - Warning: Amber-Orange (Attention, Caution)
 * - Info: Sky-Cyan (Clarity, Knowledge)
 * - Danger: Red-Rose (Critical, Important, Action Required)
 * - Premium: Sky-Blue (Luxury, Premium, Exclusive)
 */

// ============================================================================
// CORE BRAND COLORS - Main brand identity (Zietra Blue Theme)
// ============================================================================
export const BRAND_COLORS = {
  primary: {
    name: 'Primary Brand',
    gradient: 'from-sky-500 to-blue-600',
    hover: 'hover:from-sky-600 hover:to-blue-700',
    solid: 'bg-sky-500',
    text: 'text-sky-400',
    border: 'border-sky-500',
    ring: 'ring-sky-500',
    shadow: 'shadow-blue-500/30',
    lightBg: 'from-sky-50 to-blue-50',
    description: 'Main brand gradient - Zietra Blue Premium'
  },

  secondary: {
    name: 'Secondary Accent',
    gradient: 'from-blue-600 to-sky-600',
    hover: 'hover:from-blue-700 hover:to-sky-700',
    solid: 'bg-blue-600',
    text: 'text-blue-400',
    border: 'border-blue-600',
    ring: 'ring-blue-600',
    shadow: 'shadow-sky-500/30',
    lightBg: 'from-blue-50 to-sky-50',
    description: 'Secondary brand accent - Deep Blue'
  }
} as const;

// ============================================================================
// SEMANTIC COLORS - Functional color meanings
// ============================================================================
export const SEMANTIC_COLORS = {
  success: {
    name: 'Success',
    gradient: 'from-emerald-500 to-green-600',
    hover: 'hover:from-emerald-600 hover:to-green-700',
    solid: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500',
    shadow: 'shadow-emerald-500/30',
    lightBg: 'from-emerald-50 to-green-50',
    description: 'Success states - Growth & Prosperity'
  },

  warning: {
    name: 'Warning',
    gradient: 'from-amber-500 to-orange-600',
    hover: 'hover:from-amber-600 hover:to-orange-700',
    solid: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500',
    ring: 'ring-amber-500',
    shadow: 'shadow-amber-500/30',
    lightBg: 'from-amber-50 to-orange-50',
    description: 'Warning & Attention'
  },

  danger: {
    name: 'Danger',
    gradient: 'from-red-500 to-rose-600',
    hover: 'hover:from-red-600 hover:to-rose-700',
    solid: 'bg-red-500',
    text: 'text-red-400',
    border: 'border-red-500',
    ring: 'ring-red-500',
    shadow: 'shadow-red-500/30',
    lightBg: 'from-red-50 to-rose-50',
    description: 'Critical & Destructive actions'
  },

  info: {
    name: 'Information',
    gradient: 'from-sky-500 to-cyan-600',
    hover: 'hover:from-sky-600 hover:to-cyan-700',
    solid: 'bg-sky-500',
    text: 'text-sky-400',
    border: 'border-sky-500',
    ring: 'ring-sky-500',
    shadow: 'shadow-sky-500/30',
    lightBg: 'from-sky-50 to-violet-50',
    description: 'Information & Clarity'
  },

  premium: {
    name: 'Premium',
    gradient: 'from-sky-600 to-blue-600',
    hover: 'hover:from-sky-700 hover:to-blue-700',
    solid: 'bg-sky-600',
    text: 'text-sky-400',
    border: 'border-sky-600',
    ring: 'ring-sky-600',
    shadow: 'shadow-sky-500/30',
    lightBg: 'from-sky-50 to-blue-50',
    description: 'Premium & Exclusive features'
  }
} as const;

// ============================================================================
// PAGE-SPECIFIC COLORS - Unique colors for different sections
// ============================================================================
export const PAGE_COLORS = {
  // Settings Page Tabs
  settings: {
    profile: {
      gradient: 'from-sky-500 to-blue-600',
      shadow: 'shadow-sky-500/30',
      description: 'Profile - Professional & Trustworthy'
    },
    account: {
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/30',
      description: 'Account - Growth & Prosperity'
    },
    notifications: {
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/30',
      description: 'Notifications - Attention & Alerts'
    },
    security: {
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/30',
      description: 'Security - Protection & Trust'
    },
    preferences: {
      gradient: 'from-sky-400 to-blue-600',
      shadow: 'shadow-sky-500/30',
      description: 'Preferences - Personal & Custom'
    },
    billing: {
      gradient: 'from-red-500 to-rose-600',
      shadow: 'shadow-red-500/30',
      description: 'Billing - Financial & Important'
    }
  },

  // Super Admin Tabs
  superAdmin: {
    main: {
      gradient: 'from-red-500 to-rose-600',
      shadow: 'shadow-red-500/30',
      description: 'Super Admin - Power & Authority'
    }
  },

  // Dashboard Stats
  dashboard: {
    deals: {
      gradient: 'from-emerald-500 to-green-600',
      description: 'Deals - Revenue & Success'
    },
    contacts: {
      gradient: 'from-sky-500 to-blue-600',
      description: 'Contacts - Network & Connections'
    },
    companies: {
      gradient: 'from-cyan-500 to-sky-600',
      description: 'Companies - Business & Growth'
    },
    activities: {
      gradient: 'from-blue-500 to-sky-600',
      description: 'Activities - Energy & Action'
    }
  },

  // Campaign Stats
  campaigns: {
    sent: {
      gradient: 'from-sky-500 to-blue-600',
      lightBg: 'from-sky-50 to-blue-50',
      description: 'Sent - Delivered & Completed'
    },
    opened: {
      gradient: 'from-emerald-500 to-green-600',
      lightBg: 'from-emerald-50 to-green-50',
      description: 'Opened - Engagement & Interest'
    },
    clicked: {
      gradient: 'from-cyan-500 to-blue-600',
      lightBg: 'from-violet-50 to-blue-50',
      description: 'Clicked - Action & Conversion'
    },
    bounced: {
      gradient: 'from-amber-500 to-orange-600',
      lightBg: 'from-amber-50 to-orange-50',
      description: 'Bounced - Issues & Attention'
    }
  },

  // Pricing Plans
  pricing: {
    free: {
      gradient: 'from-gray-600 to-gray-800',
      hover: 'hover:from-gray-700 hover:to-gray-900',
      description: 'Free - Entry Level'
    },
    starter: {
      gradient: 'from-sky-500 to-blue-600',
      hover: 'hover:from-sky-600 hover:to-blue-700',
      shadow: 'shadow-sky-500/30',
      description: 'Starter - Getting Started'
    },
    professional: {
      gradient: 'from-blue-500 to-sky-600',
      hover: 'hover:from-blue-600 hover:to-sky-700',
      shadow: 'shadow-blue-500/30',
      description: 'Professional - Most Popular'
    },
    enterprise: {
      gradient: 'from-cyan-600 to-blue-700',
      hover: 'hover:from-cyan-700 hover:to-blue-800',
      shadow: 'shadow-cyan-500/30',
      description: 'Enterprise - Premium & Unlimited'
    }
  },

  // AI Assistant
  aiAssistant: {
    header: {
      gradient: 'from-sky-600 to-blue-600',
      description: 'AI - Intelligence & Innovation'
    },
    success: {
      lightBg: 'from-emerald-50 to-sky-50',
      description: 'AI Success state'
    }
  }
} as const;

// ============================================================================
// NEUTRAL COLORS - Backgrounds, borders, text
// ============================================================================
export const NEUTRAL_COLORS = {
  background: {
    page: 'from-gray-50 via-sky-50/30 to-blue-50/30',
    card: 'bg-white',
    subtle: 'from-gray-50 to-gray-100',
    description: 'Page backgrounds - Dark Glass'
  },

  border: {
    default: 'border-gray-200',
    hover: 'hover:border-gray-300',
    focus: 'focus:border-sky-500',
    description: 'Borders & Dividers'
  },

  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    white: 'text-white',
    description: 'Text colors - Hierarchy & Readability'
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get gradient class for a button with full styling
 */
export function getButtonGradient(type: keyof typeof BRAND_COLORS | keyof typeof SEMANTIC_COLORS) {
  const color = (BRAND_COLORS[type as keyof typeof BRAND_COLORS] || SEMANTIC_COLORS[type as keyof typeof SEMANTIC_COLORS]);
  return `bg-gradient-to-r ${color.gradient} ${color.hover} text-white shadow-lg ${color.shadow} hover:shadow-xl transition-all duration-200`;
}

/**
 * Get gradient background for cards/sections
 */
export function getCardGradient(type: keyof typeof BRAND_COLORS | keyof typeof SEMANTIC_COLORS) {
  const color = (BRAND_COLORS[type as keyof typeof BRAND_COLORS] || SEMANTIC_COLORS[type as keyof typeof SEMANTIC_COLORS]);
  return `bg-gradient-to-br ${color.lightBg}`;
}

/**
 * Get icon gradient for stat cards
 */
export function getIconGradient(type: keyof typeof BRAND_COLORS | keyof typeof SEMANTIC_COLORS) {
  const color = (BRAND_COLORS[type as keyof typeof BRAND_COLORS] || SEMANTIC_COLORS[type as keyof typeof SEMANTIC_COLORS]);
  return `bg-gradient-to-br ${color.gradient}`;
}

// ============================================================================
// THEME PRESETS - One-command theme changes
// ============================================================================

export const THEME_PRESETS = {
  default: {
    name: 'Zietra Blue',
    description: 'Dark glassmorphism with indigo-purple accents',
    colors: BRAND_COLORS
  },

  ocean: {
    name: 'Ocean Breeze',
    description: 'Cool blues and teals for a calm, professional feel',
    primary: 'from-blue-500 to-cyan-600',
    secondary: 'from-teal-500 to-blue-600'
  },

  sunset: {
    name: 'Sunset Vibes',
    description: 'Warm oranges and pinks for energy and creativity',
    primary: 'from-orange-500 to-pink-600',
    secondary: 'from-red-500 to-orange-600'
  },

  forest: {
    name: 'Forest Fresh',
    description: 'Greens and earthy tones for growth and stability',
    primary: 'from-green-600 to-emerald-600',
    secondary: 'from-emerald-500 to-teal-600'
  },

  royal: {
    name: 'Royal Purple',
    description: 'Deep purples for luxury and premium feel',
    primary: 'from-blue-600 to-sky-700',
    secondary: 'from-cyan-600 to-blue-700'
  },

  midnight: {
    name: 'Midnight Dark',
    description: 'Dark blues and purples for a modern, sleek look',
    primary: 'from-sky-700 to-blue-800',
    secondary: 'from-blue-800 to-sky-900'
  }
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================
export default {
  brand: BRAND_COLORS,
  semantic: SEMANTIC_COLORS,
  page: PAGE_COLORS,
  neutral: NEUTRAL_COLORS,
  presets: THEME_PRESETS,
  utils: {
    getButtonGradient,
    getCardGradient,
    getIconGradient
  }
};
