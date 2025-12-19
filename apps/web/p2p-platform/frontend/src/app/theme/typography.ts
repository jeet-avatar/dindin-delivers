/**
 * Dollor.ai Typography Configuration
 *
 * Cross-Platform Font Stack:
 * - iOS: SF Pro (system default)
 * - Android: Roboto (body) + Rubik (display)
 * - Web: System font stack with fallbacks
 *
 * IMPORTANT: These values are synced with:
 * - iOS: System fonts (SF Pro automatically)
 * - Android: app/src/main/java/com/eatfair/app/ui/theme/Type.kt
 */

// System font stack - renders native fonts on each platform
export const systemFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Roboto, "Helvetica Neue", Arial, sans-serif';

// Display font for headings (matches Android Rubik)
export const displayFontStack = '"Rubik", -apple-system, BlinkMacSystemFont, "SF Pro Display", Roboto, Arial, sans-serif';

// Body font for text (matches Android Roboto)
export const bodyFontStack = 'Roboto, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

// Typography scale matching Material Design 3 / iOS HIG
export const Typography = {
  // Display - Large headings
  displayLarge: {
    fontFamily: displayFontStack,
    fontSize: '57px',
    lineHeight: '64px',
    fontWeight: 400,
  },
  displayMedium: {
    fontFamily: displayFontStack,
    fontSize: '45px',
    lineHeight: '52px',
    fontWeight: 400,
  },
  displaySmall: {
    fontFamily: displayFontStack,
    fontSize: '36px',
    lineHeight: '44px',
    fontWeight: 400,
  },

  // Headline - Section headings
  headlineLarge: {
    fontFamily: displayFontStack,
    fontSize: '32px',
    lineHeight: '40px',
    fontWeight: 600,
  },
  headlineMedium: {
    fontFamily: displayFontStack,
    fontSize: '28px',
    lineHeight: '36px',
    fontWeight: 600,
  },
  headlineSmall: {
    fontFamily: displayFontStack,
    fontSize: '24px',
    lineHeight: '32px',
    fontWeight: 600,
  },

  // Title - Card titles, dialogs
  titleLarge: {
    fontFamily: displayFontStack,
    fontSize: '22px',
    lineHeight: '28px',
    fontWeight: 500,
  },
  titleMedium: {
    fontFamily: displayFontStack,
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 500,
  },
  titleSmall: {
    fontFamily: displayFontStack,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 500,
  },

  // Body - Main content
  bodyLarge: {
    fontFamily: bodyFontStack,
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 400,
  },
  bodyMedium: {
    fontFamily: bodyFontStack,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 400,
  },
  bodySmall: {
    fontFamily: bodyFontStack,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 400,
  },

  // Label - Buttons, captions
  labelLarge: {
    fontFamily: bodyFontStack,
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: 500,
  },
  labelMedium: {
    fontFamily: bodyFontStack,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 500,
  },
  labelSmall: {
    fontFamily: bodyFontStack,
    fontSize: '11px',
    lineHeight: '16px',
    fontWeight: 500,
  },
};

// CSS Variables for typography
export const typographyCssVariables = `
  :root {
    --font-family-system: ${systemFontStack};
    --font-family-display: ${displayFontStack};
    --font-family-body: ${bodyFontStack};
  }
`;

export default Typography;
