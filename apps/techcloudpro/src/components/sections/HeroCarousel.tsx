import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Scene3D } from '../3d'
import { Badge } from '../ui/Badge'
import { TrendPill } from '../ui/TrendPill'
import { heroSlides } from '../../data/heroSlides'

/* ─── Animated 3D visual per slide ─── */
function SlideVisual({ index }: { index: number }) {
  if (index === 0) {
    // NetSuite: rotating dashboard/ERP visual
    return (
      <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '800px' }}>
        {/* Main floating dashboard */}
        <div className="absolute w-[280px] h-[200px] rounded-2xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm p-5"
          style={{ animation: 'float-card 8s ease-in-out infinite', transform: 'rotateY(-8deg) rotateX(5deg)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-xs font-semibold text-purple-300">NetSuite Next Dashboard</span>
          </div>
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-purple-500/20 w-full"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 w-[88%]" /></div>
            <div className="h-2 rounded-full bg-purple-500/20 w-full"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 w-[65%]" /></div>
            <div className="h-2 rounded-full bg-purple-500/20 w-full"><div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400 w-[92%]" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <div className="text-center"><div className="text-lg font-extrabold text-purple-400">94%</div><div className="text-[8px] text-purple-300/60 uppercase">Faster Close</div></div>
            <div className="text-center"><div className="text-lg font-extrabold text-cyan-400">1K+</div><div className="text-[8px] text-cyan-300/60 uppercase">Users</div></div>
            <div className="text-center"><div className="text-lg font-extrabold text-pink-400">32%</div><div className="text-[8px] text-pink-300/60 uppercase">Growth</div></div>
          </div>
        </div>
        {/* Orbiting data cards */}
        <div className="absolute w-[160px] rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3 -top-2 -right-4"
          style={{ animation: 'float-card 6s ease-in-out infinite', animationDelay: '-2s' }}>
          <div className="text-[10px] font-semibold text-cyan-300">OneWorld Global</div>
          <div className="text-[9px] text-cyan-400/50 mt-1">Multi-subsidiary active</div>
          <div className="w-full h-1.5 rounded-full bg-cyan-500/10 mt-2"><div className="h-full rounded-full bg-cyan-400 w-[78%]" /></div>
        </div>
        <div className="absolute w-[140px] rounded-xl border border-orange-500/15 bg-orange-500/5 p-3 -bottom-4 -left-4"
          style={{ animation: 'float-card 7s ease-in-out infinite', animationDelay: '-4s' }}>
          <div className="text-[10px] font-semibold text-orange-300">SuiteSpots&trade;</div>
          <div className="text-[9px] text-orange-400/50 mt-1">12 connectors live</div>
        </div>
        {/* Glowing orb */}
        <div className="absolute w-32 h-32 rounded-full bg-purple-600/20 blur-[60px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    )
  }

  if (index === 1) {
    // Cybersecurity + AI: shield + nodes network
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Central shield */}
        <div className="relative w-36 h-36 flex items-center justify-center" style={{ animation: 'float-card 10s ease-in-out infinite' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path d="M50 5 L90 25 L90 55 C90 75 70 90 50 95 C30 90 10 75 10 55 L10 25 Z" fill="none" stroke="url(#shieldGrad)" strokeWidth="1.5" />
            <path d="M50 15 L80 30 L80 55 C80 70 65 82 50 87 C35 82 20 70 20 55 L20 30 Z" fill="url(#shieldGrad)" fillOpacity="0.1" />
            <text x="50" y="55" textAnchor="middle" fill="#FB7185" fontSize="10" fontWeight="bold" fontFamily="Inter">ZERO</text>
            <text x="50" y="67" textAnchor="middle" fill="#FB7185" fontSize="7" fontFamily="Inter" opacity="0.6">BREACHES</text>
          </svg>
        </div>
        {/* Floating threat nodes */}
        <div className="absolute top-4 right-8 w-[150px] rounded-xl border border-rose-500/15 bg-rose-500/5 p-3"
          style={{ animation: 'float-card 6s ease-in-out infinite', animationDelay: '-1s' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-rose-300">AI Agent Security</span>
          </div>
          <div className="text-[9px] text-rose-400/50 mt-1">Identity verified &bull; Least privilege</div>
        </div>
        <div className="absolute bottom-8 left-4 w-[140px] rounded-xl border border-blue-500/15 bg-blue-500/5 p-3"
          style={{ animation: 'float-card 7s ease-in-out infinite', animationDelay: '-3s' }}>
          <div className="text-[10px] font-semibold text-blue-300">Private LLM</div>
          <div className="text-[9px] text-blue-400/50 mt-1">VPN-only &bull; Zero leakage</div>
        </div>
        <div className="absolute top-1/2 -right-2 w-[130px] rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-2.5"
          style={{ animation: 'float-card 5s ease-in-out infinite', animationDelay: '-5s' }}>
          <div className="text-[10px] font-semibold text-emerald-300">Compliance</div>
          <div className="text-[9px] text-emerald-400/50">SOC 2 &bull; HIPAA &bull; GDPR</div>
        </div>
        {/* Connecting lines (decorative) */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 400 400">
            <line x1="200" y1="200" x2="300" y2="80" stroke="rgba(244,63,94,0.1)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="200" y1="200" x2="100" y2="320" stroke="rgba(59,130,246,0.1)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="200" y1="200" x2="350" y2="220" stroke="rgba(16,185,129,0.1)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>
        <div className="absolute w-40 h-40 rounded-full bg-rose-600/15 blur-[70px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    )
  }

  // Staffing: talent network visual
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Central talent hub */}
      <div className="relative" style={{ animation: 'float-card 9s ease-in-out infinite' }}>
        <div className="w-28 h-28 rounded-full border-2 border-emerald-500/20 flex items-center justify-center bg-emerald-500/5">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-emerald-400">3.2x</div>
            <div className="text-[8px] text-emerald-300/60 uppercase tracking-wider">YoY Growth</div>
          </div>
        </div>
        {/* Orbiting talent dots */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="absolute w-3 h-3 rounded-full bg-emerald-400/40 border border-emerald-400/30"
            style={{
              top: `${50 + 55 * Math.sin((i / 6) * Math.PI * 2)}%`,
              left: `${50 + 55 * Math.cos((i / 6) * Math.PI * 2)}%`,
              transform: 'translate(-50%, -50%)',
              animation: `pulse-dot 3s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
      {/* Talent cards */}
      <div className="absolute top-0 right-4 w-[170px] rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3"
        style={{ animation: 'float-card 6s ease-in-out infinite', animationDelay: '-1s' }}>
        <div className="text-[10px] font-semibold text-emerald-300">Talent Demand Index</div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-lg font-extrabold text-emerald-400">500+</span>
          <span className="text-[8px] text-emerald-400/50">consultants placed</span>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 w-[160px] rounded-xl border border-orange-500/15 bg-orange-500/5 p-3"
        style={{ animation: 'float-card 7s ease-in-out infinite', animationDelay: '-3s' }}>
        <div className="text-[10px] font-semibold text-orange-300">Time to Hire</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-orange-400/60 line-through">6+ months</span>
          <span className="text-xs font-bold text-orange-400">2-4 weeks</span>
        </div>
      </div>
      <div className="absolute -bottom-2 right-8 w-[140px] rounded-xl border border-purple-500/15 bg-purple-500/5 p-2.5"
        style={{ animation: 'float-card 5s ease-in-out infinite', animationDelay: '-5s' }}>
        <div className="text-[10px] font-semibold text-purple-300">Certifications</div>
        <div className="text-[9px] text-purple-400/50 mt-0.5">NetSuite &bull; CyberArk &bull; AWS</div>
      </div>
      <div className="absolute w-36 h-36 rounded-full bg-emerald-600/15 blur-[60px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
  )
}

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

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
        {/* Text */}
        <div className="flex-1 max-w-xl" key={`text-${current}`}>
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

        {/* 3D Animated Visual */}
        <div className="flex-1 relative min-h-[380px] hidden lg:block" key={`visual-${current}`}>
          <SlideVisual index={current} />
        </div>
      </div>

      {/* Nav arrows */}
      <button type="button" onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-xl glass flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" aria-label="Previous slide">
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-xl glass flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors" aria-label="Next slide">
        <ChevronRight size={18} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${i === current ? 'w-8 bg-blue-600' : 'w-2 bg-white/15 hover:bg-white/25'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
