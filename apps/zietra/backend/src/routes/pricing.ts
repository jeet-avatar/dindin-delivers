import { Router } from 'express';

const router = Router();

// GET /api/pricing/config - Get pricing page configuration
router.get('/config', async (req, res) => {
  try {
    // In a real application, this would fetch from database
    // For now, returning the configuration that can be customized via admin UI
    const pricingData = {
      config: {
        brandName: process.env.BRAND_NAME || 'Zietra',
        trustBadgeText: process.env.TRUST_BADGE_TEXT || 'Trusted by 10,000+ businesses worldwide',
        businessCount: process.env.BUSINESS_COUNT || '10,000+',
        salesEmail: process.env.SALES_EMAIL || process.env.SES_FROM_EMAIL || 'noreply@zietra.com',
        trialDays: process.env.TRIAL_DAYS || '14',
        annualSavings: process.env.ANNUAL_SAVINGS || '17%',
        headline: process.env.PRICING_HEADLINE || 'Simple, transparent pricing for everyone',
        subheadline: process.env.PRICING_SUBHEADLINE || 'Choose the perfect plan for your business. Start with a free trial and scale as you grow.',
        ctaHeadline: process.env.CTA_HEADLINE || 'Ready to transform your business?',
        ctaSubheadline: process.env.CTA_SUBHEADLINE || 'Join {businessCount} businesses using {brandName} to grow faster and smarter',
        faqSectionTitle: process.env.FAQ_SECTION_TITLE || 'Frequently Asked Questions',
        faqSectionSubtitle: process.env.FAQ_SECTION_SUBTITLE || 'Everything you need to know about our pricing plans',
      },
      plans: [
        {
          id: 'free',
          name: process.env.PLAN_FREE_NAME || 'Free',
          icon: process.env.PLAN_FREE_ICON || 'Sparkles',
          description: process.env.PLAN_FREE_DESCRIPTION || 'Perfect for trying out Zietra',
          monthlyPrice: 0,
          annualPrice: 0,
          popular: false,
          features: JSON.parse(process.env.PLAN_FREE_FEATURES || JSON.stringify([
            { text: '1 user', included: true },
            { text: '100 contacts / 10 companies / 20 deals', included: true },
            { text: '50 emails/month', included: true },
            { text: '1 email template', included: true },
            { text: 'Manual email campaigns', included: true },
            { text: 'Basic email tracking (opens only)', included: true },
            { text: '1 AI video prompt/month (30 sec)', included: true },
            { text: 'Auto logo overlay with watermark', included: true },
            { text: 'Download video or send via email', included: true },
            { text: 'Community support', included: true },
            { text: 'Email automation', included: false },
            { text: 'Advanced AI features', included: false },
            { text: 'Team collaboration', included: false },
            { text: 'Priority support', included: false },
          ])),
          buttonText: process.env.PLAN_FREE_BUTTON_TEXT || 'Start Free',
          buttonVariant: 'outline' as 'primary' | 'outline',
          stripeMonthlyPriceId: '',
          stripeAnnualPriceId: '',
        },
        {
          id: 'starter',
          name: process.env.PLAN_1_NAME || 'Starter',
          icon: process.env.PLAN_1_ICON || 'Star',
          description: process.env.PLAN_1_DESCRIPTION || 'For solopreneurs & small businesses',
          monthlyPrice: Number.parseInt(process.env.PLAN_1_MONTHLY_PRICE || '49'),
          annualPrice: Number.parseInt(process.env.PLAN_1_ANNUAL_PRICE || '490'),
          popular: (process.env.PLAN_1_POPULAR || 'false') === 'true',
          features: JSON.parse(process.env.PLAN_1_FEATURES || JSON.stringify([
            { text: 'Up to 3 team members', included: true },
            { text: '2,500 contacts / 250 companies / 500 deals', included: true },
            { text: '2,500 emails/month', included: true },
            { text: '10 email templates', included: true },
            { text: 'Email tracking (opens, clicks, replies)', included: true },
            { text: 'Gmail/SMTP/Google Workspace integration', included: true },
            { text: '10 AI video prompts/month (1 min each)', included: true },
            { text: 'Auto logo & message branding', included: true },
            { text: 'Access to 10 AI voices + upload your own', included: true },
            { text: 'Download or send videos to clients', included: true },
            { text: 'Basic campaign metrics dashboard', included: true },
            { text: '7-day analytics retention', included: true },
            { text: '14-day Free Trial (3 AI videos included)', included: true },
            { text: 'Advanced automation', included: false },
            { text: 'AI campaign builder', included: false },
            { text: 'Priority support', included: false },
          ])),
          buttonText: process.env.PLAN_1_BUTTON_TEXT || 'Buy Now',
          buttonVariant: (process.env.PLAN_1_BUTTON_VARIANT || 'primary') as 'primary' | 'outline',
          stripeMonthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || process.env.STRIPE_STARTER_MONTHLY!,
          stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || process.env.STRIPE_STARTER_ANNUAL!,
        },
        {
          id: 'professional',
          name: process.env.PLAN_2_NAME || 'Professional',
          icon: process.env.PLAN_2_ICON || 'Zap',
          description: process.env.PLAN_2_DESCRIPTION || 'For growing teams & power users',
          monthlyPrice: Number.parseInt(process.env.PLAN_2_MONTHLY_PRICE || '149'),
          annualPrice: Number.parseInt(process.env.PLAN_2_ANNUAL_PRICE || '1490'),
          popular: (process.env.PLAN_2_POPULAR || 'true') === 'true',
          features: JSON.parse(process.env.PLAN_2_FEATURES || JSON.stringify([
            { text: 'Up to 10 team members (+$20/user)', included: true },
            { text: '25,000 contacts / 2,500 companies / 5,000 deals', included: true },
            { text: '25,000 emails/month', included: true },
            { text: 'Unlimited email templates', included: true },
            { text: 'Advanced tracking & analytics (engagement heatmap)', included: true },
            { text: '100 AI video prompts/month (up to 2 mins)', included: true },
            { text: 'AI-enhanced campaign builder (single-prompt automation)', included: true },
            { text: 'Custom campaign templates per department', included: true },
            { text: 'Upload own voice + 10 premium voices', included: true },
            { text: 'Branded auto video generation with logo overlay', included: true },
            { text: 'Gmail, Outlook, Zoho & SMTP integrations', included: true },
            { text: '30-day analytics retention', included: true },
            { text: 'Metrics dashboard with email + video performance', included: true },
            { text: 'Priority support + onboarding assistance', included: true },
            { text: '14-day free trial', included: true },
            { text: 'Unlimited AI videos', included: false },
            { text: 'Custom voice packs', included: false },
            { text: 'White-label & reseller options', included: false },
          ])),
          buttonText: process.env.PLAN_2_BUTTON_TEXT || 'Buy Now',
          buttonVariant: (process.env.PLAN_2_BUTTON_VARIANT || 'primary') as 'primary' | 'outline',
          stripeMonthlyPriceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || process.env.STRIPE_PROFESSIONAL_MONTHLY!,
          stripeAnnualPriceId: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || process.env.STRIPE_PROFESSIONAL_ANNUAL!,
        },
        {
          id: 'enterprise',
          name: process.env.PLAN_3_NAME || 'Enterprise',
          icon: process.env.PLAN_3_ICON || 'Crown',
          description: process.env.PLAN_3_DESCRIPTION || 'For large teams with custom needs',
          monthlyPrice: Number.parseInt(process.env.PLAN_3_MONTHLY_PRICE || '499'),
          annualPrice: Number.parseInt(process.env.PLAN_3_ANNUAL_PRICE || '4990'),
          popular: (process.env.PLAN_3_POPULAR || 'false') === 'true',
          features: JSON.parse(process.env.PLAN_3_FEATURES || JSON.stringify([
            { text: 'Unlimited users, contacts, companies & deals', included: true },
            { text: 'Unlimited emails/month & templates', included: true },
            { text: 'Unlimited AI video prompts (up to 5 mins each)', included: true },
            { text: 'Dedicated AI Campaign Manager', included: true },
            { text: 'Cross-platform metrics dashboard', included: true },
            { text: 'Gmail, Meta Ads, Google Ads, LinkedIn Campaigns', included: true },
            { text: 'Real-time engagement analytics & conversion tracking', included: true },
            { text: 'Custom voice packs (per brand or spokesperson)', included: true },
            { text: 'Private cloud hosting / SSO support', included: true },
            { text: 'API integration for internal systems', included: true },
            { text: 'White-label & reseller options', included: true },
            { text: 'Dedicated success manager & 24/7 support', included: true },
            { text: 'SLA-based uptime & custom compliance (SOC2-ready)', included: true },
          ])),
          buttonText: process.env.PLAN_3_BUTTON_TEXT || 'Contact Sales',
          buttonVariant: (process.env.PLAN_3_BUTTON_VARIANT || 'outline') as 'primary' | 'outline',
          stripeMonthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || process.env.STRIPE_ENTERPRISE_MONTHLY!,
          stripeAnnualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || process.env.STRIPE_ENTERPRISE_ANNUAL!,
        },
      ],
      faqs: JSON.parse(process.env.PRICING_FAQS || JSON.stringify([
        {
          question: 'Can I change plans later?',
          answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we\'ll prorate your billing accordingly.',
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, Mastercard, Amex, Discover) and bank transfers for annual plans over $1,000.',
        },
        {
          question: 'Is there a free trial?',
          answer: 'Yes! All plans include a {trialDays}-day free trial with full feature access. No credit card required to start your trial.',
        },
        {
          question: 'What happens when I reach my limit?',
          answer: 'You\'ll receive notifications when approaching limits. You can purchase add-ons or upgrade your plan seamlessly without data loss.',
        },
      ])),
    };

    res.json(pricingData);
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    res.status(500).json({ error: 'Failed to fetch pricing configuration' });
  }
});

// TODO: Add admin endpoints to update pricing configuration
// POST /api/pricing/config - Update pricing configuration (admin only)
// PUT /api/pricing/plans/:planId - Update specific plan (admin only)
// PUT /api/pricing/faqs - Update FAQs (admin only)

export default router;
