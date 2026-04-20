import { useState, useEffect } from 'react';
import { Check, X, Star, Zap, Crown, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Icon mapping for dynamic icon selection
const ICON_MAP: Record<string, any> = {
  Star,
  Zap,
  Crown,
  Sparkles,
};

// Configuration interface
interface PricingConfig {
  brandName: string;
  trustBadgeText: string;
  businessCount: string;
  salesEmail: string;
  trialDays: string;
  annualSavings: string;
  headline: string;
  subheadline: string;
  ctaHeadline: string;
  ctaSubheadline: string;
  faqSectionTitle: string;
  faqSectionSubtitle: string;
}

// Plan interface
interface PricingPlan {
  id: string;
  name: string;
  icon: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular: boolean;
  features: Array<{
    text: string;
    included: boolean;
  }>;
  buttonText: string;
  buttonVariant: 'primary' | 'outline';
  stripeMonthlyPriceId: string;
  stripeAnnualPriceId: string;
}

// FAQ interface
interface FAQ {
  question: string;
  answer: string;
}

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  // State for dynamic data
  const [config, setConfig] = useState<PricingConfig>({
    brandName: 'Zietra',
    trustBadgeText: 'Trusted by 10,000+ businesses worldwide',
    businessCount: '10,000+',
    salesEmail: 'sales@zietra.com',
    trialDays: '14',
    annualSavings: '17%',
    headline: 'Simple, transparent pricing for everyone',
    subheadline: 'Choose the perfect plan for your business. Start with a free trial and scale as you grow.',
    ctaHeadline: 'Ready to transform your business?',
    ctaSubheadline: 'Join {businessCount} businesses using {brandName} to grow faster and smarter',
    faqSectionTitle: 'Frequently Asked Questions',
    faqSectionSubtitle: 'Everything you need to know about our pricing plans',
  });

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Initialize with defaults immediately, then fetch from API in background
  useEffect(() => {
    // Load defaults first for instant display
    loadDefaultPricingData();

    // Fetch from API in background
    const fetchPricingData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        // Add timeout to API call (5 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${apiUrl}/api/pricing/config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (data.config) {
            setConfig((prev) => ({ ...prev, ...data.config }));
          }

          if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
            setPlans(data.plans);
          }

          if (data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) {
            setFaqs(data.faqs);
          }
        }
      } catch (error) {
        // Silently fail and use defaults - already loaded
        console.log('Using default pricing configuration');
      }
    };

    fetchPricingData();
  }, []);

  // Fallback default data
  const loadDefaultPricingData = () => {
    setPlans([
      {
        id: 'starter',
        name: 'Starter',
        icon: 'Star',
        description: 'Perfect for small businesses and startups',
        monthlyPrice: 29,
        annualPrice: 290,
        popular: false,
        features: [
          { text: '1,000 contacts', included: true },
          { text: '50 companies', included: true },
          { text: '100 deals', included: true },
          { text: '1 user', included: true },
          { text: '1,000 emails/month', included: true },
          { text: '3 email templates', included: true },
          { text: 'Basic email tracking', included: true },
          { text: 'Gmail/SMTP integration', included: true },
          { text: 'Email automation', included: false },
          { text: 'AI features', included: false },
          { text: 'API access', included: false },
          { text: 'Priority support', included: false },
        ],
        buttonText: 'Start Free Trial',
        buttonVariant: 'outline',
        stripeMonthlyPriceId: import.meta.env.VITE_STRIPE_STARTER_MONTHLY || 'price_1SEoYzJePbhql2pNPST0TGTt',
        stripeAnnualPriceId: import.meta.env.VITE_STRIPE_STARTER_ANNUAL || 'price_1SEoYzJePbhql2pNeUQMDYoa',
      },
      {
        id: 'professional',
        name: 'Professional',
        icon: 'Zap',
        description: 'Best for growing teams and marketers',
        monthlyPrice: 99,
        annualPrice: 990,
        popular: true,
        features: [
          { text: '10,000 contacts', included: true },
          { text: '500 companies', included: true },
          { text: '1,000 deals', included: true },
          { text: '5 users (+ $15/user)', included: true },
          { text: '10,000 emails/month', included: true },
          { text: 'Unlimited email templates', included: true },
          { text: 'Advanced email tracking', included: true },
          { text: 'Email automation & A/B testing', included: true },
          { text: 'AI email generation (100/mo)', included: true },
          { text: '500 SMS/month', included: true },
          { text: 'Full API access', included: true },
          { text: 'Priority support', included: true },
        ],
        buttonText: 'Start Free Trial',
        buttonVariant: 'primary',
        stripeMonthlyPriceId: import.meta.env.VITE_STRIPE_PROFESSIONAL_MONTHLY || 'price_1SEoZ0JePbhql2pNoOns39cg',
        stripeAnnualPriceId: import.meta.env.VITE_STRIPE_PROFESSIONAL_ANNUAL || 'price_1SEoZ0JePbhql2pNKgEtI41k',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        icon: 'Crown',
        description: 'For large organizations with advanced needs',
        monthlyPrice: 299,
        annualPrice: 2990,
        popular: false,
        features: [
          { text: 'Unlimited contacts', included: true },
          { text: 'Unlimited companies', included: true },
          { text: 'Unlimited deals', included: true },
          { text: 'Unlimited users', included: true },
          { text: '50,000 emails/month', included: true },
          { text: 'Unlimited email templates', included: true },
          { text: 'Advanced A/B testing', included: true },
          { text: 'Unlimited automation', included: true },
          { text: 'Unlimited AI generations', included: true },
          { text: 'Unlimited SMS', included: true },
          { text: 'Unlimited API access', included: true },
          { text: '24/7 phone support', included: true },
        ],
        buttonText: 'Contact Sales',
        buttonVariant: 'outline',
        stripeMonthlyPriceId: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY || 'price_1SEoZ1JePbhql2pNFUuLBq8f',
        stripeAnnualPriceId: import.meta.env.VITE_STRIPE_ENTERPRISE_ANNUAL || 'price_1SEoZ2JePbhql2pNoDfq4njn',
      },
    ]);

    setFaqs([
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
        answer: `Yes! All plans include a ${config.trialDays}-day free trial with full feature access. No credit card required to start your trial.`,
      },
      {
        question: 'What happens when I reach my limit?',
        answer: 'You\'ll receive notifications when approaching limits. You can purchase add-ons or upgrade your plan seamlessly without data loss.',
      },
    ]);
  };

  const handleSkipForNow = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('crmToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/subscriptions/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate('/');
      } else {
        console.error('Failed to activate trial');
      }
    } catch (error) {
      console.error('Error activating trial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    // Enterprise plan - contact sales
    if (plan.name === 'Enterprise' || plan.buttonText === 'Contact Sales') {
      alert(`Please contact sales for ${plan.name} plan: ${config.salesEmail}`);
      return;
    }

    // For all other plans - redirect to Stripe checkout
    try {
      setSelectedPlan(plan.id);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        navigate(`/login?redirect=/pricing`);
        return;
      }

      // Get the appropriate Stripe price ID based on billing cycle
      const priceId = billingCycle === 'monthly' ? plan.stripeMonthlyPriceId : plan.stripeAnnualPriceId;

      // Create Stripe checkout session
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          billingCycle,
          planId: plan.id,
          planName: plan.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(`Failed to start checkout: ${error.message}`);
      setSelectedPlan('');
    }
  };

  const getPrice = (plan: PricingPlan) => {
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    const monthly = billingCycle === 'monthly' ? price : Math.floor(price / 12);
    return { price, monthly };
  };

  // Replace template variables in text
  const replaceTemplateVars = (text: string) => {
    return text
      .replace('{businessCount}', config.businessCount)
      .replace('{brandName}', config.brandName)
      .replace('{trialDays}', config.trialDays);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tl from-orange-400/20 to-rose-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
        <div className="text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-indigo-100 rounded-full shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-[#CBD5E1]">{config.trustBadgeText}</span>
          </div>

          <h1 className="text-5xl font-extrabold text-[#F1F5F9] sm:text-6xl md:text-7xl tracking-tight">
            <span className="block">Simple, transparent</span>
            <span className="block bg-gradient-to-r from-orange-600 via-rose-600 to-rose-700 bg-clip-text text-transparent">
              {config.headline.split(' ').slice(-3).join(' ')}
            </span>
          </h1>
          <p className="mt-6 text-xl text-[#94A3B8] max-w-3xl mx-auto leading-relaxed">
            {config.subheadline}
            <span className="block mt-2 font-semibold text-indigo-400">No credit card required.</span>
          </p>

          {/* Skip for Now Button */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleSkipForNow}
              disabled={isLoading}
              className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base font-semibold rounded-xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Activating your trial...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Start Free Trial Now</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="mt-4 text-sm text-[#94A3B8]">Get instant access to all features • Cancel anytime</p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-3 p-1.5 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl shadow-lg">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`relative px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`relative px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-gray-50'
              }`}
            >
              <span>Annual</span>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/15 text-green-400">
                Save {config.annualSavings}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const { price, monthly } = getPrice(plan);
            const IconComponent = ICON_MAP[plan.icon] || Star;

            return (
              <div
                key={plan.id}
                className={`group relative rounded-2xl ${
                  plan.popular
                    ? 'border-2 border-indigo-500 shadow-xl scale-105 bg-gradient-to-br from-white via-orange-50/30 to-rose-50/30'
                    : 'border-2 border-gray-200 shadow-lg bg-white'
                } p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                {/* Glow Effect for Popular Plan */}
                {plan.popular && (
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-400/20 to-rose-400/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                )}

                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="relative z-10 text-center">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl shadow-md transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-[#CBD5E1]'
                  }`}>
                    <IconComponent className="w-7 h-7" />
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-[#F1F5F9]">{plan.name}</h3>
                  <p className="mt-2 text-sm text-[#94A3B8]">{plan.description}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-extrabold tracking-tight text-[#F1F5F9]">
                        ${monthly}
                      </span>
                      <span className="ml-1 text-xl font-semibold text-[#94A3B8]">/mo</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="mt-2 text-sm font-semibold text-[#94A3B8]">
                        ${price} billed annually
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={selectedPlan === plan.id}
                    className={`mt-8 w-full flex justify-center items-center gap-2 px-6 py-3.5 text-base font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      plan.buttonVariant === 'primary'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                        : 'bg-white text-[#F1F5F9] border-2 border-gray-300 hover:border-indigo-500 hover:bg-gray-50 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {selectedPlan === plan.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{plan.buttonText}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>

                <ul className="relative z-10 mt-8 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        feature.included
                          ? 'bg-green-500/15 text-green-600'
                          : 'bg-gray-100 text-[#64748B]'
                      }`}>
                        {feature.included ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className={`ml-3 text-sm ${
                        feature.included ? 'text-[#CBD5E1] font-medium' : 'text-[#64748B] line-through'
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <div className="mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#F1F5F9]">{config.faqSectionTitle}</h2>
              <p className="mt-3 text-base text-[#94A3B8]">{config.faqSectionSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {faqs.map((faq, index) => (
                <div key={index} className="group p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all duration-300">
                  <h3 className="text-lg font-bold text-[#F1F5F9] group-hover:text-indigo-400 transition-colors">{faq.question}</h3>
                  <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">
                    {replaceTemplateVars(faq.answer)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-20 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-rose-600 to-rose-700 p-12 text-center shadow-xl">
          {/* Decorative Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-rose-400/20 backdrop-blur-3xl"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-xs font-semibold text-white">Limited Time Offer</span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight">
              {config.ctaHeadline}
            </h2>
            <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              {replaceTemplateVars(config.ctaSubheadline)}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  const professionalPlan = plans.find(p => p.name === 'Professional' || p.popular);
                  if (professionalPlan) handleSelectPlan(professionalPlan);
                }}
                className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-white text-indigo-400 rounded-xl font-semibold text-base shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <span>Start Your Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleSkipForNow}
                disabled={isLoading}
                className="inline-flex justify-center items-center gap-2 px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold text-base hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Explore Platform First
              </button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-8 text-white/80 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>{config.trialDays}-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
