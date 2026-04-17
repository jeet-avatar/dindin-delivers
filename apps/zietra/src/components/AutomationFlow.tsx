import { useEffect, useRef } from 'react'

const STEPS = [
  {
    day: 'Day 1', icon: '🧭', title: 'Onboard',
    desc: 'Import contacts, connect social, invite team in 5 minutes.',
    color: 'var(--zietra)',
  },
  {
    day: 'Day 2', icon: '✍️', title: 'Create',
    desc: 'AI drafts your first week of social posts and email sequences.',
    color: 'var(--social)',
  },
  {
    day: 'Day 4', icon: '🚀', title: 'Launch',
    desc: 'Campaigns go live across LinkedIn, Instagram, and email.',
    color: 'var(--crm)',
  },
  {
    day: 'Day 7', icon: '🔁', title: 'Follow-Up',
    desc: 'AI surfaces warm leads, books meetings, and sends reminders.',
    color: 'var(--meet)',
  },
  {
    day: 'Day 14', icon: '🏆', title: 'Close',
    desc: 'Deals move through your pipeline with AI-written proposals.',
    color: 'var(--video)',
  },
]

export function AutomationFlow() {
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
    <section id="automation" ref={ref} className="reveal" style={{
      padding: '100px 24px',
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 12 }}>
            How it works
          </div>
          <h2 className="section-headline">From onboarding to closed deal in 14 days.</h2>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute', top: 28, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--zietra), var(--social), var(--crm), var(--meet), var(--video))',
            opacity: 0.3,
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 24 }}>
            {STEPS.map(step => (
              <div key={step.title} style={{ textAlign: 'center' }}>
                {/* Icon circle */}
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  border: `2px solid ${step.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, margin: '0 auto 16px',
                  transition: 'transform 0.2s',
                  cursor: 'default',
                  position: 'relative', zIndex: 1, background: 'var(--bg-2)',
                  boxShadow: `0 0 0 4px var(--bg-2)`,
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {step.icon}
                </div>
                <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{step.day}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: step.color, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
