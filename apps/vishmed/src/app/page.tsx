import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { SchemaMarkup } from '@/components/ui/SchemaMarkup'
import { HeroBannerCarousel } from '@/components/ui/HeroBannerCarousel'
import { GoogleReviews } from '@/components/ui/GoogleReviews'

export const metadata: Metadata = {
  title: 'Primary Care & Weight Loss Doctor | Dr. Arpana Pillay',
  description:
    'Dr. Arpana Pillay is an Internal Medicine physician offering primary care, GLP-1 weight loss programs, urgent care, and telehealth in Central Florida. Accepting new patients.',
  openGraph: {
    title: 'Primary Care & Weight Loss Doctor | Dr. Arpana Pillay',
    description:
      'Dr. Arpana Pillay is an Internal Medicine physician offering primary care, GLP-1 weight loss programs, urgent care, and telehealth in Central Florida.',
    url: `${siteConfig.siteUrl}/`,
  },
}

const homeSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'MedicalClinic',
      name: 'Vish Medical',
      telephone: siteConfig.phone,
      url: siteConfig.siteUrl,
      address: { '@type': 'PostalAddress', streetAddress: siteConfig.address },
      openingHours: ['Mo-Fr 17:00-20:00', 'Sa 09:00-16:00'],
      medicalSpecialty: ['InternalMedicine', 'PrimaryCare'],
      availableService: ['Primary Care', 'GLP-1 Weight Loss', 'Urgent Care', 'Telehealth'],
      priceRange: '$99–$450',
    },
    {
      '@type': 'Physician',
      name: 'Dr. Arpana Pillay',
      medicalSpecialty: 'InternalMedicine',
      worksFor: { '@type': 'MedicalClinic', name: 'Vish Medical' },
    },
  ],
}

const UNSPLASH = 'https://images.unsplash.com/photo'

const services = [
  {
    title: 'Medical Weight Loss & GLP-1',
    desc: 'Semaglutide, Tirzepatide, and FDA-approved programs. Up to 20% body weight reduction with physician oversight.',
    href: '/pricing',
    image: `${UNSPLASH}-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80`,
    imageAlt: 'Healthy nutrition for medical weight loss',
  },
  {
    title: 'Primary Care & Prevention',
    desc: 'Comprehensive wellness exams, chronic disease management, preventive screenings, and lab work coordination.',
    href: '/services#primary-care',
    image: `${UNSPLASH}-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=600&q=80`,
    imageAlt: 'Doctor consulting with patient',
  },
  {
    title: 'Urgent Care',
    desc: 'Same-day appointments for acute illness, minor injuries, sprains, back pain, and cold or flu symptoms.',
    href: '/services#urgent-care',
    image: `${UNSPLASH}-1582750433449-648ed127bb54?auto=format&fit=crop&w=600&q=80`,
    imageAlt: 'Medical professional ready to provide urgent care',
  },
  {
    title: 'Telehealth',
    desc: 'Virtual appointments from the comfort of your home, Monday through Friday evenings.',
    href: '/telehealth',
    image: `${UNSPLASH}-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80`,
    imageAlt: 'Online telehealth video consultation with doctor',
  },
]

const stats = [
  { stat: '15–20%', label: 'Average Weight Loss' },
  { stat: 'FDA', label: 'Approved Treatments' },
  { stat: '10+', label: 'Years Experience' },
  { stat: '$99', label: 'One-Time Consultation' },
]

