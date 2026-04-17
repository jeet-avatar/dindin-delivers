import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { TIERS } from '../data/pricing'

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="pricing" ref={ref} className="reveal" style={{
      padding: '100px 24px',
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 12 }}>
            Pricing
          </div>
          <h2 className="section-headline">Simple pricing. Cancel anytime.</h2>
          <p className="subheadline" style={{ marginTop: 16 }}>
            Start free. Upgrade when you're ready.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className="glass-card"
              style={{
                padding: 32,
                border: tier.featured
                  ? '1px solid color-mix(in srgb, var(--zietra) 50%, transparent)'
                  : '1px solid var(--glass-border)',
                position: 'relative',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--zietra)', color: '#fff',
                  padding: '4px 14px', borderRadius: 980,
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {tier.badge}
                </div>
              )}

              {/* Tier name */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>
                {tier.name}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                {tier.price === 'Custom' ? (
                  <span style={{ fontSize: 36, fontWeight: 700 }}>Custom</span>
                ) : (
                  <>
                    <span style={{ fontSize: 14, color: 'var(--text-2)', alignSelf: 'flex-start', paddingTop: 6 }}>$</span>
                    <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em' }}>
                      {tier.price}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{tier.period}</span>
                  </>
                )}
              </div>

              {/* CTA */}
              <Link to="/signup" style={{
                display: 'block', textAlign: 'center',
                background: tier.featured ? 'var(--zietra)' : 'rgba(255,255,255,0.08)',
                color: tier.featured ? '#fff' : 'var(--text)',
                border: tier.featured ? 'none' : '1px solid rgba(255,255,255,0.15)',
                padding: '14px 0', borderRadius: 12,
                fontSize: 15, fontWeight: 600, marginBottom: 28,
                transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {tier.cta}
              </Link>

              {/* Feature list */}
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                    <span style={{ color: 'var(--meet)', flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
