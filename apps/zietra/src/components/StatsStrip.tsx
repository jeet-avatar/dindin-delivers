const STATS = [
  { value: '500+',  label: 'SMBs growing on Zietra' },
  { value: '3.2×',  label: 'higher reply rate' },
  { value: '$93',   label: 'saved per month' },
  { value: '5',     label: 'tools replaced' },
]

export function StatsStrip() {
  return (
    <div style={{
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 24, textAlign: 'center',
      }}>
        {STATS.map(stat => (
          <div key={stat.label}>
            <div style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 700, letterSpacing: '-0.03em',
              color: 'var(--text)',
              marginBottom: 6,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
