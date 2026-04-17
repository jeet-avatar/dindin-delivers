import { useState, useEffect } from 'react'
import { Link } from 'react-router'

export function NavBar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
      background: scrolled ? 'rgba(0,0,0,0.72)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-bottom 0.3s ease',
    }}>

      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, background: 'var(--zietra)',
          borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17,
          flexShrink: 0,
        }}>Z</div>
        <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Zietra</span>
      </Link>

      {/* Center links — hidden below 768px via className */}
      <div className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <a href="#features" style={{ color: 'var(--text-2)', fontSize: 14 }}>Features</a>
        <a href="#stories" style={{ color: 'var(--text-2)', fontSize: 14 }}>Success stories</a>
        <Link to="/pricing" style={{ color: 'var(--text-2)', fontSize: 14 }}>Pricing</Link>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/login" style={{ color: 'var(--text-2)', fontSize: 14, fontWeight: 400 }}>
          Sign in
        </Link>
        <Link to="/signup" style={{
          background: 'var(--zietra)', color: '#fff',
          padding: '8px 20px', borderRadius: 980,
          fontSize: 14, fontWeight: 500,
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Start free
        </Link>
      </div>
    </nav>
  )
}
