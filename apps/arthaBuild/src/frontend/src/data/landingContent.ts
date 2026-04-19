// All public-facing copy for the ArthaBuild landing page.
// Keeps strings out of JSX so copy can evolve without layout changes.
// NO pricing, NO tier names, NO per-tier limits — two paths only:
//   (a) Try Free  (b) Talk to Sales (enterprise).

import {
  TRY_FREE_HREF,
  TALK_TO_SALES_HREF,
  LOG_IN_HREF,
  BLOG_HREF,
  SOLUTIONS_HREF,
  PRIVACY_HREF,
  TERMS_HREF,
  SECTION_IDS,
  SALES_EMAIL,
  COMPANY_LEGAL,
  COPYRIGHT_YEAR,
} from '../lib/landingLinks';

export type CtaKind = 'primary' | 'ghost';
export interface Cta { label: string; href: string; kind: CtaKind; external?: boolean; }

export const PRIMARY_CTAS: Cta[] = [
  { label: 'Try Free',       href: TRY_FREE_HREF,      kind: 'primary' },
  { label: 'Talk to Sales',  href: TALK_TO_SALES_HREF, kind: 'ghost', external: true },
];

// ── NAV ────────────────────────────────────────────────────────────
export const NAV = {
  logo: 'ArthaBuild',
  links: [
    { label: 'How It Works',  href: `#${SECTION_IDS.howItWorks}` },
    { label: 'Built For You', href: `#${SECTION_IDS.builtFor}` },
    { label: 'Deploy',        href: `#${SECTION_IDS.deploy}` },
    { label: 'Solutions',     href: SOLUTIONS_HREF,   internal: true },
    { label: 'Blog',          href: BLOG_HREF,        internal: true },
  ],
  login:  { label: 'Log in',   href: LOG_IN_HREF },
  cta:    { label: 'Try Free', href: TRY_FREE_HREF },
};

// ── HERO ───────────────────────────────────────────────────────────
export const HERO = {
  eyebrow:  'NetSuite Automation for Small Business',
  headline: { line1: 'Automate', line2: 'NetSuite.', accent: 'Cut Costs 80%.' },
  subcopy:
    'Turn plain-English business requirements into deployed SuiteScript — ' +
    'in seconds. No developer. No consultant. No waiting.',
  ctas: PRIMARY_CTAS,
  mockup: {
    header: 'ArthaBuild  ·  NetSuite AI',
    lines: [
      { delay: 700,  kind: 'user' as const,
        text: 'When a PO is approved, auto-email the vendor and update the inventory ledger.' },
      { delay: 1800, kind: 'agent' as const,
        text: 'Generating PO approval workflow + vendor notification script…' },
      { delay: 3200, kind: 'code' as const, text: '' },  // rendered inline in JSX
      { delay: 5200, kind: 'success' as const,
        text: '✓ Script validated. Deployed to Sandbox in 9 seconds.' },
    ],
  },
};

// ── STATS ──────────────────────────────────────────────────────────
// Note: No price claims. "∞ / Scripts per Month" replaces "$0 Developer Fees".
export const STATS: Array<{ value: string; target?: number; suffix?: string; label: string }> = [
  { value: '0%',   target: 80, suffix: '%', label: 'Cost Reduction' },
  { value: '<30s',                             label: 'Deploy Time' },
  { value: '24/7',                             label: 'Always Available' },
  { value: 'BYOC',                             label: 'Private Cloud' },
];

// ── PROBLEM + COMPARISON ───────────────────────────────────────────
export const PROBLEM = {
  eyebrow: 'The NetSuite Tax',
  title:   { prefix: 'Great software.', accent: 'Brutal price to customise.' },
  copy: [
    'NetSuite is one of the most powerful ERP platforms on earth — but unlocking ' +
    'that power has always required expensive specialists that small businesses ' +
    'simply cannot afford to keep on staff.',
    'The average automation script takes a consultant 4–8 hours to build. ' +
    "At $200/hr, that's $800–$1,600 for a single workflow — before revisions. " +
    'ArthaBuild builds the same script in under a minute, every time.',
  ],
  cta: { label: 'Try Free →', href: TRY_FREE_HREF, kind: 'primary' as CtaKind },
  // Competitor benchmarks (not our pricing). Last row intentionally vague.
  comparison: [
    { label: 'NetSuite Developer (hire)',      cost: '$120,000–$180,000/yr', bad: true  },
    { label: 'NetSuite Consultant (hourly)',   cost: '$150–$250/hr',         bad: true  },
    { label: 'Implementation Partner',         cost: '$20,000–$80,000/project', bad: true },
    { label: 'ArthaBuild',                     cost: 'Self-serve or enterprise — talk to us', bad: false },
  ],
};

// ── HOW IT WORKS (bento) ───────────────────────────────────────────
export const HOW_IT_WORKS = {
  eyebrow: 'How ArthaBuild Works',
  title:   { prefix: 'Describe it in English.', accent: 'Deploy it in seconds.' },
  cards: [
    {
      wide: true,
      iconPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
      title: 'Ask in Plain English',
      body:
        'No coding. No SuiteScript syntax. No manuals. Just describe what your ' +
        'business needs and ArthaBuild writes the production-ready script ' +
        'automatically.',
    },
    {
      wide: false,
      iconPath: 'M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9 2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9 2.83-2.83',
      title: 'Schema-Aware Intelligence',
      body: 'Understands YOUR custom records, fields, and workflows — not just the generic NetSuite.',
    },
    {
      wide: true,
      iconPath: 'M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17',
      title: 'One-Click Sandbox Deployment',
      body:
        'Push audited SuiteScript directly to your NetSuite staging environment ' +
        'from the chat window. TBA credentials stay in RAM — never written to disk.',
    },
    {
      wide: false,
      iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      title: 'Governor-Limit Safe',
      body: 'Every script is pre-checked for NetSuite governance, usage limits, and best practices.',
    },
  ],
};

