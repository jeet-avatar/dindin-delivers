import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { NavBar } from '../components/NavBar'
import { login } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
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

          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 24 }}>Sign in to your Zietra account</p>

          <div style={{
            background: 'rgba(41,151,255,0.08)', border: '1px solid rgba(41,151,255,0.2)',
            borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--text-2)',
            marginBottom: 24, textAlign: 'left',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--zietra)', marginBottom: 4 }}>Demo access</div>
            <div>Email: <code style={{ color: 'var(--text)' }}>demo@zietra.com</code></div>
            <div>Password: <code style={{ color: 'var(--text)' }}>Zietra2026!</code></div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              required
              placeholder="Email address"
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--zietra)', fontWeight: 500 }}>Sign up free</Link>
          </p>
        </div>
      </main>
    </>
  )
}
