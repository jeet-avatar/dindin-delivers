'use client'

import { useState } from 'react'
import { siteConfig } from '@/lib/config'

/**
 * Google Calendar Appointment Scheduling embed.
 *
 * Setup (one-time, for Dr. Pillay):
 *  1. Open Google Calendar → + New → "Appointment schedule"
 *  2. Set title, duration, availability, buffer time, intake questions
 *  3. Click "Open booking page" → copy the URL
 *  4. Add to Vercel env vars: NEXT_PUBLIC_GOOGLE_CALENDAR_URL=<that URL>
 *
 * Appointments land directly in Dr. Pillay's Google Calendar + send
 * confirmation emails to both patient and doctor automatically.
 */

// Telehealth-only appointment types available via this Google Calendar link
const appointmentTypes = [
  { label: 'New Patient Telehealth Consultation', duration: '30 min' },
  { label: 'Weight Loss Telehealth Consult ($99)', duration: '45 min' },
  { label: 'Telehealth Follow-up Visit', duration: '20 min' },
  { label: 'Prescription Refill / Medication Review', duration: '15 min' },
]

export function GoogleCalendarBooking() {
  const [iframeError, setIframeError] = useState(false)

  // Embed URL — Google Appointment Scheduling supports iframe with ?gv=true
  const bookingUrl = siteConfig.googleCalendarUrl
  const embedUrl = bookingUrl ? `${bookingUrl}?gv=true` : ''

  // Not configured yet — show setup placeholder
  if (!bookingUrl) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-primary px-6 py-5">
          <h3 className="font-heading font-bold text-white text-lg">Book a Telehealth Appointment</h3>
          <p className="text-blue-200 text-sm mt-1">Video call · Mon–Fri evenings · {siteConfig.hours.weekdays.split('(')[0].trim()}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This calendar is for <strong>telehealth (video) appointments only</strong>. For in-person Saturday visits, please call {siteConfig.phone}.</span>
          </div>
          <p className="text-slate-600 text-sm font-medium">Available telehealth appointment types:</p>
          <ul className="space-y-2">
            {appointmentTypes.map((t, i) => (
              <li key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 bg-purple-50 text-purple-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm leading-snug">{t.label}</p>
                  <p className="text-slate-500 text-xs">{t.duration}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-purple-50 text-purple-700">
                  Video
                </span>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-slate-500 text-sm mb-4">
              Online booking is being set up. In the meantime, call or use the form below.
            </p>
            <a
              href={`tel:${siteConfig.phone.replaceAll(/\D/g, '')}`}
              className="min-h-[44px] w-full inline-flex items-center justify-center bg-cta text-white hover:bg-cta-dark rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 px-4 py-3 focus-visible:outline-[3px] focus-visible:outline-cta-dark"
            >
              Call {siteConfig.phone}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      {/* Header bar */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-white">Book a Telehealth Appointment</h3>
          <p className="text-blue-200 text-xs mt-0.5">Video call · Mon–Fri evenings · Confirmation emailed automatically</p>
        </div>
        {/* Always-visible external link — works even if embed is blocked */}
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-white"
          aria-label="Open booking in Google Calendar (new tab)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open full page
        </a>
      </div>

      {/* Embedded Google Calendar Appointment Scheduling */}
      {!iframeError ? (
        <iframe
          src={embedUrl}
          title="Book an appointment with Dr. Arpana Pillay"
          width="100%"
          className="h-[600px] sm:h-[700px] block"
          style={{ border: 0 }}
          onError={() => setIframeError(true)}
          loading="lazy"
          aria-label="Google Calendar appointment booking"
        />
      ) : (
        // Fallback if Google blocks iframe embedding
        <div className="bg-slate-50 p-8 text-center">
          <svg className="w-12 h-12 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h4 className="font-heading font-bold text-slate-800 mb-2">Book Your Appointment</h4>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Click below to open our booking page in a new tab. Select your appointment type, date, and time — confirmation is instant.
          </p>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 bg-primary text-white hover:bg-primary-dark px-8 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Open Google Calendar Booking
          </a>
          <p className="text-xs text-slate-400 mt-4">
            Appointment confirmations go directly to your email.
          </p>
        </div>
      )}
    </div>
  )
}
