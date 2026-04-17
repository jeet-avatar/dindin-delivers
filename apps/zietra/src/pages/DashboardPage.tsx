import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getSession, signOut, type Session } from '../lib/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const s = getSession()
    if (!s) {
      navigate('/login')
      return
    }
    setSession(s)
  }, [navigate])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  if (!session) return null

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      padding: '80px 24px',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 48,
        }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)',
          }}>
            <div style={{
              width: 32, height: 32, background: 'var(--zietra)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 18,
            }}>Z</div>
            <span style={{ fontWeight: 600, fontSize: 18 }}>Zietra</span>
          </Link>
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text)', borderRadius: 10, padding: '8px 16px',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </header>

        <div className="glass-card" style={{ padding: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Welcome, {session.name}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: 16, marginBottom: 32 }}>
            Signed in as <span style={{ color: 'var(--text)' }}>{session.email}</span>
          </p>

          <div style={{
            background: 'rgba(41,151,255,0.08)', border: '1px solid rgba(41,151,255,0.2)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 32,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--zietra)', marginBottom: 6 }}>
              Your Zietra workspace is being provisioned
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5 }}>
              Zietra is delivered as a managed platform. Our team will reach out within
              1 business day to set up your CRM, Social, and Meetings workspaces.
              In the meantime, try Zietra Meet — no account needed.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <DashboardTile
              color="var(--crm)"
              title="CRM"
              body="Contact management, campaigns, visitor tracking."
              status="Pending provisioning"
            />
            <DashboardTile
              color="var(--social)"
              title="Social"
              body="Multi-platform scheduling and AI-generated video."
              status="Pending provisioning"
            />
            <DashboardTile
              color="var(--meet)"
              title="Meetings"
              body="HD video calls with live AI summaries."
              status="Available"
              href="https://meet.zietra.com"
            />
          </div>
        </div>
      </div>
    </main>
  )
}

function DashboardTile(props: {
  color: string
  title: string
  body: string
  status: string
  href?: string
}) {
  const content = (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 20, height: '100%',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: props.color, marginBottom: 12, opacity: 0.9,
      }} />
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{props.title}</div>
      <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
        {props.body}
      </div>
      <div style={{ fontSize: 12, color: props.status === 'Available' ? 'var(--meet)' : 'var(--text-3)' }}>
        {props.status}
      </div>
    </div>
  )
  if (props.href) {
    return (
      <a href={props.href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </a>
    )
  }
  return content
}
