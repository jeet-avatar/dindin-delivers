import { Link } from 'react-router'
import { NavBar } from '../components/NavBar'

export default function LoginPage() {
  return (
    <>
      <NavBar />
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px',
      }}>
        <div className="glass-card" style={{ padding: 48, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--zietra)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20,
            }}>Z</div>
            <span style={{ fontWeight: 600, fontSize: 20 }}>Zietra</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 32 }}>Sign in to your Zietra account</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              placeholder="Email address"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <button style={{
              background: 'var(--zietra)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Sign in
            </button>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--zietra)', fontWeight: 500 }}>Sign up free</Link>
          </p>
        </div>
      </main>
    </>
  )
}
