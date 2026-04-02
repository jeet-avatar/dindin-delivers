export interface Product {
  slug: string
  name: string
  tagline: string
  description: string
  url: string
  features: string[]
  iconBg: string
  iconColor: string
  accentGrad: string
}

export const products: Product[] = [
  {
    slug: 'brandmonkz',
    name: 'BrandMonkz',
    tagline: 'AI-Powered CRM & Campaign Management',
    description: 'A full-featured CRM platform built for modern sales and marketing teams. BrandMonkz combines contact management, email campaign automation, deal pipeline tracking, and AI-powered analytics — all in one platform. Manage multi-tenant teams, run targeted email campaigns with SMTP integration, track lead sources, and close deals faster with intelligent pipeline insights.',
    url: 'https://brandmonkz.com',
    features: [
      'Contact & Lead Management with smart tagging',
      'Email Campaign Automation (SMTP-powered)',
      'Deal Pipeline with stage tracking & forecasting',
      'Multi-tenant team management',
      'AI-powered analytics & lead scoring',
      'Campaign performance dashboards',
      'Custom email templates & scheduling',
      'Lead source tracking & attribution',
    ],
    iconBg: 'rgba(249,115,22,0.12)',
    iconColor: '#FB923C',
    accentGrad: 'from-orange-500 to-amber-500',
  },
  {
    slug: 'beatmind',
    name: 'BeatMind',
    tagline: 'AI Music Production Assistant',
    description: 'An AI-powered SaaS platform for music producers and beatmakers. BeatMind connects to your DAW (Ableton Live, Logic Pro, FL Studio) and provides intelligent assistance for music production — from sound design suggestions and mix analysis to arrangement recommendations and creative inspiration. Built for producers who want AI that understands music.',
    url: 'https://beatmind.io',
    features: [
      'AI-powered music production assistance',
      'DAW integration (Ableton, Logic, FL Studio)',
      'Intelligent sound design suggestions',
      'Mix analysis & recommendations',
      'Arrangement & structure guidance',
      'Creative inspiration engine',
      'Real-time production feedback',
      'Pro subscription with unlimited access',
    ],
    iconBg: 'rgba(139,92,246,0.12)',
    iconColor: '#A78BFA',
    accentGrad: 'from-purple-500 to-pink-500',
  },
  {
    slug: 'vibingticket',
    name: 'VibingTicket',
    tagline: 'Next-Gen Event Ticketing Platform',
    description: 'A modern event ticketing and management platform that makes selling tickets, managing events, and engaging attendees effortless. VibingTicket handles everything from event creation and ticket sales to check-in management and post-event analytics. Built for event organizers, venues, promoters, and artists who want a seamless, branded ticketing experience.',
    url: 'https://vibingticket.com',
    features: [
      'Event creation & management dashboard',
      'Branded ticket sales pages',
      'QR code check-in & scanning',
      'Real-time sales analytics',
      'Multi-tier pricing & promo codes',
      'Attendee engagement tools',
      'Payout management for organizers',
      'Mobile-first responsive design',
    ],
    iconBg: 'rgba(6,182,212,0.12)',
    iconColor: '#22D3EE',
    accentGrad: 'from-cyan-500 to-blue-500',
  },
]
