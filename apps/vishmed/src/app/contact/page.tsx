import type { Metadata } from 'next'
import { siteConfig } from '@/lib/config'
import { CalendlyWidget } from '@/components/ui/CalendlyWidget'
import { ContactForm } from '@/components/ui/ContactForm'

export const metadata: Metadata = {
  title: 'Book Appointment | Contact Vish Medical',
  description:
    'Book an appointment with Dr. Arpana Pillay at Vish Medical. Online scheduling available. Primary care, weight loss, and telehealth in Central Florida.',
  openGraph: {
    title: 'Book Appointment | Contact Vish Medical',
    url: `${siteConfig.siteUrl}/contact`,
  },
}

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-blue text-white py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-3">Book an Appointment</h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto leading-relaxed">
            Use the online booking tool or send us a message — we respond within 1 business day.
          </p>
        </div>
      </section>

      {/* Main content: Calendly + Contact Form */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Left: Calendly online booking */}
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-800 mb-6">Schedule Online</h2>
            <CalendlyWidget />
          </div>

          {/* Right: Contact form + practice info */}
          <div className="space-y-8">
            {/* Send a message */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-6">Send a Message</h2>
              <ContactForm />
            </div>

            {/* Practice info */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-4">Contact Information</h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-slate-700 mb-0.5">Address</dt>
                  <dd className="text-slate-600">{siteConfig.address}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 mb-0.5">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${siteConfig.phone.replaceAll(/\D/g, '')}`}
                      className="text-primary font-semibold text-base hover:text-primary-dark motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary rounded"
                    >
                      {siteConfig.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 mb-0.5">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="text-primary hover:text-primary-dark motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary rounded"
                    >
                      {siteConfig.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 mb-0.5">Monday – Friday</dt>
                  <dd className="text-slate-600">{siteConfig.hours.weekdays}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700 mb-0.5">Saturday (In-Office)</dt>
                  <dd className="text-slate-600">{siteConfig.hours.saturday}</dd>
                </div>
                {siteConfig.acceptingPatients && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></span>
                      Accepting New Patients
                    </span>
                  </div>
                )}
              </dl>
            </div>

            {/* Google Maps embed */}
            {siteConfig.mapsEmbedUrl && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <iframe
                  src={siteConfig.mapsEmbedUrl}
                  title="Vish Medical location on Google Maps"
                  width="100%"
                  height="400"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  aria-label="Google Maps showing Vish Medical location"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
