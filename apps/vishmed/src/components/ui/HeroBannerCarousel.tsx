'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const slides = [
  {
    image: '/photos/patient-consultation.jpg',
    imageAlt: 'Internal Medicine physician providing expert medical care in Central Florida',
    heading: 'The Journey Begins with You',
    sub: 'Internal Medicine physician Dr. Arpana Pillay delivers personalized primary care, metabolic wellness, and weight loss programs — right here in Orlando.',
    badge: 'Accepting New Patients',
    cta: { label: 'Book Appointment', href: '/contact' },
    ctaSecondary: { label: 'Meet Dr. Pillay', href: '/about' },
  },
  {
    image: '/photos/nurse-bp-check.jpg',
    imageAlt: 'Medical weight loss program with GLP-1 FDA-approved treatments',
    heading: 'Real Results. Medical Science.',
    sub: 'Physician-supervised GLP-1 programs — Semaglutide & Tirzepatide — deliver 15–20% average body weight reduction. FDA-approved. Starting at $99 consultation.',
    badge: 'FDA-Approved Treatments',
    cta: { label: 'View Pricing', href: '/pricing' },
    ctaSecondary: { label: 'See All Services', href: '/services' },
  },
  {
    image: '/photos/reception-desk.jpg',
    imageAlt: 'Telehealth and in-office care available in Central Florida',
    heading: 'Care That Fits Your Life',
    sub: 'Telehealth appointments Monday–Friday evenings. In-office Saturdays 9 AM–4 PM. Expert care on your schedule — new patients always welcome.',
    badge: 'Telehealth Available',
    cta: { label: 'Book Telehealth', href: '/telehealth' },
    ctaSecondary: { label: 'Patient Info', href: '/patient-info' },
  },
]

export function HeroBannerCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [next, paused])

  return (
    <section
      className="relative h-[75vh] min-h-[520px] max-h-[780px] overflow-hidden"
      aria-label="Hero banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.heading}
          className={`absolute inset-0 motion-safe:transition-opacity motion-safe:duration-700 ${
            i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          aria-hidden={i !== current}
        >
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority={i === 0}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/30" aria-hidden="true" />

          {/* Content */}
          <div className="relative z-10 h-full flex items-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto w-full">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 bg-cta/90 text-white text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" aria-hidden="true" />
                  {slide.badge}
                </span>
                <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4">
                  {slide.heading}
                </h1>
                <p className="text-slate-200 text-base lg:text-lg mb-8 leading-relaxed max-w-xl">
                  {slide.sub}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={slide.cta.href}
                    className="min-h-[44px] inline-flex items-center bg-cta text-white hover:bg-cta-dark px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
                    tabIndex={i === current ? 0 : -1}
                  >
                    {slide.cta.label}
                  </Link>
                  <Link
                    href={slide.ctaSecondary.href}
                    className="min-h-[44px] inline-flex items-center border-2 border-white/70 text-white hover:bg-white/15 px-6 py-3 rounded-lg font-semibold cursor-pointer motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-[3px] focus-visible:outline-white"
                    tabIndex={i === current ? 0 : -1}
                  >
                    {slide.ctaSecondary.label}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-full text-white cursor-pointer motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next slide"
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/20 hover:bg-white/35 backdrop-blur-sm rounded-full text-white cursor-pointer motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2" role="tablist" aria-label="Slide indicators">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full cursor-pointer motion-safe:transition-all motion-safe:duration-300 focus-visible:outline-[3px] focus-visible:outline-white ${
              i === current ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
