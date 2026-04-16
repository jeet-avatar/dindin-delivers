import { Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';
import SchemaMarkup from '../components/ui/SchemaMarkup';
import { industrySolutions } from '../data/industrySolutions';

export default function Solutions() {
  return (
    <div style={{ background: '#030308', minHeight: '100vh', color: '#e2e8f0' }}>
      <SEO
        title="ArthaBuild for NetSuite — AI Automation by Industry"
        description="See how ArthaBuild automates NetSuite workflows for manufacturing, retail, food & beverage, SaaS, professional services, and healthcare."
        path="/solutions"
      />
      <SchemaMarkup
        page="solutions-hub"
        breadcrumbs={[
          { name: 'ArthaBuild', url: 'https://artha.build' },
          { name: 'Solutions', url: 'https://artha.build/solutions' },
        ]}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <Link to="/" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none' }}>← ArthaBuild</Link>
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '24px 0 8px', background: 'linear-gradient(135deg, #a5b4fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NetSuite AI Automation by Industry
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 56 }}>
          ArthaBuild generates, tests, and deploys SuiteScript for your specific vertical — no generic outputs, no hallucination.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {industrySolutions.map(industry => (
            <Link key={industry.slug} to={`/solutions/${industry.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '28px',
                transition: 'border-color 0.15s, transform 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{industry.icon}</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{industry.name}</h2>
                <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                  {industry.subheadline}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                  {industry.useCases.slice(0, 3).map(uc => (
                    <li key={uc.title} style={{ fontSize: 13, color: '#64748b', marginBottom: 4, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#6366f1' }}>✓</span> {uc.title}
                    </li>
                  ))}
                </ul>
                <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>Explore {industry.name} →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
