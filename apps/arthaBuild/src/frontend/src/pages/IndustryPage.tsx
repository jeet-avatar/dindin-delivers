import { useParams, Navigate, Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';
import SchemaMarkup from '../components/ui/SchemaMarkup';
import { industrySolutions } from '../data/industrySolutions';

export default function IndustryPage() {
  const { industry } = useParams<{ industry: string }>();
  const data = industrySolutions.find(i => i.slug === industry);

  if (!data) return <Navigate to="/solutions" replace />;

  return (
    <div style={{ background: '#030308', minHeight: '100vh', color: '#e2e8f0' }}>
      <SEO
        title={`ArthaBuild for ${data.name} — NetSuite AI Automation`}
        description={data.subheadline}
        path={`/solutions/${data.slug}`}
      />
      <SchemaMarkup
        page="industry"
        industryName={data.name}
        industryDescription={data.subheadline}
        breadcrumbs={[
          { name: 'ArthaBuild', url: 'https://artha.build' },
          { name: 'Solutions', url: 'https://artha.build/solutions' },
          { name: data.name, url: `https://artha.build/solutions/${data.slug}` },
        ]}
      />

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#64748b', marginBottom: 32 }}>
          <Link to="/" style={{ color: '#6366f1', textDecoration: 'none' }}>ArthaBuild</Link>
          <span>/</span>
          <Link to="/solutions" style={{ color: '#6366f1', textDecoration: 'none' }}>Solutions</Link>
          <span>/</span>
          <span>{data.name}</span>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{data.icon}</div>
          <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16, background: 'linear-gradient(135deg, #a5b4fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {data.headline}
          </h1>
          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 640, margin: '0 auto 32px' }}>{data.subheadline}</p>
          <Link to="/create-account" style={{ display: 'inline-block', background: '#6366f1', color: 'white', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            Get Early Access →
          </Link>
        </div>

        {/* Metrics strip */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 64, flexWrap: 'wrap' }}>
          {data.metrics.map(m => (
            <div key={m.label} style={{ flex: 1, minWidth: 160, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#a5b4fc' }}>{m.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{m.vs}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Use Cases */}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>What ArthaBuild Automates for {data.name}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 64 }}>
          {data.useCases.map(uc => (
            <div key={uc.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '24px' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{uc.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: '#f1f5f9' }}>{uc.title}</h3>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>User types:</div>
              <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 }}>"{uc.prompt}"</p>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ArthaBuild generates:</div>
              <p style={{ fontSize: 13, color: '#a5b4fc', lineHeight: 1.5 }}>{uc.output}</p>
            </div>
          ))}
        </div>

        {/* Example Prompts */}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Example Prompts</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 64 }}>
          {data.examplePrompts.map((prompt, i) => (
            <div key={i} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 700, paddingTop: 2 }}>→</span>
              <span style={{ color: '#e2e8f0', fontSize: 15, fontStyle: 'italic' }}>"{prompt}"</span>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Ready to automate your NetSuite workflows?</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>Get early access to ArthaBuild and build your first SuiteScript in minutes — no developer needed.</p>
          <Link to="/create-account" style={{ display: 'inline-block', background: '#6366f1', color: 'white', padding: '14px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            Get Early Access Free →
          </Link>
        </div>
      </div>
    </div>
  );
}
