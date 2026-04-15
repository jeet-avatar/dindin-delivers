import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'
import { SchemaMarkup } from '@/components/ui/SchemaMarkup'

export const metadata: Metadata = {
  title: 'Medical Services | Primary Care, Weight Loss & More',
  description:
    'Vish Medical offers GLP-1 medical weight loss, primary care, urgent care, specialty screenings, and telehealth in Central Florida. Board-certified Internal Medicine physician.',
  openGraph: {
    title: 'Medical Services | Primary Care, Weight Loss & More',
    url: `${siteConfig.siteUrl}/services`,
  },
}

const clinicSchema = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  name: 'Vish Medical',
  url: siteConfig.siteUrl,
  telephone: siteConfig.phone,
  medicalSpecialty: ['InternalMedicine', 'PrimaryCare'],
  availableService: [
    { '@type': 'MedicalTherapy', name: 'GLP-1 Medical Weight Loss' },
    { '@type': 'MedicalTherapy', name: 'Semaglutide Program' },
    { '@type': 'MedicalTherapy', name: 'Tirzepatide Program' },
    { '@type': 'MedicalTherapy', name: 'Primary Care & Prevention' },
    { '@type': 'MedicalTherapy', name: 'Urgent Care' },
    { '@type': 'MedicalTherapy', name: 'Chronic Disease Management' },
    { '@type': 'MedicalTherapy', name: 'Telehealth' },
  ],
}

// Verified Unsplash photo IDs
const UNSPLASH = 'https://images.unsplash.com/photo'

const services = [
  {
    id: 'glp1-weight-loss',
    title: 'Medical Weight Loss & GLP-1 Programs',
    subtitle: 'FDA-approved metabolic treatments',
    description:
      'Vish Medical offers physician-supervised GLP-1 metabolic therapy — the same science behind Wegovy, Ozempic, Zepbound, and Mounjaro. Our programs deliver real, clinically proven results: 15–20% average body weight reduction with personalized dosing and ongoing monitoring.',
    items: [
      'Semaglutide injections (weekly) — ~15% average weight loss',
      'Tirzepatide injections (weekly) — ~20% average weight loss',
      'Qsymia oral medication (FDA-approved)',
      'Brand name options: Wegovy, Zepbound, Ozempic, Mounjaro',
      'Compounded medications available',
      'Biometric scale + personalized nutrition plan included',
      'Bi-monthly telemedicine check-ins',
      'Maintenance and microdosing plans',
    ],
    image: `${UNSPLASH}-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80`,
    imageAlt: 'Healthy nutrition and wellness for medical weight loss',
    cta: { label: 'View Pricing', href: '/pricing' },
  },
  {
    id: 'primary-care',
    title: 'Primary Care & Prevention',
    subtitle: 'Your health, proactively managed',
    description:
      'Comprehensive primary care is the foundation of a healthy life. Dr. Pillay partners with you to manage your overall health — catching problems early, managing ongoing conditions, and keeping you on track with preventive care.',
    items: [
      'Annual wellness exams and physical check-ups',
      'Chronic disease management (diabetes, hypertension, high cholesterol)',
      'Preventive screenings and cancer screenings',
      'Vaccinations and immunizations',
      'Lab work coordination and results review',
      'Referrals to specialists when needed',
    ],
    image: `${UNSPLASH}-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=900&q=80`,
    imageAlt: 'Doctor consulting with patient in a primary care setting',
    cta: { label: 'Book Appointment', href: '/contact' },
  },
  {
    id: 'specialty-screenings',
    title: 'Specialty Screenings',
    subtitle: "Comprehensive health screenings for men and women",
    description:
      'From preventive cancer screenings to hormonal health and mental wellness, Vish Medical provides comprehensive specialty screenings tailored to your age, sex, and risk factors.',
    items: [
      "Men's Health: prostate screening, colon cancer screening",
      "Women's Health: Pap smears, mammogram referrals, contraception, hormonal balance",
      'Mental Health: depression, anxiety, and PTSD screening and management',
      'Insulin resistance and metabolic panel',
      'Heart and lung condition evaluations',
      'Thyroid function testing',
    ],
    image: `${UNSPLASH}-1527613426441-4da17471b66d?auto=format&fit=crop&w=900&q=80`,
    imageAlt: 'Clinical laboratory setting for medical screenings',
    cta: { label: 'Book Screening', href: '/contact' },
  },
  {
    id: 'urgent-care',
    title: 'Urgent Care',
    subtitle: 'Same-day care when you need it most',
    description:
      'When illness or injury strikes, you need care fast. Vish Medical offers same-day urgent care appointments so you can be seen promptly — without the long wait times of an emergency room.',
    items: [
      'Sprains, back pain, and minor injuries',
      'Cold, flu, and respiratory infections',
      'Headaches and sinus infections',
      'Urinary tract infections (UTIs)',
      'Abdominal pain and gastrointestinal issues',
      'Skin conditions and rashes',
    ],
    image: `${UNSPLASH}-1582750433449-648ed127bb54?auto=format&fit=crop&w=900&q=80`,
    imageAlt: 'Medical professional ready to provide urgent care',
    cta: { label: 'Book Same-Day', href: '/contact' },
  },
  {
    id: 'chronic-conditions',
    title: 'Acute & Chronic Conditions',
    subtitle: 'Expert management for complex health needs',
    description:
      'Managing a chronic condition requires an ongoing partnership with a physician who truly knows your history. Dr. Pillay provides continuous, evidence-based management of both acute episodes and long-term conditions.',
    items: [
      'Type 2 Diabetes management and monitoring',
      'Hypertension (high blood pressure) treatment',
      'Hyperlipidemia (high cholesterol) management',
      'Asthma and COPD management',
      'Thyroid disorders (hypothyroidism, hyperthyroidism)',
      'Insulin resistance and metabolic disorders',
    ],
    image: `${UNSPLASH}-1530497610245-94d3c16cda28?auto=format&fit=crop&w=900&q=80`,
    imageAlt: 'Medical imaging and diagnostics for chronic condition management',
    cta: { label: 'Book Appointment', href: '/contact' },
  },
]

