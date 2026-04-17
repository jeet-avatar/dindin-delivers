import { Link } from 'react-router'
import { DashboardMockup3D } from './DashboardMockup3D'

export function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '120px 24px 80px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, rgba(41,151,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '60%', left: '30%',
        width: 300, height: 300,
        background: 'radial-gradient(ellipse, rgba(191,90,242,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Animated chip */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(41,151,255,0.12)',
        border: '1px solid rgba(41,151,255,0.25)',
        borderRadius: 980, padding: '6px 16px',
        marginBottom: 32,
        animation: 'fadeIn 0.6s ease',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--zietra)' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--zietra)' }}>
          Public beta — CRM free to start
        </span>
      </div>

      {/* H1 */}
      <h1 className="hero-headline" style={{
        maxWidth: 800,
        marginBottom: 24,
        animation: 'fadeInUp 0.7s ease 0.1s both',
      }}>
        One platform.{' '}
        <span className="gradient-text">Every SMB tool.</span>
      </h1>

      {/* Subheadline */}
      <p className="subheadline" style={{
        maxWidth: 560,
        marginBottom: 40,
        animation: 'fadeInUp 0.7s ease 0.2s both',
      }}>
        CRM, social scheduling, video meetings, AI strategy — built together so nothing
        falls through the cracks.
      </p>

      {/* CTAs */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 80,
        animation: 'fadeInUp 0.7s ease 0.3s both',
      }}>
        <Link to="/signup" style={{
          background: 'var(--zietra)', color: '#fff',
          padding: '16px 32px', borderRadius: 980,
          fontSize: 17, fontWeight: 600,
          transition: 'opacity 0.2s, transform 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.03)' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
        >
          Get started free
        </Link>
        <button
          onClick={() => document.getElementById('automation')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--zietra)', fontSize: 17, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          Watch demo ›
        </button>
      </div>

      {/* 3D Dashboard */}
      <div style={{
        animation: 'fadeInUp 0.9s ease 0.4s both',
        maxWidth: '100%', overflowX: 'hidden',
        display: 'flex', justifyContent: 'center',
      }}>
        <DashboardMockup3D />
      </div>
    </section>
  )
}
