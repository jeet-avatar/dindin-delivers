import { Link } from 'react-router'
import { NavBar } from '../components/NavBar'

export default function SignupPage() {
  return (
    <>
      <NavBar />
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px',
      }}>
        <div className="glass-card" style={{ padding: 48, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--zietra)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20,
            }}>Z</div>
            <span style={{ fontWeight: 600, fontSize: 20 }}>Zietra</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Get started free</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 32 }}>
            Full CRM, no credit card required.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="text"
              placeholder="Full name"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="email"
              placeholder="Work email"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="Password (min. 8 characters)"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <button style={{
              background: 'var(--zietra)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Create free account
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 16 }}>
            By signing up you agree to our{' '}
            <Link to="#" style={{ color: 'var(--text-2)' }}>Terms</Link> and{' '}
            <Link to="#" style={{ color: 'var(--text-2)' }}>Privacy Policy</Link>.
          </p>

          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 16 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--zietra)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </main>
    </>
  )
}
