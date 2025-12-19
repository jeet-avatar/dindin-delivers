/**
 * Dollor.ai Theme Configuration
 *
 * Central export for all theme tokens.
 * BASE: iOS Design (eatfair-ios)
 *
 * Usage:
 * import { DollorTheme } from '@/app/theme';
 * import { DollorTheme } from '@/app/theme/DollorTheme';
 *
 * Access colors like: DollorTheme.Brand.green
 */

// Main unified theme (USE THIS)
export { default as DollorTheme, cssVariables as themeCssVariables } from './DollorTheme';

// Legacy exports for backward compatibility
export { default as BrandColors, cssVariables } from './colors';
export { default as Typography, systemFontStack, displayFontStack, bodyFontStack, typographyCssVariables } from './typography';

// Re-export individual colors for convenience
export {
  BrandColors as Colors,
} from './colors';
