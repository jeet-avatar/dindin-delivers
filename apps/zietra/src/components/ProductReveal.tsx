import { useEffect, useRef } from 'react'

interface ProductRevealProps {
  id?: string
  chip: string
  chipColor: string
  headline: string
  sub: string
  features: string[]
  card: React.ReactNode
  flip?: boolean
}

export function ProductReveal({ id, chip, chipColor, headline, sub, features, card, flip }: ProductRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const textSide = (
    <div style={{ flex: '0 0 420px', maxWidth: 420 }}>
      <div style={{
        display: 'inline-block', marginBottom: 20,
        background: `${chipColor}22`,
        border: `1px solid ${chipColor}44`,
        borderRadius: 980, padding: '5px 14px',
        fontSize: 12, fontWeight: 600, color: chipColor,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {chip}
      </div>
      <h2 className="section-headline" style={{ marginBottom: 16 }}>{headline}</h2>
      <p className="subheadline" style={{ marginBottom: 32 }}>{sub}</p>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 16, color: 'var(--text)' }}>
            <span style={{ color: chipColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  )

  const cardSide = (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {card}
    </div>
  )

  return (
    <section id={id} ref={ref} className="reveal" style={{
      padding: '100px 24px',
      maxWidth: 1100, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap',
        flexDirection: flip ? 'row-reverse' : 'row',
      }}>
        {textSide}
        {cardSide}
      </div>
    </section>
  )
}
