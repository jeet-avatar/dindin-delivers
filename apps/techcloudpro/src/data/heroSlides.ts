export type BadgeVariant = 'hot' | 'new' | 'trend'

export interface HeroCard {
  icon: string
  iconColor: string
  title: string
  subtitle: string
  metric?: { value: string; label: string }
  tag?: { label: string; variant: BadgeVariant }
  barWidth?: string
  barColor: string
}

export interface HeroSlide {
  badge: { label: string; variant: BadgeVariant; icon: string }
  heading: string
  gradientText: string
  gradientClass: string
  lead: string
  pills: { label: string; variant: string }[]
  ctaText: string
  ctaHref: string
  ctaColor: 'orange' | 'blue'
  cards: HeroCard[]
}

export const heroSlides: HeroSlide[] = [
  {
    badge: { label: 'AI-Powered Enterprise Solutions', variant: 'new', icon: 'Sparkles' },
    heading: 'We Build ',
    gradientText: 'Intelligent Products',
    gradientClass: 'grad-text-blue',
    lead: 'From private LLM deployment to AI-powered CRM, music production intelligence to event platforms — we don\'t just consult, we build. Meet BrandMonkz, BeatMind, and VibingTicket.',
    pills: [
      { label: 'Private LLM Deployment', variant: 'fire' },
      { label: 'BrandMonkz CRM', variant: 'gem' },
      { label: 'BeatMind AI', variant: 'bolt' },
      { label: 'VibingTicket', variant: 'leaf' },
      { label: 'Agentic AI', variant: 'fire' },
      { label: 'Enterprise RAG', variant: 'default' },
    ],
    ctaText: 'Explore Our AI & Products',
    ctaHref: '/products',
    ctaColor: 'blue',
    cards: [
      { icon: 'Brain', iconColor: 'blue', title: 'Private AI Deploy', subtitle: 'LLMs inside your VPN — zero data leakage', metric: { value: '50K+', label: 'Docs/Day' }, tag: { label: 'Enterprise', variant: 'new' }, barColor: 'blue' },
      { icon: 'Zap', iconColor: 'orange', title: 'BrandMonkz CRM', subtitle: 'AI-powered campaigns, pipeline, lead scoring', tag: { label: 'Live Product', variant: 'hot' }, barWidth: '85%', barColor: 'orange' },
      { icon: 'Music', iconColor: 'purple', title: 'BeatMind + VibingTicket', subtitle: 'AI music assistant & event ticketing platform', tag: { label: 'Our Products', variant: 'trend' }, barColor: 'purple' },
    ],
  },
  {
    badge: { label: 'NetSuite Next Is Here', variant: 'hot', icon: 'Zap' },
    heading: 'The Future of ',
    gradientText: 'Cloud ERP',
    gradientClass: 'grad-text-purple',
    lead: 'NetSuite Next brings AI-powered analytics and predictive planning. As a Certified Solutions Provider with 1000+ implementations, we\'re your fastest path to next-gen ERP.',
    pills: [
      { label: 'NetSuite Next 2026', variant: 'fire' },
      { label: 'AI-Powered Analytics', variant: 'gem' },
      { label: 'Predictive Planning', variant: 'bolt' },
      { label: 'SuiteCloud AI', variant: 'leaf' },
      { label: 'OneWorld', variant: 'default' },
      { label: 'SuiteSpots\u2122', variant: 'default' },
    ],
    ctaText: 'Explore NetSuite Services',
    ctaHref: '/services/netsuite',
    ctaColor: 'orange',
    cards: [
      { icon: 'Monitor', iconColor: 'purple', title: 'NetSuite Next', subtitle: 'AI-driven ERP with predictive insights', metric: { value: '94%', label: 'Faster Close' }, tag: { label: '2026 Release', variant: 'new' }, barColor: 'purple' },
      { icon: 'Globe', iconColor: 'cyan', title: 'OneWorld Global', subtitle: 'Multi-subsidiary, multi-currency', barWidth: '88%', barColor: 'cyan', tag: { label: '+32% Adoption YoY', variant: 'trend' } },
      { icon: 'Wrench', iconColor: 'orange', title: 'SuiteSpots\u2122', subtitle: 'Custom connectors for Shopify, Magento, any app', barColor: 'orange', tag: { label: 'In Demand', variant: 'hot' } },
    ],
  },
  {
    badge: { label: 'Identity Is the New Perimeter', variant: 'new', icon: 'Shield' },
    heading: 'Secure the ',
    gradientText: 'AI Era',
    gradientClass: 'grad-text-orange',
    lead: 'AI agents are the new attack surface. CyberArk-powered identity security, machine identity management, and post-quantum readiness — from the team that\'s been in the trenches since day one.',
    pills: [
      { label: 'Agentic AI Security', variant: 'fire' },
      { label: 'Machine Identity Mgmt', variant: 'gem' },
      { label: 'Zero Trust Architecture', variant: 'bolt' },
      { label: 'Post-Quantum Ready', variant: 'leaf' },
      { label: 'CyberArk PAM', variant: 'default' },
      { label: 'SOC 2 / HIPAA', variant: 'default' },
    ],
    ctaText: 'Explore Security Services',
    ctaHref: '/services/cybersecurity',
    ctaColor: 'blue',
    cards: [
      { icon: 'Shield', iconColor: 'red', title: 'AI Agent Security', subtitle: 'Treat AI agents as identities — least privilege, full audit trail', metric: { value: '0', label: 'Breaches' }, tag: { label: 'Critical in 2026', variant: 'hot' }, barColor: 'red' },
      { icon: 'Sparkles', iconColor: 'blue', title: 'Private LLM Deploy', subtitle: 'Your models, your VPN, zero data leakage', barWidth: '92%', barColor: 'blue', tag: { label: 'VPN-Only', variant: 'new' } },
      { icon: 'CheckCircle', iconColor: 'green', title: 'Compliance Ready', subtitle: 'SOC 2, HIPAA, GDPR, ISO 27001', barColor: 'green', tag: { label: 'All Frameworks', variant: 'trend' } },
    ],
  },
  {
    badge: { label: '2026 Hiring Trends', variant: 'trend', icon: 'Users' },
    heading: 'Top Talent, ',
    gradientText: 'On Demand',
    gradientClass: 'grad-text-green',
    lead: 'AI skills gap is widening. NetSuite consultants are in record demand. Cybersecurity roles take 6+ months to fill. We deliver pre-vetted, certified talent — contract, permanent, or dedicated teams — in weeks, not months.',
    pills: [
      { label: 'AI/ML Engineers', variant: 'fire' },
      { label: 'NetSuite Certified', variant: 'gem' },
      { label: 'CyberArk Specialists', variant: 'bolt' },
      { label: 'Solution Architects', variant: 'leaf' },
      { label: 'Project Managers', variant: 'default' },
      { label: 'DevOps / Cloud', variant: 'default' },
    ],
    ctaText: 'Explore Staffing Solutions',
    ctaHref: '/services/staffing',
    ctaColor: 'orange',
    cards: [
      { icon: 'TrendingUp', iconColor: 'green', title: 'Talent Demand Index', subtitle: 'NetSuite + AI roles at all-time high', metric: { value: '3.2x', label: 'YoY Growth' }, tag: { label: 'Rising Fast', variant: 'trend' }, barColor: 'green' },
      { icon: 'Clock', iconColor: 'orange', title: 'Time to Hire', subtitle: 'Industry avg: 6+ months. With us: 2-4 weeks.', barWidth: '25%', barColor: 'orange', tag: { label: '4x Faster', variant: 'hot' } },
      { icon: 'BookOpen', iconColor: 'purple', title: 'Certifications', subtitle: 'NetSuite, CyberArk, AWS, Azure certified pool', barColor: 'purple', tag: { label: 'Pre-Vetted', variant: 'trend' } },
    ],
  },
]
