/**
 * Dollor.ai Brand Colors - MUST MATCH iOS Theme.swift EXACTLY
 *
 * iOS Reference (Source of Truth):
 * - Theme.brandGreen = #06C167 (Primary brand color)
 * - Theme.brandOrange = #F2994A (Secondary/accent color)
 * - Theme.brandGrey = #F5F5F5 (Background)
 * - Theme.textGrey = Gray (Text secondary)
 * - Theme.brandBlack = #101010 (Text primary)
 *
 * IMPORTANT: These values are synced with:
 * - iOS: eatfair-ios-shared/Sources/EatFairShared/Theme.swift
 * - Android: app/src/main/java/com/eatfair/app/ui/theme/Color.kt
 */

// Brand Colors - Match iOS Theme.swift exactly
export const BrandColors = {
  // Primary Brand Color - Used for buttons, links, highlights
  brandGreen: '#06C167',
  brandGreenLight: '#4ADE80',
  brandGreenDark: '#059669',

  // Secondary/Accent Color - Used for welcome screen gradients
  brandOrange: '#F2994A',
  brandOrangeLight: '#FFB876',
  brandOrangeDark: '#D97706',

  // Background Colors
  brandGrey: '#F5F5F5',
  brandGreyLight: '#FAFAFA',
  brandGreyDark: '#E5E5E5',

  // Text Colors
  brandBlack: '#101010',
  textGrey: '#757575',
  textGreyLight: '#9CA3AF',

  // White
  brandWhite: '#FFFFFF',

  // Gold - For $ logo and premium accents
  gold: '#FFD700',
  goldLight: '#FFE066',
  goldDark: '#D4AF37',

  // Blue - For ride/info elements
  brandBlue: '#3B82F6',

  // Status Colors
  success: '#06C167',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // AI Feature Colors
  aiPurple: '#9C27B0',
  aiPink: '#E91E63',

  // Deal/Promo Colors
  dealOrange: '#FF6D00',
  dealRed: '#FF5252',
  promoOrange: '#FF6D00',
  promoRed: '#FF5252',
};

// CSS Variables for easy theming
export const cssVariables = `
  :root {
    --brand-green: ${BrandColors.brandGreen};
    --brand-green-light: ${BrandColors.brandGreenLight};
    --brand-green-dark: ${BrandColors.brandGreenDark};
    --brand-orange: ${BrandColors.brandOrange};
    --brand-orange-light: ${BrandColors.brandOrangeLight};
    --brand-blue: ${BrandColors.brandBlue};
    --brand-grey: ${BrandColors.brandGrey};
    --brand-black: ${BrandColors.brandBlack};
    --text-grey: ${BrandColors.textGrey};
    --brand-white: ${BrandColors.brandWhite};
    --gold: ${BrandColors.gold};
  }
`;

export default BrandColors;
