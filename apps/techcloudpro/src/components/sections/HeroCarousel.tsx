import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Scene3D } from '../3d'
import { Badge } from '../ui/Badge'
import { TrendPill } from '../ui/TrendPill'
import { heroSlides } from '../../data/heroSlides'

export function HeroCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = heroSlides.length

  const next = useCallback(() => setCurrent(i => (i + 1) % total), [total])
  const prev = useCallback(() => setCurrent(i => (i - 1 + total) % total), [total])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, 5500)
    return () => clearInterval(timer)
  }, [paused, next])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev])

  const slide = heroSlides[current]

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Scene3D />

      {/* Slide content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Text */}
        <div className="flex-1 max-w-xl" key={current}>
          <Badge label={slide.badge.label} variant={slide.badge.variant as 'hot' | 'new' | 'trend'} dot className="mb-6" />

          <h1 className="text-4xl md:text-5xl lg:text-[58px] font-extrabold leading-[1.06] tracking-tight mb-5">
            {slide.heading}
            <span className={slide.gradientClass}>{slide.gradientText}</span>
            {slide.heading.includes('Future') ? ' Is Now' : ''}
            {slide.heading.includes('Secure') ? ' With Zero Trust' : ''}
          </h1>

          <p className="text-base md:text-[17px] text-[var(--text-dim)] leading-relaxed mb-6">
            {slide.lead}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-7">
            {slide.pills.map(pill => (
              <TrendPill key={pill.label} label={pill.label} variant={pill.variant as 'fire' | 'bolt' | 'leaf' | 'gem' | 'default'} />
            ))}
          </div>

          <Link
            to={slide.ctaHref}
            className={`inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5 ${
              slide.ctaColor === 'orange'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/30'
            }`}
          >
            {slide.ctaText}
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Floating cards */}
        <div className="flex-1 relative min-h-[380px] hidden lg:block">
          {slide.cards.map((card, i) => (
            <div
              key={card.title}
              className="absolute bg-[var(--glass)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-5 shadow-xl [.light_&]:bg-white/80 [.light_&]:shadow-md"
              style={{
                width: i === 0 ? 260 : i === 1 ? 240 : 230,
                top: i === 0 ? 0 : i === 1 ? 160 : 300,
                right: i === 0 ? 20 : i === 1 ? 200 : 40,
                animation: `float-card 7s ease-in-out infinite`,
                animationDelay: `${-i * 2.5}s`,
              }}
            >
              {/* Icon + title */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${card.iconColor}-500/15`}>
                  <div className={`w-4 h-4 rounded-full bg-${card.iconColor}-400`} />
                </div>
                <span className="text-[13px] font-semibold">{card.title}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug mb-2">{card.subtitle}</p>

              {/* Metric or bar */}
              {card.metric && (
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className={`text-2xl font-extrabold text-${card.iconColor}-400`}>{card.metric.value}</span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{card.metric.label}</span>
                </div>
              )}
              {card.barWidth && (
                <div className="h-[3px] rounded-full bg-white/5 mt-2.5">
                  <div className={`h-full rounded-full bg-gradient-to-r from-${card.iconColor}-500 to-${card.iconColor}-400`} style={{ width: card.barWidth }} />
                </div>
              )}

              {/* Tag */}
              {card.tag && (
                <span className={`inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide ${
                  card.tag.variant === 'hot' ? 'bg-orange-500/15 text-orange-400' :
                  card.tag.variant === 'new' ? 'bg-blue-500/15 text-blue-400' :
                  'bg-emerald-500/15 text-emerald-400'
                }`}>
                  {card.tag.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows */}
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-xl glass flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" aria-label="Previous slide">
        <ChevronLeft size={18} />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-xl glass flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" aria-label="Next slide">
        <ChevronRight size={18} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${i === current ? 'w-8 bg-blue-600' : 'w-2 bg-white/15 hover:bg-white/25'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
