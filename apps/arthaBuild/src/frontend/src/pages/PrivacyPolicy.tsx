export default function PrivacyPolicy() {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)' }}>

        <div style={{ marginBottom: '48px' }}>
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            ← Back to ArthaBuild
          </a>
        </div>

        <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '12px', fontFamily: 'Outfit, sans-serif', color: '#f4f4f5' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '56px' }}>
          Last updated: April 2026 &nbsp;·&nbsp; ArthaBuild by Vibing World
        </p>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            1. Who We Are
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            ArthaBuild is a product of <strong style={{ color: '#e2e8f0' }}>Vibing World inc.</strong> Our platform domain is{' '}
            <span style={{ color: '#6366f1' }}>artha.build</span>. For privacy inquiries, contact:{' '}
            <a href="mailto:privacy@artha.build" style={{ color: '#6366f1' }}>privacy@artha.build</a>
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            2. The BYOC Model — Your Data Stays With You
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>
            ArthaBuild is a <strong style={{ color: '#e2e8f0' }}>Bring Your Own Cloud (BYOC)</strong> platform.
            This means ArthaBuild runs entirely within your own infrastructure — your AWS VPC, your servers, your data.
          </p>
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px' }}>
            <p style={{ color: '#a5b4fc', fontWeight: 600, marginBottom: '12px' }}>What NEVER leaves your server:</p>
            <ul style={{ color: '#a1a1aa', lineHeight: 2, paddingLeft: '20px' }}>
              <li>NetSuite TBA credentials (token keys, consumer keys, secrets)</li>
              <li>Your SuiteScript source code</li>
              <li>Your NetSuite business data (records, transactions, reports)</li>
              <li>Chat prompts and AI-generated scripts</li>
              <li>Any data from your NetSuite account</li>
            </ul>
          </div>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            The AI (Ollama + llama3.1:8b) runs locally on your hardware. The vector knowledge base is
            shipped pre-built and stored on your server. There are zero external LLM API calls.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            3. Data We Collect
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>
            The only data stored in ArthaBuild's systems (your local database) is:
          </p>
          <ul style={{ color: '#a1a1aa', lineHeight: 2, paddingLeft: '20px', marginBottom: '16px' }}>
            <li><strong style={{ color: '#e2e8f0' }}>Account information:</strong> name, email address, bcrypt password hash</li>
            <li><strong style={{ color: '#e2e8f0' }}>Session data:</strong> JWT tokens (in-memory only, not persisted)</li>
            <li><strong style={{ color: '#e2e8f0' }}>Deploy records:</strong> script names and deployment targets (for license quota tracking)</li>
          </ul>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            <strong style={{ color: '#e2e8f0' }}>Analytics:</strong> ArthaBuild uses a self-hosted analytics system. We collect anonymised page views,
            scroll depth, and time-on-page data. No cookies are used. Session IDs are stored in sessionStorage only and
            are not persisted across browser sessions. All analytics data is stored on ArthaBuild's own infrastructure
            and is never shared with third parties.
          </p>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            We do <strong style={{ color: '#f87171' }}>not</strong> collect AI prompt histories or any business data from your NetSuite account.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            4. License Validation
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>
            ArthaBuild validates your license periodically with the ArthaBuild license server.
            The <strong style={{ color: '#e2e8f0' }}>only data sent</strong> during license validation is:
          </p>
          <ul style={{ color: '#a1a1aa', lineHeight: 2, paddingLeft: '20px' }}>
            <li>Your license key</li>
            <li>An anonymous instance ID (UUID generated once per deployment)</li>
            <li>The ArthaBuild software version number</li>
          </ul>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginTop: '16px' }}>
            No customer data, prompts, scripts, or NetSuite credentials are included in license validation requests.
            License validation results are cached for 7 days, with a 72-hour grace period if the license server
            is unreachable — so your work is never interrupted.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            5. Third-Party Services
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            ArthaBuild does not use Google Analytics, Mixpanel, Segment, Intercom, or any third-party
            analytics or tracking service. The only external network call from your ArthaBuild instance
            is the license validation described in Section 4.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            6. Data Retention
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            Because ArthaBuild runs on your own infrastructure, you are in full control of data retention.
            You can delete your deployment at any time, which deletes all stored data.
            Vibing World inc. does not retain copies of your data.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            7. Contact
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            For privacy-related questions: <a href="mailto:privacy@artha.build" style={{ color: '#6366f1' }}>privacy@artha.build</a><br />
            For general support: <a href="mailto:support@artha.build" style={{ color: '#6366f1' }}>support@artha.build</a><br />
            Vibing World inc. — artha.build
          </p>
        </section>

        <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: '32px', marginTop: '48px' }}>
          <p style={{ color: '#52525b', fontSize: '13px' }}>
            © 2026 Vibing World inc. All rights reserved. ArthaBuild is not affiliated with Oracle NetSuite.
          </p>
        </div>
      </div>
    </div>
  );
}
