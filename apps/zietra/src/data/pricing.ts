export interface PricingTier {
  id: string
  name: string
  price: number | 'Custom'
  period?: string
  badge?: string
  featured?: boolean
  cta: string
  features: string[]
}

export const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    period: '/mo',
    cta: 'Start free',
    features: [
      'Full CRM — unlimited contacts',
      'Social scheduling — 3 platforms',
      'Zietra Meet — unlimited calls',
      '100 AI credits / month',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    period: '/mo',
    badge: 'Most Popular',
    featured: true,
    cta: 'Start free trial',
    features: [
      'Everything in Starter',
      'Social scheduling — all platforms',
      'Campaign email sends — 10K/mo',
      '2,000 AI credits / month',
      'Video recording (1 hour)',
      'AI Strategy Bot',
      'Priority support',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 149,
    period: '/mo',
    cta: 'Contact sales',
    features: [
      'Everything in Growth',
      'Unlimited AI credits',
      'Campaign sends — unlimited',
      'Video recording — unlimited',
      'Multi-seat (up to 10 users)',
      'Custom integrations',
      'Dedicated onboarding',
      'SLA support',
    ],
  },
]
