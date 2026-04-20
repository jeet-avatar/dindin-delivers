import { useSearchParams } from 'react-router-dom';

const STREAMS = [
  { id: 'ai-ml', name: 'AI / Machine Learning', roles: ['GenAI / LLM Engineer', 'ML Platform Engineer', 'Computer Vision Specialist', 'NLP Engineer', 'MLOps Engineer', 'Data Scientist'], count: 50, color: '#a855f7' },
  { id: 'cloud', name: 'Cloud & DevOps', roles: ['AWS Solutions Architect', 'Azure Cloud Engineer', 'GCP Platform Engineer', 'Kubernetes Admin', 'Terraform/IaC Expert', 'SRE / Reliability Engineer'], count: 40, color: '#3b82f6' },
  { id: 'cybersecurity', name: 'Cybersecurity', roles: ['Penetration Tester', 'SOC Analyst', 'Security Architect', 'DevSecOps Engineer', 'GRC Consultant', 'Incident Response Lead'], count: 30, color: '#ef4444' },
  { id: 'fullstack', name: 'Full-Stack Development', roles: ['React / Next.js Developer', 'Node.js Backend Dev', 'Python / Django Developer', '.NET Full-Stack Dev', 'Java Spring Boot Dev', 'Vue.js / Nuxt Developer'], count: 60, color: '#6366f1' },
  { id: 'data', name: 'Data Engineering', roles: ['Spark / Databricks Engineer', 'Snowflake Data Engineer', 'dbt Analytics Engineer', 'Kafka Streaming Engineer', 'Power BI Developer', 'Airflow / Dagster Engineer'], count: 35, color: '#22d3ee' },
  { id: 'devops', name: 'DevOps & Platform', roles: ['CI/CD Pipeline Engineer', 'GitOps (ArgoCD) Lead', 'Docker / Container Specialist', 'Observability Engineer', 'Platform Team Lead', 'Ansible Automation'], count: 25, color: '#f59e0b' },
  { id: 'enterprise', name: 'Enterprise Apps', roles: ['SAP S/4HANA Consultant', 'Salesforce Developer', 'ServiceNow Architect', 'Workday HCM Consultant', 'Dynamics 365 Developer', 'MuleSoft Integration Dev'], count: 20, color: '#10b981' },
  { id: 'mobile', name: 'Mobile Development', roles: ['iOS (Swift) Developer', 'Android (Kotlin) Developer', 'React Native Developer', 'Flutter Developer', 'UI/UX Engineer', 'Design System Developer'], count: 15, color: '#fb923c' },
];

export default function TalentPage() {
  const [searchParams] = useSearchParams();
  const focusStream = searchParams.get('stream') || '';

  const sortedStreams = focusStream
    ? [...STREAMS].sort((a, b) => (a.id === focusStream ? -1 : b.id === focusStream ? 1 : 0))
    : STREAMS;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 8px' }}>Zietra Staffing</p>
        <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700, margin: '0 0 12px' }}>
          Pre-Vetted Technology Talent
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', margin: '0 auto', maxWidth: '600px', lineHeight: 1.5 }}>
          200+ engineers across 8 technology streams. Technically assessed, ready to start within 2 weeks.
        </p>
      </div>

      {/* Streams Grid */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '20px' }}>
          {sortedStreams.map(stream => {
            const isFocused = stream.id === focusStream;
            return (
              <div key={stream.id} style={{
                background: '#1e1e36',
                border: isFocused ? `2px solid ${stream.color}` : '1px solid #2a2a44',
                borderRadius: '14px',
                padding: '24px',
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700, margin: 0 }}>{stream.name}</h3>
                  <span style={{ background: `${stream.color}20`, color: stream.color, padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                    {stream.count}+ available
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {stream.roles.map(role => (
                    <span key={role} style={{ background: 'rgba(255,255,255,0.05)', color: '#CBD5E1', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #3d3d5c' }}>
                      {role}
                    </span>
                  ))}
                </div>
                <a
                  href={`/schedule?stream=${stream.id}`}
                  style={{
                    display: 'inline-block', padding: '10px 20px', borderRadius: '8px',
                    background: `linear-gradient(135deg, ${stream.color}, ${stream.color}cc)`,
                    color: '#fff', fontWeight: 600, fontSize: '13px', textDecoration: 'none',
                  }}
                >
                  Request {stream.name} Profiles
                </a>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '40px', padding: '30px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px' }}>
          <h2 style={{ color: '#F1F5F9', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Need a Custom Search?</h2>
          <p style={{ color: '#94A3B8', fontSize: '15px', margin: '0 0 20px' }}>
            Don't see the exact role? We source niche talent across any technology stack.
          </p>
          <a
            href="/schedule"
            style={{
              display: 'inline-block', padding: '14px 32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff', fontWeight: 700, fontSize: '15px', textDecoration: 'none',
            }}
          >
            Schedule a Discovery Call
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '30px 20px', borderTop: '1px solid #2a2a44' }}>
        <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 8px' }}>
          Zietra &middot; Premium Technology Staffing &middot; Powered by Zietra
        </p>
        <p style={{ color: '#4a4a6a', fontSize: '12px', margin: 0 }}>
          <a href="mailto:rajesh@zietra.com" style={{ color: '#6366F1', textDecoration: 'none' }}>rajesh@zietra.com</a>
        </p>
      </div>
    </div>
  );
}
