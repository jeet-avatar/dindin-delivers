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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text, margin: 0 }}>
            AI Architecture Playground
          </h1>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: '100px', background: 'rgba(255,107,53,0.12)', color: C.orange, border: '1px solid rgba(255,107,53,0.25)' }}>
            Free Tool · No signup required
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: C.textMuted, marginTop: '0.25rem' }}>
          Drag components, wire them together, score your architecture, and download a branded PNG of your design.
        </p>
      </div>

      {/* Iframe */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
        <iframe
          src="/tools/ai-playground.html"
          title="AI Architecture Playground"
          style={{
            width: '100%',
            height: 'calc(100vh - 200px)',
            minHeight: '600px',
            border: 'none',
            borderRadius: '12px',
            display: 'block',
          }}
        />
      </div>

      {/* Below iframe: Study Guide download + Consulting CTA */}
      <div style={{ maxWidth: '1400px', margin: '1.5rem auto 3rem', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

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
          padding: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, margin: '0 0 0.5rem' }}>
              Need help building this?
            </h2>
            <p style={{ fontSize: '0.875rem', color: C.textDim, margin: 0, maxWidth: '520px', lineHeight: 1.6 }}>
              Our AI architects can design and deploy your AI system — from architecture diagram to production in weeks. We've shipped RAG pipelines, agentic workflows, and private LLMs for enterprise clients across North America.
            </p>
          </div>
          <Link
            to="/contact"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.75rem', borderRadius: '8px',
              background: C.orange, color: '#fff',
              fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
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
