const TABS = ['CRM', 'Social', 'Meet', 'Video', 'AI Strategy']

const SIDEBAR_ITEMS = [
  { label: 'Pipeline', color: 'var(--crm)' },
  { label: 'Contacts', color: 'var(--crm)' },
  { label: 'Campaigns', color: 'var(--zietra)' },
  { label: 'Social', color: 'var(--social)' },
  { label: 'Meetings', color: 'var(--meet)' },
  { label: 'Analytics', color: 'var(--text-3)' },
]

const STATS = [
  { label: 'Active Deals', value: '48', delta: '+12%', color: 'var(--crm)' },
  { label: 'Reply Rate', value: '31%', delta: '+8%', color: 'var(--meet)' },
  { label: 'Posts Today', value: '14', delta: '+3', color: 'var(--social)' },
  { label: 'Meetings', value: '7', delta: 'this week', color: 'var(--zietra)' },
]

const CONTACTS = [
  { name: 'Sarah Chen', role: 'VP Marketing', score: 92 },
  { name: 'Marcus Reid', role: 'CTO, Fintech', score: 87 },
  { name: 'Priya Sharma', role: 'Founder, SaaS', score: 79 },
]

export function DashboardMockup3D() {
  return (
    <div style={{ animation: 'float 7s ease-in-out infinite' }}>
      <div
        style={{
          transform: 'perspective(1400px) rotateX(14deg) rotateY(-7deg)',
          transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
          width: 680, height: 420,
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={e =>
          (e.currentTarget.style.transform =
            'perspective(1400px) rotateX(3deg) rotateY(0deg)')
        }
        onMouseLeave={e =>
          (e.currentTarget.style.transform =
            'perspective(1400px) rotateX(14deg) rotateY(-7deg)')
        }
      >
        {/* ── Titlebar ── */}
        <div style={{
          height: 36, background: 'rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 16, flexShrink: 0,
        }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>

          {/* Module tabs */}
          <div style={{ display: 'flex', gap: 0, flex: 1 }}>
            {TABS.map((tab, i) => (
              <div key={tab} style={{
                padding: '0 12px', height: 36, display: 'flex', alignItems: 'center',
                fontSize: 11, fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? '#fff' : 'rgba(255,255,255,0.35)',
                borderBottom: i === 0 ? '2px solid var(--zietra)' : '2px solid transparent',
              }}>{tab}</div>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar */}
          <div style={{
            width: 140, background: 'rgba(0,0,0,0.3)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            padding: '12px 0', flexShrink: 0,
          }}>
            {SIDEBAR_ITEMS.map(item => (
              <div key={item.label} style={{
                padding: '7px 16px', fontSize: 11, color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {STATS.map(stat => (
                <div key={stat.label} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 9, color: 'var(--meet)', marginTop: 2 }}>{stat.delta}</div>
                </div>
              ))}
            </div>

            {/* Fake bar chart */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 8 }}>Pipeline by stage</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 48 }}>
                {[60, 45, 80, 35, 55, 70, 30].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${h}%`,
                    background: `rgba(41,151,255,${0.3 + i * 0.08})`,
                    borderRadius: '3px 3px 0 0',
                  }} />
                ))}
              </div>
            </div>

            {/* Contact rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CONTACTS.map(c => (
                <div key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--zietra-dim)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--zietra)',
                    flexShrink: 0,
                  }}>
                    {c.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{c.role}</div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: c.score > 85 ? 'var(--meet)' : 'var(--crm)',
                  }}>
                    {c.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
