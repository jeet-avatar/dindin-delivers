import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { NavBar } from '../components/NavBar'
import { signup } from '../lib/auth'

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signup(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="text"
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="email"
              required
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '14px 16px', color: 'var(--text)', fontSize: 15, outline: 'none',
              }}
            />
            {error && (
              <div style={{
                color: '#ff453a', background: 'rgba(255,69,58,0.08)',
                border: '1px solid rgba(255,69,58,0.2)', borderRadius: 10,
                padding: '10px 14px', fontSize: 14, textAlign: 'left',
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--zietra)', color: '#fff', border: 'none',
                borderRadius: 12, padding: '15px', fontSize: 16, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

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
