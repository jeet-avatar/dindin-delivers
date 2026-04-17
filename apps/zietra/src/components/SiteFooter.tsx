import { Link } from 'react-router'

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'CRM', href: '#features' },
      { label: 'Social', href: '#features' },
      { label: 'Meetings', href: '#features' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer style={{
      background: 'var(--bg-2)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '64px 24px 32px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 48, marginBottom: 48,
        }}>
          {/* Brand col */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 30, height: 30, background: 'var(--zietra)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 17,
              }}>Z</div>
              <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Zietra</span>
            </Link>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 220 }}>
              One platform for every SMB tool. CRM, social, meetings, video, and AI strategy — built together.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
              A TechCloudPro product
            </p>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
                {col.title}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      style={{ fontSize: 14, color: 'var(--text-2)', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            © 2026 Zietra Technologies inc. All rights reserved.
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
            The all-in-one SMB growth platform.
          </span>
        </div>
      </div>
    </footer>
  )
}
