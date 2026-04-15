export default function TermsOfService() {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px)' }}>

        <div style={{ marginBottom: '48px' }}>
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            ← Back to ArthaBuild
          </a>
        </div>

        <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '12px', fontFamily: 'Outfit, sans-serif', color: '#f4f4f5' }}>
          Terms of Service
        </h1>
        <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '56px' }}>
          Last updated: April 2026 &nbsp;·&nbsp; ArthaBuild by TechCloudPro
        </p>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            1. The Service
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            ArthaBuild is a SuiteScript automation platform developed by TechCloudPro (a brand of Zietra Technologies inc.).
            The platform runs within your own infrastructure (BYOC — Bring Your Own Cloud) and provides
            AI-powered SuiteScript generation, review, and deployment capabilities for Oracle NetSuite accounts.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            2. License and Usage
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>
            Your use of ArthaBuild is governed by your license agreement with TechCloudPro. Key license terms:
          </p>
          <ul style={{ color: '#a1a1aa', lineHeight: 2, paddingLeft: '20px' }}>
            <li>
              <strong style={{ color: '#e2e8f0' }}>One instance per license key.</strong> Each license key
              is registered to a single deployment instance. Attempting to use the same key on multiple
              instances will result in rejection.
            </li>
            <li>
              <strong style={{ color: '#e2e8f0' }}>Tier limits apply.</strong> Your license tier determines
              the number of production script deployments permitted. Sandbox deployments are unlimited on all tiers.
            </li>
            <li>
              <strong style={{ color: '#e2e8f0' }}>Authorized NetSuite accounts only.</strong> You may only
              use ArthaBuild with NetSuite accounts for which you are an authorized administrator or developer.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            3. Acceptable Use
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>You agree not to:</p>
          <ul style={{ color: '#a1a1aa', lineHeight: 2, paddingLeft: '20px' }}>
            <li>Share your license key with third parties or sublicense the software</li>
            <li>Use ArthaBuild to generate scripts that violate Oracle NetSuite's terms of service</li>
            <li>Reverse engineer, decompile, or attempt to extract proprietary AI models or knowledge bases</li>
            <li>Use the platform to access NetSuite accounts without authorization</li>
            <li>Attempt to circumvent license validation mechanisms</li>
          </ul>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            4. Service Tiers
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>
            ArthaBuild is available in the following tiers. Tier features are enforced by the platform:
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                  {['Feature', 'Starter', 'Growth', 'Enterprise'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#a5b4fc', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Production script deploys', '10', '100', 'Unlimited'],
                  ['Users', '1', '3', 'Custom'],
                  ['Sandbox deploys', 'Unlimited', 'Unlimited', 'Unlimited'],
                  ['NetSuite accounts', '1', '1', 'Multiple'],
                  ['Support', 'Email', 'Priority email', 'Dedicated'],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '12px 16px', color: j === 0 ? '#e2e8f0' : '#a1a1aa' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            5. Intellectual Property
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa', marginBottom: '16px' }}>
            <strong style={{ color: '#e2e8f0' }}>Your scripts are yours.</strong> SuiteScript generated by
            ArthaBuild based on your prompts belongs to you. TechCloudPro claims no ownership over
            scripts you generate or deploy.
          </p>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            The ArthaBuild platform, knowledge base, AI models, and proprietary technology remain
            the intellectual property of Zietra Technologies inc.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            6. Disclaimer of Warranties
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            ArthaBuild is provided "as is." While we strive for accuracy, AI-generated SuiteScript
            should be reviewed before deployment to production. TechCloudPro is not responsible for
            any issues arising from deployed scripts. Always test in sandbox before promoting to production.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            7. Governing Law
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            These Terms are governed by the laws applicable to Zietra Technologies inc.
            Any disputes shall be resolved through binding arbitration.
          </p>
        </section>

        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#a5b4fc', marginBottom: '16px', fontFamily: 'Outfit, sans-serif' }}>
            8. Contact
          </h2>
          <p style={{ lineHeight: 1.8, color: '#a1a1aa' }}>
            For support: <a href="mailto:support@techcloudpro.com" style={{ color: '#6366f1' }}>support@techcloudpro.com</a><br />
            For sales and licensing: <a href="mailto:sales@techcloudpro.com" style={{ color: '#6366f1' }}>sales@techcloudpro.com</a><br />
            Zietra Technologies inc. — artha.build
          </p>
        </section>

        <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', paddingTop: '32px', marginTop: '48px' }}>
          <p style={{ color: '#52525b', fontSize: '13px' }}>
            © 2026 Zietra Technologies inc. All rights reserved. ArthaBuild is not affiliated with Oracle NetSuite.
          </p>
        </div>
      </div>
    </div>
  );
}
