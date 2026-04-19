// All outbound URLs + contact addresses used by the public landing page.
// Env-driven so staging / enterprise deployments can override without code changes.

const env = import.meta.env as Record<string, string | undefined>;

export const SALES_EMAIL      = env.VITE_SALES_EMAIL      || 'sales@artha.build';
export const SALES_CALENDAR   = env.VITE_SALES_CALENDAR   || 'https://calendar.app.google/hMxn4pJi3bKXBtjp6';
export const SUPPORT_EMAIL    = env.VITE_SUPPORT_EMAIL    || 'support@artha.build';
export const PRIVACY_EMAIL    = env.VITE_PRIVACY_EMAIL    || 'privacy@artha.build';
export const COMPANY_LEGAL    = env.VITE_COMPANY_LEGAL    || 'Vibing World inc.';
export const COMPANY_SHORT    = env.VITE_COMPANY_SHORT    || 'Vibing World';
export const COPYRIGHT_YEAR   = env.VITE_COPYRIGHT_YEAR   || String(new Date().getFullYear());

export const TRY_FREE_HREF      = '/create-account';
export const LOG_IN_HREF        = '/log-in';
export const BLOG_HREF          = '/blog';
export const SOLUTIONS_HREF     = '/solutions';
export const PRIVACY_HREF       = '/privacy';
export const TERMS_HREF         = '/terms';
export const TALK_TO_SALES_HREF = SALES_CALENDAR;
export const SALES_MAILTO       = `mailto:${SALES_EMAIL}`;

export const SECTION_IDS = {
  problem: 'problem',
  howItWorks: 'how-it-works',
  builtFor: 'built-for',
  deploy: 'deploy',
  cta: 'cta',
} as const;
