import React from 'react';
import PublicNav, { PublicFooter, publicPageStyle } from '../../components/layout/PublicNav';

const s = (title: string, children: React.ReactNode) => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14, color: '#fff' }}>{title}</h2>
    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8 }}>{children}</div>
  </div>
);

const TermsOfService: React.FC = () => (
  <div style={publicPageStyle}>
    <PublicNav />
    <div style={{ minHeight: '100vh', padding: '120px 24px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.25)', color: '#ff9500', borderRadius: 50, padding: '7px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', marginBottom: 20 }}>📄 LEGAL</div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 14 }}>Terms of Service</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Last updated: October 7, 2026 · Zietra Technologies Inc.</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px' }}>

          {s('1. Acceptance of Terms', <p>By downloading, accessing, or using the Dollor application or platform (collectively, "Service") operated by Zietra Technologies Inc. ("Dollor", "Company", "we", or "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our Service.</p>)}

          {s('2. Description of Service', <>
            <p>Dollor is a technology platform that connects riders seeking transportation with independent driver-partners in California. Dollor operates as a Transportation Network Company (TNC) under CPUC Permit TNC0050982-N.</p>
            <p style={{ marginTop: 12 }}>Dollor provides the technology platform only. Drivers are independent contractors, not employees of Dollor. Dollor does not provide transportation services directly.</p>
          </>)}

          {s('3. Eligibility', <>
            <p>To use Dollor, you must:</p>
            <ul style={{ paddingLeft: 20, marginTop: 10 }}>
              {['Be at least 18 years of age', 'Reside in or be present in California', 'Have the legal capacity to enter into binding contracts', 'Not be barred from using the Service under applicable law', 'Maintain a valid payment method on file'].map(i => <li key={i} style={{ marginBottom: 8 }}>{i}</li>)}
            </ul>
          </>)}

          {s('4. Driver Requirements', <>
            <p>To become a Dollor driver-partner, you must additionally:</p>
            <ul style={{ paddingLeft: 20, marginTop: 10 }}>
              {['Hold a valid California driver\'s license', 'Own or have authorized use of an insured vehicle (2010 or newer)', 'Pass a Checkr background check (criminal and MVR)', 'Maintain your own commercial or personal vehicle insurance', 'Comply with all applicable California TNC regulations'].map(i => <li key={i} style={{ marginBottom: 8 }}>{i}</li>)}
            </ul>
          </>)}

          {s('5. Platform Fee', <>
            <p>Dollor charges a flat platform fee of $1.00 (USD) per completed ride. This fee is the entirety of Dollor's compensation per ride. Drivers set their own fares. Riders receive fare estimates before confirming. Tips to drivers are optional and paid 100% to the driver.</p>
          </>)}

          {s('6. Payments and Refunds', <>
            <p>Payment is processed via Stripe at ride completion. Fare disputes must be submitted within 24 hours of the ride. Refunds are issued at Dollor's sole discretion in accordance with our Refund Policy. Chargebacks initiated outside this process may result in account suspension.</p>
          </>)}

          {s('7. User Conduct', <>
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: 20, marginTop: 10 }}>
              {['Use the platform for any unlawful purpose', 'Harass, threaten, or discriminate against any user or driver', 'Provide false information during registration', 'Attempt to defraud the payment system', 'Violate any applicable California TNC regulations', 'Use the platform while impaired by alcohol or drugs'].map(i => <li key={i} style={{ marginBottom: 8 }}>{i}</li>)}
            </ul>
            <p style={{ marginTop: 12 }}>Violations may result in immediate account termination.</p>
          </>)}

          {s('8. Zero Tolerance Policy', <p>Dollor maintains a Zero Tolerance Policy for discrimination, harassment, and drug/alcohol use. See our <a href="/zero-tolerance" style={{ color: '#ff9500' }}>Zero Tolerance Policy</a> for details. Violations result in permanent deactivation.</p>)}

          {s('9. Insurance', <p>Dollor maintains commercial rideshare insurance as required by California law and CPUC regulations. Coverage applies during active TNC periods. Drivers are responsible for maintaining personal auto insurance for non-TNC periods.</p>)}

          {s('10. Limitation of Liability', <>
            <p>To the maximum extent permitted by law, Dollor's liability for any claim arising out of or relating to these Terms or the Service shall not exceed the greater of: (a) the amount you paid to Dollor in the 12 months preceding the claim; or (b) $100.</p>
            <p style={{ marginTop: 12 }}>Dollor is not liable for: driver conduct, accidents caused by drivers, lost or damaged property, or any indirect, incidental, or consequential damages.</p>
          </>)}

          {s('11. Dispute Resolution', <p>Any disputes arising from these Terms shall be resolved through binding arbitration in California under the rules of the American Arbitration Association (AAA). You waive the right to a jury trial and class action participation. Small claims court actions under $10,000 are exempt from this arbitration clause.</p>)}

          {s('12. Governing Law', <p>These Terms are governed by the laws of the State of California, without regard to conflict of law provisions. Any action not subject to arbitration shall be brought in the courts of Riverside County, California.</p>)}

          {s('13. Changes to Terms', <p>We may modify these Terms at any time. Material changes will be communicated via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>)}

          {s('14. Contact', <p>Questions about these Terms? Email <a href="mailto:support@dollor.ai" style={{ color: '#ff9500' }}>support@dollor.ai</a> or contact Zietra Technologies Inc., RSM, California.</p>)}
        </div>
      </div>
    </div>
    <PublicFooter />
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#0a0a0f; }
    `}</style>
  </div>
);

export default TermsOfService;
