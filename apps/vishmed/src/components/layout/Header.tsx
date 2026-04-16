'use client'

import { useState } from 'react'
import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/telehealth', label: 'Telehealth' },
  { href: '/patient-info', label: 'Patient Info' },
  { href: '/contact', label: 'Contact' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded focus-visible:outline-[3px] focus-visible:outline-primary"
          aria-label="Vish Medical — Home"
        >
          {/* Icon mark only — crop out the baked-in text at the bottom of the PNG */}
          <div className="relative h-11 w-11 overflow-hidden flex-shrink-0" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="absolute top-0 left-0 w-full"
              style={{ height: '130%' }}
            />
          </div>
          {/* Wordmark using site typography */}
          <span className="font-heading font-bold text-xl leading-none">
            <span className="text-primary">Vish</span>
            <span className="text-slate-700"> Medical</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-700 hover:text-primary font-medium motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-primary rounded"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="min-h-[44px] min-w-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-5 py-2.5 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-cta-dark"
          >
            Book Appointment
          </Link>
        </nav>

        {/* Mobile hamburger — 44x44px minimum touch target */}
        <button
          type="button"
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer focus-visible:outline-[3px] focus-visible:outline-primary"
          aria-expanded={mobileOpen ? 'true' : 'false'}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="md:hidden bg-white border-t border-slate-100 px-4 pb-4">
          <ul className="flex flex-col gap-1 mt-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="min-h-[44px] flex items-center py-2 px-3 text-slate-700 hover:text-primary hover:bg-slate-50 rounded-lg font-medium motion-safe:transition-colors motion-safe:duration-150"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/contact"
                className="min-h-[44px] flex items-center justify-center text-center bg-cta text-white hover:bg-cta-dark px-5 py-3 rounded-lg font-semibold motion-safe:transition-colors motion-safe:duration-150 cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                Book Appointment
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
