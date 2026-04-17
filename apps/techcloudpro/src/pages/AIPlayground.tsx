import { SEO } from '../components/ui'
import { Link } from 'react-router'

const C = {
  bg: '#060609',
  bgCard: '#0a0d16',
  border: 'rgba(255,255,255,0.07)',
  orange: '#FF6B35',
  text: '#F1F5F9',
  textDim: '#94A3B8',
  textMuted: '#64748B',
}

export default function AIPlayground() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingTop: '80px' }}>
      <SEO
        title="AI Architecture Playground — Free Tool | TechCloudPro"
        description="Design, score, and export your AI architecture for free. Interactive drag-and-drop playground powered by TechCloudPro."
        path="/tools/ai-playground"
      />

      {/* Hero strip */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.75rem 1rem 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color: C.text, margin: 0 }}>
            AI Architecture Playground
          </h1>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '100px', background: 'rgba(255,107,53,0.12)', color: C.orange, border: '1px solid rgba(255,107,53,0.25)', whiteSpace: 'nowrap' }}>
            Free · No signup
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: C.textMuted, marginTop: '0.2rem', lineHeight: 1.4 }}>
          Pick a use case → add components → wire them → score your architecture → download PNG.
        </p>
      </div>

      {/* Iframe */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0.75rem' }}>
        <iframe
          src="/tools/ai-playground.html"
          title="AI Architecture Playground"
          style={{
            width: '100%',
            height: 'calc(100dvh - 180px)',
            minHeight: '520px',
            border: 'none',
            borderRadius: '10px',
            display: 'block',
          }}
        />
      </div>

      {/* Below iframe: Study Guide download + Consulting CTA */}
      <div style={{ maxWidth: '1400px', margin: '1rem auto 2.5rem', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Study guide download button */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/tools/rag-study-guide.html"
            download="TechCloudPro-AI-Study-Guide.html"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.4rem', borderRadius: '8px',
              border: `1px solid ${C.border}`, color: C.textDim,
              fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.2)'
              ;(e.currentTarget as HTMLAnchorElement).style.color = C.text
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border
              ;(e.currentTarget as HTMLAnchorElement).style.color = C.textDim
            }}
          >
            📖 Download Study Guide
          </a>
        </div>

        {/* Consulting CTA card */}
        <div style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          padding: 'clamp(1.25rem, 4vw, 2rem)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}>
          <div style={{ flex: '1 1 280px' }}>
            <h2 style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', fontWeight: 700, color: C.text, margin: '0 0 0.4rem' }}>
              Need help building this?
            </h2>
            <p style={{ fontSize: 'clamp(0.78rem, 2vw, 0.875rem)', color: C.textDim, margin: 0, lineHeight: 1.6 }}>
              Our AI architects design and deploy your AI system — from diagram to production in weeks. RAG pipelines, agentic workflows, private LLMs for enterprise clients across North America.
            </p>
          </div>
          <Link
            to="/contact"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.7rem 1.5rem', borderRadius: '8px',
              background: C.orange, color: '#fff',
              fontSize: 'clamp(0.82rem, 2vw, 0.9rem)', fontWeight: 600, textDecoration: 'none',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Book a Free Call →
          </Link>
        </div>

      </div>
    </div>
  )
}
