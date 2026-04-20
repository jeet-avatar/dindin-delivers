/**
 * Application Default Values
 * Centralized default values for various entities
 */

export const DEFAULTS = {
  // Contact defaults
  contact: {
    status: process.env.DEFAULT_CONTACT_STATUS || 'LEAD',
  },

  // Activity defaults
  activity: {
    type: process.env.DEFAULT_ACTIVITY_TYPE || 'NOTE',
    priority: process.env.DEFAULT_PRIORITY || 'MEDIUM',
  },

  // Deal defaults
  deal: {
    stage: process.env.DEFAULT_DEAL_STAGE || 'PROSPECTING',
    probability: Number.parseInt(process.env.DEFAULT_DEAL_PROBABILITY || '10'),
  },

  // Tag defaults
  tag: {
    color: process.env.DEFAULT_TAG_COLOR || '#3B82F6',
  },

  // User defaults
  user: {
    role: process.env.DEFAULT_USER_ROLE || 'USER',
  },

  // Password defaults
  password: {
    minLength: Number.parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
    generatedLength: Number.parseInt(process.env.GENERATED_PASSWORD_LENGTH || '12'),
  },

  // Analytics defaults
  analytics: {
    defaultDays: Number.parseInt(process.env.DEFAULT_ANALYTICS_DAYS || '30'),
    monthsToShow: Number.parseInt(process.env.ANALYTICS_MONTHS || '12'),
    topSourcesCount: Number.parseInt(process.env.TOP_SOURCES_COUNT || '5'),
  },

  // Trial defaults
  trial: {
    days: Number.parseInt(process.env.FREE_TRIAL_DAYS || '14'),
  },
};
