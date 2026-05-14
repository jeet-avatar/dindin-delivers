import Link from 'next/link'
import { siteConfig } from '@/lib/config'

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Dr. Pillay' },
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/telehealth', label: 'Telehealth' },
  { href: '/patient-info', label: 'Patient Info' },
  { href: '/contact', label: 'Contact & Booking' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Col 1: Logo + tagline + accepting badge */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Vish Medical Logo"
              width={160}
              height={80}
              className="h-14 w-auto object-contain mb-3 brightness-0 invert"
            />
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">
              Expert Primary Care &amp; Weight Loss<br />in Central Florida
            </p>
            {siteConfig.acceptingPatients && (
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" aria-hidden="true"></span>
                Accepting New Patients
              </span>
            )}
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-white mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white motion-safe:transition-colors motion-safe:duration-150 text-sm focus-visible:outline-[3px] focus-visible:outline-primary-light rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact info */}
          <div>
            <h3 className="font-heading font-semibold text-white mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Address</p>
                <p className="leading-snug">{siteConfig.address}</p>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Phone</p>
                <a
                  href={`tel:${siteConfig.phone.replaceAll(/\D/g, '')}`}
                  className="hover:text-white motion-safe:transition-colors min-h-[44px] inline-flex items-center focus-visible:outline-[3px] focus-visible:outline-primary-light rounded"
                >
                  {siteConfig.phone}
                </a>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Fax</p>
                <p>{siteConfig.fax}</p>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Saturday Hours</p>
                <p>{siteConfig.hours.saturday}</p>
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-0.5">Weekday Appointments</p>
                <p>{siteConfig.hours.weekdays}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <p>&copy; {currentYear} {siteConfig.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className="hover:text-slate-300 motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary-light rounded"
            >
              Privacy Policy
            </Link>
            <span aria-hidden="true">|</span>
            <p>HIPAA-compliant practice. Patient privacy protected.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
