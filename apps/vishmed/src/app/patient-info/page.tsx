import type { Metadata } from 'next'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'

export const metadata: Metadata = {
  title: 'New Patient Information | Accepting New Patients',
  description:
    'Vish Medical is accepting new patients. Learn what to bring to your first appointment, what to expect, and how to verify your insurance coverage.',
  openGraph: {
    title: 'New Patient Information | Accepting New Patients',
    url: `${siteConfig.siteUrl}/patient-info`,
  },
}

const whatToBring = [
  'Government-issued photo ID (driver\'s license or passport)',
  'Insurance card(s) — primary and secondary if applicable',
  'List of current medications (include dosage and frequency)',
  'Previous medical records and recent lab results (if available)',
  'List of known allergies (medications and environmental)',
  'Name and contact information for any current specialists',
]

const firstVisitSteps = [
  {
    title: 'Registration & Intake',
    desc: 'You\'ll complete a brief registration form with your personal and insurance information. Please arrive 10–15 minutes early for your first visit.',
  },
  {
    title: 'Health History Review',
    desc: 'Dr. Pillay will review your medical history, current concerns, and health goals. This is your time — come prepared with questions.',
  },
  {
    title: 'Physical Examination',
    desc: 'A comprehensive physical exam will be performed based on your age, health history, and presenting concerns.',
  },
  {
    title: 'Care Plan',
    desc: 'Dr. Pillay will discuss findings, recommend any necessary lab work or referrals, and develop a care plan tailored to your needs.',
  },
]

export default function PatientInfoPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-blue text-white py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full mb-5">
            <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></span>
            We Are Accepting New Patients
          </div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-4">New Patient Information</h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
            Everything you need to know before your first visit to Vish Medical.
          </p>
        </div>
      </section>

      {/* What to Bring */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-6">What to Bring to Your First Appointment</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <ul className="space-y-3" aria-label="Items to bring to your appointment">
              {whatToBring.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600 text-base leading-relaxed">
                  <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Insurance */}
      <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-6">Insurance</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <p className="text-slate-600 leading-relaxed mb-4">
              Vish Medical works with most major insurance plans. To verify your specific coverage before your appointment,
              please call our office:
            </p>
            <a
              href={`tel:${siteConfig.phone.replace(/[^0-9]/g, '')}`}
              className="min-h-[44px] inline-flex items-center text-primary font-bold text-xl hover:text-primary-dark motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary rounded"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {siteConfig.phone}
            </a>
            <p className="text-slate-500 text-sm mt-4">
              Please bring your insurance card to every appointment. We will verify your benefits and inform you of any copays or deductibles.
            </p>
          </div>
        </div>
      </section>

      {/* First Visit */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-8">What to Expect at Your First Visit</h2>
          <div className="space-y-6">
            {firstVisitSteps.map((step, index) => (
              <div key={step.title} className="flex gap-5">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm" aria-hidden="true">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-slate-800 mb-1">{step.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Patient Rights & HIPAA Notice */}
      <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-6">Your Rights &amp; HIPAA Privacy</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <p className="text-slate-600 leading-relaxed mb-4">
              Vish Medical is committed to protecting your health information. As our patient, you have the right to access
              your medical records, request corrections, and understand how your information is used. Our full Notice of
              Privacy Practices is available upon request and outlines your rights under HIPAA (Health Insurance Portability
              and Accountability Act).
            </p>
            <Link
              href="/privacy-policy"
              className="text-primary font-semibold hover:text-primary-dark motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary rounded underline underline-offset-2"
            >
              View our Privacy Policy and HIPAA Notice &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Ready to Become a Patient?</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">
            We are accepting new patients and would love to welcome you to the Vish Medical family.
          </p>
          <Link
            href="/contact"
            className="min-h-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-8 py-3 rounded-lg font-bold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
          >
            Book Your First Appointment
          </Link>
        </div>
      </section>
    </>
  )
}
