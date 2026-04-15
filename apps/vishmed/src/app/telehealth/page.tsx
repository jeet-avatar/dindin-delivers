import type { Metadata } from 'next'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { CalendlyWidget } from '@/components/ui/CalendlyWidget'

export const metadata: Metadata = {
  title: 'Telehealth Appointments | Virtual Primary Care',
  description:
    'See Dr. Arpana Pillay from the comfort of your home. Telehealth appointments for primary care, weight loss, and chronic conditions. Monday through Friday by appointment.',
  openGraph: {
    title: 'Telehealth Appointments | Virtual Primary Care',
    url: `${siteConfig.siteUrl}/telehealth`,
  },
}

const steps = [
  {
    step: '1',
    title: 'Book Online',
    desc: 'Use our online scheduling tool to pick a date and time that works for you. You\'ll receive a confirmation email with your video link.',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: '2',
    title: 'Join Video Call',
    desc: 'At your appointment time, click the link in your email to join a secure video call with Dr. Pillay — no app download required.',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.88v6.24a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: '3',
    title: 'Receive Care Plan',
    desc: 'Dr. Pillay reviews your concerns, answers your questions, and sends prescriptions or referrals electronically when needed.',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
]

const telehealthConditions = [
  'Cold, flu, and respiratory infections',
  'Sinus infections and allergies',
  'Urinary tract infections (UTIs)',
  'Medication refills and management',
  'Chronic disease check-ins (diabetes, hypertension)',
  'Weight loss follow-ups and progress reviews',
  'Lab result discussions',
  'Mental health concerns (anxiety, stress management)',
  'Skin rashes and minor skin concerns',
  'Digestive issues and stomach problems',
]

const techRequirements = [
  'Stable internet connection (Wi-Fi recommended)',
  'Smartphone, tablet, or computer with a camera',
  'A quiet, private space for your appointment',
  'Current list of medications (if applicable)',
]

export default function TelehealthPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-blue text-white py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-4">See Your Doctor From Home</h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
            Quality primary care delivered virtually. Book a telehealth appointment with Dr. Pillay Monday through Friday.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></span>
            {siteConfig.hours.weekdays}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-center text-slate-800 mb-10">How Telehealth Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <div className="inline-flex items-center justify-center w-7 h-7 bg-primary/10 text-primary text-xs font-bold rounded-full mb-3">
                  {step.step}
                </div>
                <h3 className="font-heading font-semibold text-slate-800 text-lg mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Treat + Tech Requirements */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-800 mb-6">What We Treat via Telehealth</h2>
            <ul className="space-y-3" aria-label="Conditions treated via telehealth">
              {telehealthConditions.map((condition) => (
                <li key={condition} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {condition}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-800 mb-6">What You Need</h2>
            <ul className="space-y-3 mb-8" aria-label="Technology requirements for telehealth">
              {techRequirements.map((req) => (
                <li key={req} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {req}
                </li>
              ))}
            </ul>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-heading font-semibold text-slate-800 mb-2">Scheduling</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Telehealth appointments are available <strong>{siteConfig.hours.weekdays}</strong>. Use the booking tool below or call us at{' '}
                <a href={`tel:${siteConfig.phone.replace(/[^0-9]/g, '')}`} className="text-primary font-semibold">
                  {siteConfig.phone}
                </a>{' '}
                to schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Calendly embed */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-center text-slate-800 mb-8">Book Your Telehealth Appointment</h2>
          <CalendlyWidget />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Healthcare Without the Wait</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">
            Skip the waiting room. See Dr. Pillay from wherever you are.
          </p>
          <Link
            href="/contact"
            className="min-h-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-8 py-3 rounded-lg font-bold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
          >
            Book Appointment
          </Link>
        </div>
      </section>
    </>
  )
}
