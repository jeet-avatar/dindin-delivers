import React from 'react';
import PublicNav, { PublicFooter, publicPageStyle } from '../../components/layout/PublicNav';

const s = (title: string, children: React.ReactNode) => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14, color: '#fff' }}>{title}</h2>
    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8 }}>{children}</div>
  </div>
);

const RefundPolicy: React.FC = () => (
  <div style={publicPageStyle}>
    <PublicNav />
    <div style={{ minHeight: '100vh', padding: '120px 24px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.25)', color: '#ff9500', borderRadius: 50, padding: '7px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', marginBottom: 20 }}>💳 LEGAL</div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 14 }}>Refund Policy</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Last updated: October 7, 2026 · Zietra Technologies Inc.</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px' }}>

          {s('Overview', <p>Because Dollor connects riders with independent driver-partners and charges a flat $1 platform fee, our refund policy is straightforward. Drivers are compensated for completed trips; refunds affect both the driver's earnings and the platform fee.</p>)}

          {s('Cancellation Fees', <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {[
                { stage: 'Before driver acceptance', fee: 'No charge', desc: 'You can cancel freely before a driver accepts your request.' },
                { stage: 'After acceptance, before pickup', fee: '$2–$5', desc: 'A small cancellation fee compensates the driver for time and travel toward pickup.' },
                { stage: 'After driver arrival', fee: '$5–$10', desc: 'Fee applies if you cancel after the driver has arrived at your pickup location.' },
                { stage: 'Completed ride', fee: 'No refund', desc: 'Completed trips are not refundable except under dispute resolution (see below).' },
              ].map(r => (
                <div key={r.stage} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4, fontSize: 14 }}>{r.stage}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{r.desc}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#ff9500', whiteSpace: 'nowrap' }}>{r.fee}</div>
                </div>
              ))}
            </div>
          </>)}

          {s('Dispute Resolution for Completed Rides', <>
            <p>Refunds on completed rides may be issued in the following circumstances:</p>
            <ul style={{ paddingLeft: 20, marginTop: 12 }}>
              {['Driver took a significantly longer route than necessary without explanation', 'Ride was charged but never completed (ghost trip)', 'You were charged for a ride you did not request', 'Safety incident during the trip substantiated by our Trust & Safety team', 'Technical error in charge amount'].map(i => <li key={i} style={{ marginBottom: 8 }}>{i}</li>)}
            </ul>
            <p style={{ marginTop: 12 }}>Disputes must be submitted within <strong style={{ color: '#fff' }}>24 hours</strong> of the ride via the in-app "Report an Issue" feature or by emailing <a href="mailto:support@dollor.ai" style={{ color: '#ff9500' }}>support@dollor.ai</a>.</p>
          </>)}

          {s('Refund Processing', <>
            <p>Approved refunds are returned to the original payment method:</p>
            <ul style={{ paddingLeft: 20, marginTop: 12 }}>
              {['Credit/debit cards: 3–5 business days', 'ACH bank transfers: 5–7 business days'].map(i => <li key={i} style={{ marginBottom: 8 }}>{i}</li>)}
            </ul>
            <p style={{ marginTop: 12 }}>Refunds are processed through Stripe. The $1 platform fee is non-refundable on disputed rides unless there was a technical error.</p>
          </>)}

          {s('Chargebacks', <p>Initiating a chargeback with your bank before contacting Dollor support may result in account suspension. We encourage you to contact us first — most issues are resolved quickly and a chargeback is rarely necessary.</p>)}

          {s('Non-Refundable Items', <>
            <p>The following are not eligible for refunds:</p>
            <ul style={{ paddingLeft: 20, marginTop: 12 }}>
              {['Completed rides where service was rendered as described', 'Tips paid to drivers', 'Cancellation fees (these compensate the driver)', 'Platform fee ($1) except in cases of technical error', 'Founding Membership fee once the account has been activated'].map(i => <li key={i} style={{ marginBottom: 8 }}>{i}</li>)}
            </ul>
          </>)}

          {s('Contact', <p>To dispute a charge or request a refund, email <a href="mailto:support@dollor.ai" style={{ color: '#ff9500' }}>support@dollor.ai</a> with your trip ID, date, and a description of the issue. We typically respond within 4 hours.</p>)}
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

export default RefundPolicy;
