'use client'

import { useState } from 'react'
import { siteConfig } from '@/lib/config'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormState('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      })

      if (res.ok) {
        setFormState('success')
        setName('')
        setEmail('')
        setPhone('')
        setMessage('')
      } else {
        setFormState('error')
      }
    } catch {
      setFormState('error')
    }
  }

  const inputClass =
    'w-full min-h-[44px] px-4 py-2.5 text-base text-slate-800 bg-white border border-slate-300 rounded-lg focus-visible:outline-[3px] focus-visible:outline-primary focus-visible:border-primary motion-safe:transition-colors motion-safe:duration-150 placeholder:text-slate-400'

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
      <div className="space-y-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 mb-1">
            Full Name <span aria-label="required">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            className={inputClass}
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={formState === 'loading'}
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email Address <span aria-label="required">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formState === 'loading'}
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className="block text-sm font-medium text-slate-700 mb-1">
            Phone Number <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder="(407) 555-0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={formState === 'loading'}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700 mb-1">
            Message <span aria-label="required">*</span>
          </label>
          <textarea
            id="contact-message"
            required
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="How can we help you today?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={formState === 'loading'}
            aria-required="true"
          />
        </div>

        {formState === 'success' && (
          <div
            role="alert"
            aria-live="polite"
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium"
          >
            Thank you! We&apos;ll be in touch within 1 business day.
          </div>
        )}

        {formState === 'error' && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm font-medium"
          >
            Something went wrong. Please call us at{' '}
            <a href={`tel:${siteConfig.phone.replace(/[^0-9]/g, '')}`} className="underline">
              {siteConfig.phone}
            </a>
            .
          </div>
        )}

        <button
          type="submit"
          disabled={formState === 'loading'}
          className="w-full min-h-[44px] bg-cta text-white hover:bg-cta-dark disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-cta-dark"
          aria-disabled={formState === 'loading'}
        >
          {formState === 'loading' ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  )
}
