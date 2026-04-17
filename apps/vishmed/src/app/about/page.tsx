import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { siteConfig } from '@/lib/config'
import { SchemaMarkup } from '@/components/ui/SchemaMarkup'

export const metadata: Metadata = {
  title: 'About Dr. Arpana Pillay | Internal Medicine Physician',
  description:
    'Learn about Dr. Arpana Pillay, an Internal Medicine physician with over 10 years of experience providing compassionate primary care in Central Florida.',
  openGraph: {
    title: 'About Dr. Arpana Pillay | Internal Medicine Physician',
    url: `${siteConfig.siteUrl}/about`,
  },
}

const physicianSchema = {
  '@context': 'https://schema.org',
  '@type': 'Physician',
  name: 'Dr. Arpana Pillay',
  description:
    'Internal Medicine physician with over 10 years of experience in primary care, weight loss management, and telehealth services in Central Florida.',
  medicalSpecialty: 'InternalMedicine',
  worksFor: {
    '@type': 'MedicalClinic',
    name: 'Vish Medical',
    url: siteConfig.siteUrl,
  },
}

const credentials = [
  { label: 'Degree', value: 'Doctor of Medicine (MD)' },
  { label: 'Certification', value: 'Internal Medicine' },
  { label: 'Experience', value: '10+ Years Clinical Practice' },
  { label: 'Specialty', value: 'Internal Medicine & Primary Care' },
  { label: 'Telehealth', value: 'Licensed to Practice Telehealth in Florida' },
]

const values = [
  {
    title: 'Listen First',
    desc: 'Every appointment begins with truly listening to you — your concerns, your goals, and your life circumstances.',
  },
  {
    title: 'Evidence-Based',
    desc: 'Treatment decisions are grounded in the latest clinical research and guidelines, tailored to your individual needs.',
  },
  {
    title: 'Long-Term Partnership',
    desc: 'We are not a one-visit practice. We invest in understanding your health history and building a lasting relationship.',
  },
]

export default function AboutPage() {
  return (
    <>
      <SchemaMarkup schema={physicianSchema as Record<string, unknown>} />

      {/* Hero */}
      <section className="bg-brand-blue text-white py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-3">{siteConfig.doctor.name}</h1>
          <p className="text-blue-200 text-xl">{siteConfig.doctor.title}</p>
        </div>
      </section>

      {/* Bio */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="relative w-full h-96 rounded-2xl overflow-hidden bg-slate-100">
            <Image
              src="/photos/dr-pillay-portrait.jpg"
              alt="Dr. Arpana Pillay, Internal Medicine Physician at Vish Medical"
              fill
              className="object-cover object-top"
              unoptimized
            />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-800 mb-6">A Physician Who Listens</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed text-base">
              <p>
                Dr. Arpana Pillay brings over 10 years of clinical experience to every patient encounter. An Internal Medicine
                physician, she founded Vish Medical with a singular mission: to provide the kind of
                thoughtful, personalized healthcare that truly makes a difference in people&apos;s lives. Her practice is built
                on the belief that prevention is the most powerful medicine available.
              </p>
              <p>
                Dr. Pillay takes time to understand each patient as a whole person — not just a set of symptoms. From managing
                chronic conditions like diabetes and hypertension to guiding patients through medically supervised weight loss
                programs, she develops care plans that fit real lives. Her approach blends evidence-based medicine with genuine
                compassion, creating a practice where patients feel heard, respected, and empowered.
              </p>
              <p>
                Recognizing the growing need for accessible healthcare, Dr. Pillay also offers telehealth appointments Monday
                through Friday, ensuring her patients can receive care from wherever they are. Whether you&apos;re establishing
                care for the first time or looking for a physician who will partner with you on your long-term health goals,
                Dr. Pillay and the Vish Medical team are ready to welcome you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-8 text-center">Credentials &amp; Training</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {credentials.map((cred, i) => (
              <div
                key={cred.label}
                className={`flex flex-col sm:flex-row sm:items-center px-6 py-4 ${i < credentials.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <span className="font-semibold text-slate-700 w-44 shrink-0">{cred.label}</span>
                <span className="text-slate-600">{cred.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-2xl font-bold text-slate-800 mb-4">Patient-Centered Care Philosophy</h2>
          <p className="text-slate-500 mb-10 leading-relaxed">The values that guide every appointment at Vish Medical</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((val) => (
              <div key={val.title} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-heading font-semibold text-primary text-lg mb-2">{val.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-2xl font-bold mb-4">Ready to Become a Patient?</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">We are currently accepting new patients. Book your first appointment today.</p>
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
