import type { Metadata } from 'next'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { SchemaMarkup } from '@/components/ui/SchemaMarkup'

export const metadata: Metadata = {
  title: 'Pricing | GLP-1 Weight Loss Programs & Consultations',
  description:
    'Transparent pricing for Vish Medical GLP-1 programs. Semaglutide from $350/month, Tirzepatide from $450/month. $99 one-time consultation. No hidden fees.',
  openGraph: {
    title: 'Pricing | GLP-1 Weight Loss Programs & Consultations',
    url: `${siteConfig.siteUrl}/pricing`,
  },
}

const pricingSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  name: 'Vish Medical',
  url: siteConfig.siteUrl,
  telephone: siteConfig.phone,
  priceRange: '$99–$450',
  availableService: [
    { '@type': 'MedicalTherapy', name: 'Semaglutide Program', price: '$350/month' },
    { '@type': 'MedicalTherapy', name: 'Tirzepatide Program', price: '$450/month' },
    { '@type': 'MedicalTherapy', name: 'GLP-1 Brand Program (Wegovy/Zepbound)', price: '$150/month' },
  ],
}

const plans = [
  {
    name: 'GLP-1 Brand Program',
    subtitle: 'Wegovy · Zepbound · Ozempic · Mounjaro',
    consultation: '$99',
    monthly: '$150',
    monthlyLabel: '/month (Rx)',
    highlight: false,
    features: [
      'One-time $99 consultation to qualify',
      'Monthly prescription ($150/month)',
      'Monthly weight management check-ins',
      'Brand-name FDA-approved medications',
      'Insurance may cover — we help verify',
    ],
    cta: 'Get Started',
    note: 'Subject to insurance coverage. Contact us to verify.',
  },
  {
    name: 'Semaglutide Program',
    subtitle: 'Compounded · ~15% avg. weight loss',
    consultation: '$99',
    monthly: '$350',
    monthlyLabel: '/month',
    highlight: true,
    features: [
      'One-time $99 consultation to qualify',
      'Weekly semaglutide injections',
      'Biometric scale included',
      'Personalized nutrition plan',
      '2× monthly telemedicine check-ins',
      'Maintenance/microdosing plan available',
    ],
    cta: 'Book Consultation',
    note: 'Most popular program. No insurance required.',
  },
  {
    name: 'Tirzepatide Program',
    subtitle: 'Compounded · ~20% avg. weight loss',
    consultation: '$99',
    monthly: '$450',
    monthlyLabel: '/month',
    highlight: false,
    features: [
      'One-time $99 consultation to qualify',
      'Weekly tirzepatide injections',
      'Biometric scale included',
      'Personalized nutrition plan',
      '2× monthly telemedicine check-ins',
      'Maintenance/microdosing plan available',
    ],
    cta: 'Book Consultation',
    note: 'Highest efficacy program. Dual GLP-1/GIP mechanism.',
  },
]

const faqs = [
  {
    q: 'What is the $99 consultation fee for?',
    a: 'The one-time $99 consultation allows Dr. Pillay to review your health history, perform a metabolic assessment, and determine which GLP-1 program is right for you. It is required before starting any weight loss program.',
  },
  {
    q: 'Are these medications covered by insurance?',
    a: 'Brand-name options (Wegovy, Zepbound, Ozempic, Mounjaro) may be covered by insurance depending on your plan. Compounded semaglutide and tirzepatide are typically not covered but are offered at significantly lower out-of-pocket cost.',
  },
  {
    q: 'How are the medications administered?',
    a: 'GLP-1 injectables are self-administered once weekly via a small subcutaneous injection — similar to an insulin pen. We provide full training at your first appointment.',
  },
  {
    q: 'What side effects should I expect?',
    a: 'The most common side effects are mild and include nausea, abdominal discomfort, diarrhea, and constipation — particularly during the initial dose escalation period. Most patients tolerate the medication well after the first few weeks.',
  },
  {
    q: 'Is there a long-term maintenance option?',
    a: 'Yes. After reaching your goal weight, we offer microdosing and maintenance plans to help you sustain your results at a reduced monthly cost.',
  },
]

export default function PricingPage() {
  return (
    <>
      <SchemaMarkup schema={pricingSchema as Record<string, unknown>} />

      {/* Hero */}
      <section className="bg-brand-blue text-white py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-3">Transparent Pricing</h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
            No surprises. All GLP-1 programs start with a $99 one-time consultation with Dr. Pillay — then a simple monthly fee with everything included.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 relative ${
                  plan.highlight
                    ? 'bg-primary text-white border-primary shadow-xl ring-2 ring-primary'
                    : 'bg-white text-slate-800 border-slate-100 shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-cta text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                <h2 className={`font-heading text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-slate-800'}`}>
                  {plan.name}
                </h2>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>{plan.subtitle}</p>

                {/* Consultation fee */}
                <div className={`mb-4 pb-4 border-b ${plan.highlight ? 'border-blue-400' : 'border-slate-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                    One-Time Consultation
                  </p>
                  <p className={`font-heading text-2xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-800'}`}>
                    {plan.consultation}
                  </p>
                </div>

                {/* Monthly fee */}
                <div className="mb-6">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                    Monthly Program Fee
                  </p>
                  <div className="flex items-end gap-1">
                    <span className={`font-heading text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-primary'}`}>
                      {plan.monthly}
                    </span>
                    <span className={`text-sm mb-1 ${plan.highlight ? 'text-blue-200' : 'text-slate-500'}`}>
                      {plan.monthlyLabel}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8" aria-label={`${plan.name} features`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-relaxed">
                      <svg
                        className={`w-5 h-5 shrink-0 mt-0.5 ${plan.highlight ? 'text-blue-200' : 'text-primary'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.highlight ? 'text-blue-100' : 'text-slate-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className={`min-h-[44px] w-full inline-flex items-center justify-center rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 px-6 py-3 focus-visible:outline-[3px] ${
                    plan.highlight
                      ? 'bg-cta text-white hover:bg-cta-dark focus-visible:outline-white'
                      : 'bg-primary text-white hover:bg-primary-dark focus-visible:outline-primary'
                  }`}
                >
                  {plan.cta}
                </Link>

                {plan.note && (
                  <p className={`text-xs mt-3 text-center ${plan.highlight ? 'text-blue-200' : 'text-slate-400'}`}>
                    {plan.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical results strip */}
      <section className="bg-white py-12 px-4 sm:px-6 lg:px-8 border-y border-slate-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: '15%', label: 'Avg. weight loss — Semaglutide' },
            { stat: '20%', label: 'Avg. weight loss — Tirzepatide' },
            { stat: 'FDA', label: 'Approved treatments' },
            { stat: '1,000+', label: 'Clinical trial participants' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-heading text-2xl lg:text-3xl font-bold text-primary">{item.stat}</p>
              <p className="text-slate-500 text-sm mt-1 leading-snug">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-heading font-semibold text-slate-800 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Ready to Start Your Weight Loss Journey?</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">
            Book your $99 consultation with Dr. Pillay. Same-day and telehealth appointments available.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="min-h-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-8 py-3 rounded-lg font-bold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
            >
              Book $99 Consultation
            </Link>
            <a
              href={`tel:${siteConfig.phone.replaceAll(/\D/g, '')}`}
              className="min-h-[44px] inline-flex items-center border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
            >
              Call {siteConfig.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