// ── BUILT FOR YOU (merged: who + security) ─────────────────────────
export const BUILT_FOR_YOU = {
  eyebrow: 'Built For Teams',
  title:   { prefix: 'For founders, operators,', accent: 'and secure by default.' },
  subcopy: "You don't need to write SuiteScript. You just need to know your business.",
  cards: [
    { icon: '🏢', tag: 'Owners',      title: 'Small Business',
      body: 'Cancel the consultant contract. ArthaBuild runs your automations in-house.' },
    { icon: '⚡',  tag: '10× Faster',  title: 'Operations Teams',
      body: 'Go from waiting 3 weeks for dev sprints to shipping the same afternoon.' },
    { icon: '💼', tag: '3× Capacity', title: 'NetSuite Consultants',
      body: 'Build in under an hour what used to take 2 days. Triple your client throughput.' },
    { icon: '🔒', tag: 'Local AI',    title: 'On Your Hardware',
      body: 'Ollama runs entirely on your GPU. Zero calls to OpenAI, Anthropic, or external services.' },
    { icon: '🛡️', tag: 'RAM-Only',    title: 'Memory-Only Credentials',
      body: 'NetSuite TBA tokens live in RAM. Session ends, they are gone. Never on disk, never in logs.' },
    { icon: '☁️', tag: 'BYOC',        title: 'Your Cloud, Your Control',
      body: 'One Docker Compose drops into your AWS, GCP, or Azure account. SOC2-ready architecture.' },
  ],
};

// ── DEPLOY (steps + cloud logos) ───────────────────────────────────
export const DEPLOY = {
  eyebrow: 'Deployment Model',
  title:   { prefix: 'We deploy inside', accent: 'your cloud. Not ours.' },
  subcopy:
    'ArthaBuild provisions a private instance inside your AWS, GCP, or Azure ' +
    'account. Your data never leaves your VPC.',
  steps: [
    { step: '01', icon: '🔑', title: 'You Create an IAM Role',
      desc: 'Least-privilege IAM role (AWS), Service Account (GCP), or App Registration (Azure). Scoped only to provision one VM.' },
    { step: '02', icon: '⚙️', title: 'We Provision the Instance',
      desc: 'GPU-enabled VM spun up inside your VPC and region. No data crosses regions.' },
    { step: '03', icon: '🐳', title: 'Docker Compose Deploys',
      desc: 'ArthaBuild + Ollama + nginx as one Compose stack. Live in under 20 minutes.' },
    { step: '04', icon: '🚀', title: 'Your Team Goes Live',
      desc: 'Invite your team, connect NetSuite TBA. Every inference call stays inside your VPC.' },
  ],
  clouds: [
    { name: 'AWS',   color: '#FF9900', icon: '☁️', detail: 'EC2 / VPC / Route 53' },
    { name: 'GCP',   color: '#4285F4', icon: '🌐', detail: 'Compute Engine / VPC' },
    { name: 'Azure', color: '#0078D4', icon: '⬡',  detail: 'VM / VNET / AKS' },
  ],
};

// ── FINAL CTA (merged contact + bottom) ────────────────────────────
export const FINAL_CTA = {
  headline: { prefix: 'The smartest hire', accent: "you'll never make." },
  subcopy:
    'Zero developer contracts. Zero consultant invoices. Just your business, ' +
    'automated — deployed inside your own infrastructure.',
  ctas: PRIMARY_CTAS,
  footnote: `BYOC deployment  ·  ${SALES_EMAIL}`,
};

// ── FOOTER ─────────────────────────────────────────────────────────
export const FOOTER = {
  tagline:
    'The AI that automates NetSuite for small business. ' +
    'No developers. No consultants. Just results.',
  attribution: `A product of ${COMPANY_LEGAL}`,
  copyright:   `© ${COPYRIGHT_YEAR} ${COMPANY_LEGAL}. All rights reserved.`,
  disclaimer:  'ArthaBuild is not affiliated with Oracle NetSuite.',
  columns: [
    {
      heading: 'Platform',
      links: [
        { label: 'How It Works',  href: `#${SECTION_IDS.howItWorks}` },
        { label: 'Built For You', href: `#${SECTION_IDS.builtFor}` },
        { label: 'Deploy',        href: `#${SECTION_IDS.deploy}` },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Try Free',       href: TRY_FREE_HREF, internal: true },
        { label: 'Log In',         href: LOG_IN_HREF,   internal: true },
        { label: 'Blog',           href: BLOG_HREF,     internal: true },
        { label: 'Solutions',      href: SOLUTIONS_HREF, internal: true },
        { label: 'Privacy Policy', href: PRIVACY_HREF,  internal: true },
        { label: 'Terms of Service', href: TERMS_HREF,  internal: true },
        { label: 'Talk to Sales',  href: TALK_TO_SALES_HREF, external: true },
      ],
    },
  ],
};
