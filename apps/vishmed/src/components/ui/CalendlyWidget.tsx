'use client'

import { useEffect } from 'react'
import { siteConfig } from '@/lib/config'

export function CalendlyWidget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  if (!siteConfig.calendlyUrl) {
    return (
      <div className="bg-slate-100 rounded-2xl p-8 text-center text-slate-500 h-[500px] flex items-center justify-center">
        <p>Online booking coming soon. Please call us at <a href={`tel:${siteConfig.phone.replace(/[^0-9]/g, '')}`} className="text-primary font-semibold">{siteConfig.phone}</a> to schedule.</p>
      </div>
    )
  }

  return (
    <div
      className="calendly-inline-widget w-full rounded-2xl overflow-hidden"
      data-url={siteConfig.calendlyUrl}
      style={{ minWidth: '320px', height: '700px' }}
      aria-label="Appointment booking calendar"
      role="region"
    />
  )
}