const banners = [
  {
    id: 'banner-trust',
    image: `${UNSPLASH}-1551601651-2a8555f1a136?auto=format&fit=crop&w=1600&q=80`,
    imageAlt: 'Expert medical team at Vish Medical',
    heading: 'Expert Care You Can Trust',
    subheading: 'Board-certified Internal Medicine physician with 10+ years of clinical experience — right here in Orlando.',
    cta: { label: 'Meet Dr. Pillay', href: '/about' },
  },
  {
    id: 'banner-weightloss',
    image: `${UNSPLASH}-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&q=80`,
    imageAlt: 'Healthy lifestyle and fitness for medical weight loss',
    heading: 'Real Results. Medical Science.',
    subheading: 'Our GLP-1 programs have helped patients lose 15–20% of their body weight with FDA-approved medications and physician oversight.',
    cta: { label: 'See Pricing', href: '/pricing' },
  },
  {
    id: 'banner-telehealth',
    image: `${UNSPLASH}-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80`,
    imageAlt: 'Modern medical team providing comprehensive healthcare',
    heading: 'Care That Fits Your Life',
    subheading: 'Telehealth appointments Monday–Friday evenings. In-office Saturdays. Accepting new patients now.',
    cta: { label: 'Book Telehealth', href: '/telehealth' },
  },
]

function FullWidthBanner({ banner }: { banner: typeof banners[0] }) {
  return (
    <section id={banner.id} className="relative h-80 lg:h-96 flex items-center overflow-hidden">
      {/* Background image */}
      <Image
        src={banner.image}
        alt={banner.imageAlt}
        fill
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-slate-900/65" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl lg:text-4xl font-bold text-white mb-3 leading-tight">
            {banner.heading}
          </h2>
          <p className="text-slate-200 text-base lg:text-lg mb-6 leading-relaxed">
            {banner.subheading}
          </p>
          <Link
            href={banner.cta.href}
            className="min-h-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
          >
            {banner.cta.label}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function ServicesPage() {
  return (
    <>
      <SchemaMarkup schema={clinicSchema as Record<string, unknown>} />

      {/* Hero */}
      <section className="bg-brand-blue text-white py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-3">Medical Services</h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
            Comprehensive care from a board-certified Internal Medicine physician — in-office and via telehealth.
          </p>
        </div>
      </section>

      {/* Banner 1 */}
      <FullWidthBanner banner={banners[0]} />

      {/* Service 1 — GLP-1 */}
      <ServiceSection service={services[0]} index={0} />

      {/* Service 2 — Primary Care */}
      <ServiceSection service={services[1]} index={1} />

      {/* Banner 2 */}
      <FullWidthBanner banner={banners[1]} />

      {/* Service 3 — Specialty Screenings */}
      <ServiceSection service={services[2]} index={0} />

      {/* Service 4 — Urgent Care */}
      <ServiceSection service={services[3]} index={1} />

      {/* Banner 3 */}
      <FullWidthBanner banner={banners[2]} />

      {/* Service 5 — Chronic Conditions */}
      <ServiceSection service={services[4]} index={0} />

      {/* CTA */}
      <section className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">Schedule your appointment with Dr. Pillay today.</p>
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

function ServiceSection({
  service,
  index,
}: {
  service: typeof services[0]
  index: number
}) {
  const isEven = index % 2 === 0

  return (
    <section
      id={service.id}
      className={`py-16 lg:py-24 px-4 sm:px-6 lg:px-8 ${isEven ? 'bg-white' : 'bg-slate-50'}`}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Text — alternates left/right */}
        <div className={isEven ? 'order-1' : 'order-1 lg:order-2'}>
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">{service.subtitle}</p>
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-slate-800 mb-4">{service.title}</h2>
          <p className="text-slate-600 mb-6 leading-relaxed text-base">{service.description}</p>
          <ul className="space-y-2 mb-8" aria-label={`${service.title} includes`}>
            {service.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-slate-600 text-sm leading-relaxed">
                <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={service.cta.href}
            className="min-h-[44px] inline-flex items-center bg-primary text-white hover:bg-primary-dark px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-primary"
          >
            {service.cta.label}
          </Link>
        </div>

        {/* Image — alternates right/left */}
        <div className={`relative h-72 lg:h-96 rounded-2xl overflow-hidden shadow-md ${isEven ? 'order-2' : 'order-2 lg:order-1'}`}>
          <Image
            src={service.image}
            alt={service.imageAlt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  )
}
