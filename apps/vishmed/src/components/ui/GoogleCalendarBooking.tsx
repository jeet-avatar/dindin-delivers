'use client'

import { useState } from 'react'
import { siteConfig } from '@/lib/config'

type BookingType = 'telehealth' | 'inperson'

const config: Record<BookingType, {
  title: string
  subtitle: string
  badgeLabel: string
  badgeColor: string
}> = {
  telehealth: {
    title: 'Book a Telehealth Appointment',
    subtitle: 'Video call · Mon–Fri evenings · Confirmation emailed automatically',
    badgeLabel: 'Video',
    badgeColor: 'bg-blue-50 text-blue-700',
  },
  inperson: {
    title: 'Book an In-Person Appointment',
    subtitle: 'In-office · Mon–Fri 9 AM–5 PM · Confirmation emailed automatically',
    badgeLabel: 'In-Person',
    badgeColor: 'bg-green-50 text-green-700',
  },
}

export function GoogleCalendarBooking({ type = 'telehealth' }: { type?: BookingType }) {
  const [iframeError, setIframeError] = useState(false)

  const bookingUrl = type === 'inperson'
    ? siteConfig.googleCalendarInPersonUrl
    : siteConfig.googleCalendarUrl

  const directEmbedUrl = type === 'inperson'
    ? siteConfig.googleCalendarInPersonEmbedUrl
    : siteConfig.googleCalendarEmbedUrl

  const embedUrl = directEmbedUrl ? `${directEmbedUrl}?gv=true` : ''
  const { title, subtitle } = config[type]

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      {/* Header bar */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-white">{title}</h3>
          <p className="text-blue-200 text-xs mt-0.5">{subtitle}</p>
        </div>
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
          title={`Book an appointment with Dr. Arpana Pillay — ${type}`}
          width="100%"
          className="h-[600px] sm:h-[700px] block"
          style={{ border: 0 }}
          onError={() => setIframeError(true)}
          loading="lazy"
          aria-label="Google Calendar appointment booking"
        />
      ) : (
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
          <p className="text-xs text-slate-400 mt-4">Appointment confirmations go directly to your email.</p>
        </div>
      )}
    </div>
  )
}