const whyUs = [
  {
    title: 'Experienced Physician',
    desc: 'Dr. Pillay is an Internal Medicine physician with over 10 years of clinical experience.',
    icon: (
      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Accepting New Patients',
    desc: 'We welcome new patients and are committed to building long-term, trusting relationships.',
    icon: (
      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Telehealth Available',
    desc: 'Virtual appointments Mon–Fri evenings. Healthcare that fits your schedule.',
    icon: (
      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.88v6.24a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function HomePage() {
  return (
    <>
      <SchemaMarkup schema={homeSchema as Record<string, unknown>} />

      {/* ── HERO CAROUSEL ─────────────────────────────────────── */}
      <HeroBannerCarousel />

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <section className="bg-primary py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((item) => (
            <div key={item.label}>
              <p className="font-heading text-2xl lg:text-3xl font-bold text-white">{item.stat}</p>
              <p className="text-blue-200 text-sm mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MEET DR. PILLAY ──────────────────────────────────── */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="relative w-72 h-[380px] lg:w-96 lg:h-[460px] rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/photos/dr-pillay-portrait.jpg"
                alt="Dr. Arpana Pillay, Internal Medicine Physician at Vish Medical"
                fill
                className="object-cover object-top"
                unoptimized
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent px-5 py-5">
                <p className="font-heading font-bold text-white text-lg leading-tight">Dr. Arpana Pillay</p>
                <p className="text-blue-200 text-sm">Internal Medicine Physician</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Meet Your Doctor</p>
            <h2 className="font-heading text-2xl lg:text-3xl font-bold text-slate-800 mb-4">
              Expert Care, Personal Touch
            </h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Dr. Arpana Pillay is an Internal Medicine physician with over 10 years of clinical experience. She specializes in primary care, chronic disease management, and physician-supervised weight loss programs.
            </p>
            <p className="text-slate-600 mb-6 leading-relaxed">
              At Vish Medical, she combines evidence-based medicine with a compassionate, patient-centered approach — taking the time to understand your goals and build a plan that actually works for your life.
            </p>
            <ul className="space-y-2 mb-8" aria-label="Dr. Pillay credentials">
              {[
                'Internal Medicine Physician',
                'GLP-1 Medical Weight Loss Specialist',
                'Telehealth & In-Office Care',
                'Accepting New Patients — Orlando, FL',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-slate-700 text-sm">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/about"
              className="min-h-[44px] inline-flex items-center bg-primary text-white hover:bg-primary-dark px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-primary"
            >
              Full Bio &amp; Credentials
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVICES WITH PHOTOS ─────────────────────────────── */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-center text-slate-800 mb-2">Our Services</h2>
          <p className="text-slate-500 text-center mb-10 leading-relaxed">Comprehensive care for every stage of your health journey</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => (
              <Link
                key={svc.title}
                href={svc.href}
                className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 cursor-pointer focus-visible:outline-[3px] focus-visible:outline-primary"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={svc.image}
                    alt={svc.imageAlt}
                    fill
                    className="object-cover object-center group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-semibold text-slate-800 mb-2 group-hover:text-primary motion-safe:transition-colors text-base">
                    {svc.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{svc.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/services"
              className="min-h-[44px] inline-flex items-center border-2 border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-primary"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────────── */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-center text-slate-800 mb-10">Why Choose Vish Medical?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whyUs.map((item) => (
              <div key={item.title} className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center">
                <div className="flex justify-center mb-4">{item.icon}</div>
                <h3 className="font-heading font-semibold text-slate-800 text-lg mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOURS ────────────────────────────────────────────── */}
      <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-center text-slate-800 mb-6">Hours &amp; Availability</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm" aria-label="Office hours">
              <thead>
                <tr className="sr-only">
                  <th scope="col">Day</th>
                  <th scope="col">Hours</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-6 py-4 font-medium text-slate-700">Monday – Friday (In-Office &amp; Telehealth)</td>
                  <td className="px-6 py-4 text-right text-primary font-semibold">{siteConfig.hours.weekdays}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Saturday (In-Office)</td>
                  <td className="px-6 py-4 text-right text-primary font-semibold">{siteConfig.hours.saturday}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── GOOGLE REVIEWS ───────────────────────────────── */}
      <GoogleReviews />

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="bg-primary py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-4">Ready to Take Control of Your Health?</h2>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Join patients who trust Dr. Pillay for their primary care and weight loss journey. New patients always welcome.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="min-h-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-8 py-4 rounded-lg font-bold text-lg cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
            >
              Book Your Appointment
            </Link>
            <a
              href={`tel:${siteConfig.phone.replaceAll(/\D/g, '')}`}
              className="min-h-[44px] inline-flex items-center border-2 border-white/70 text-white hover:bg-white/15 px-8 py-4 rounded-lg font-bold text-lg cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
            >
              {siteConfig.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
