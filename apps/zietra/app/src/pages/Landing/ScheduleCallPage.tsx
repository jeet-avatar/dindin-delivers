import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ScheduleCallPage() {
  const [searchParams] = useSearchParams();
  const stream = searchParams.get('stream') || '';
  const ref = searchParams.get('ref') || '';

  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', role: '', message: '', preferredTime: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.name.split(' ')[0] || form.name,
          lastName: form.name.split(' ').slice(1).join(' ') || '',
          email: form.email,
          phone: form.phone,
          role: form.role,
          company: form.company,
          notes: `CTA Landing Page Lead | Stream: ${stream || 'General'} | Ref: ${ref} | Preferred Time: ${form.preferredTime} | Message: ${form.message}`,
          source: 'campaign_cta',
          status: 'LEAD',
        }),
      });
    } catch {
      // Still show success — we don't want to lose the lead
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  const streamTitles: Record<string, string> = {
    'ai-ml': 'AI/ML Engineers',
    'cloud': 'Cloud & DevOps Engineers',
    'cybersecurity': 'Cybersecurity Specialists',
    'fullstack': 'Full-Stack Developers',
    'data': 'Data Engineers & Analysts',
    '': 'Technology Talent',
  };

  const streamTitle = streamTitles[stream] || streamTitles[''];

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px' }}>
            &#10003;
          </div>
          <h1 style={{ color: '#F1F5F9', fontSize: '28px', fontWeight: 700, margin: '0 0 12px' }}>Thank You, {form.name.split(' ')[0]}!</h1>
          <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px' }}>
            We've received your request. A staffing specialist from Zietra will reach out within 24 hours to discuss {streamTitle.toLowerCase()} for {form.company || 'your team'}.
          </p>
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <p style={{ color: '#A5B4FC', fontSize: '14px', margin: 0 }}>
              In the meantime, feel free to email us at <a href="mailto:rajesh@zietra.com" style={{ color: '#818CF8', fontWeight: 600 }}>rajesh@zietra.com</a>
            </p>
          </div>
          <a href="https://zietra.com" style={{ color: '#6366F1', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}>
            Visit Zietra.com &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 8px' }}>Zietra Staffing</p>
          <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.2 }}>
            Get Pre-Vetted {streamTitle} in 48 Hours
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', margin: 0, lineHeight: 1.5 }}>
            Schedule a free 15-minute discovery call. No commitment, no pressure — just a conversation about your hiring needs.
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Left: Why Zietra */}
        <div style={{ flex: '1 1 300px' }}>
          <h2 style={{ color: '#F1F5F9', fontSize: '20px', fontWeight: 700, margin: '0 0 20px' }}>Why Companies Choose Us</h2>

          {[
            { icon: '&#9889;', title: '48-Hour Candidate Delivery', desc: 'Pre-screened engineers matched to your stack, ready for interviews within 2 business days.' },
            { icon: '&#128640;', title: 'AI-Powered Matching', desc: 'Our algorithm scores candidates against your exact role requirements — no resume spam.' },
            { icon: '&#128170;', title: '3-Stage Technical Vetting', desc: 'Coding challenge + system design + culture fit. You only see candidates who pass all three.' },
            { icon: '&#128737;', title: '30-Day Replacement Guarantee', desc: 'Not the right fit? We replace the candidate at no additional cost within 30 days.' },
            { icon: '&#127758;', title: '200+ Engineers Ready Now', desc: 'AI/ML, Cloud, Cybersecurity, Full-Stack, DevOps, Data Engineering — all pre-vetted and available.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: item.icon }} />
              <div>
                <h3 style={{ color: '#F1F5F9', fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>{item.title}</h3>
                <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}

          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '14px', marginTop: '24px' }}>
            <p style={{ color: '#10B981', fontSize: '13px', margin: 0, fontWeight: 600 }}>
              "Zietra helped us scale our cloud team from 8 to 30 engineers in 6 weeks with a 95% retention rate." — VP Engineering, Fortune 500
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ background: '#1e1e36', border: '2px solid #2a2a44', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Schedule Your Discovery Call</h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 20px' }}>Fill in your details and we'll reach out within 24 hours.</p>

            <form onSubmit={handleSubmit}>
              {[
                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Sarah Mitchell', required: true },
                { key: 'email', label: 'Work Email', type: 'email', placeholder: 'sarah@deloitte.com', required: true },
                { key: 'company', label: 'Company', type: 'text', placeholder: 'Deloitte', required: true },
                { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+1-212-555-0101', required: false },
                { key: 'role', label: 'Your Role', type: 'text', placeholder: 'VP of Engineering', required: false },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px', fontWeight: 600 }}>{field.label}</label>
                  <input
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    style={{ width: '100%', background: '#252540', border: '1px solid #3d3d5c', borderRadius: '8px', color: '#F1F5F9', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px', fontWeight: 600 }}>Preferred Call Time</label>
                <select
                  value={form.preferredTime}
                  onChange={e => setForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                  style={{ width: '100%', background: '#252540', border: '1px solid #3d3d5c', borderRadius: '8px', color: '#F1F5F9', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="">Select a time...</option>
                  <option value="morning">Morning (9 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
                  <option value="evening">Evening (4 PM - 7 PM)</option>
                  <option value="asap">As soon as possible</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '4px', fontWeight: 600 }}>What roles are you hiring for? (optional)</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="e.g. 3 Senior React developers, 2 AWS architects..."
                  rows={3}
                  style={{ width: '100%', background: '#252540', border: '1px solid #3d3d5c', borderRadius: '8px', color: '#F1F5F9', padding: '10px 14px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                  background: submitting ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff', fontWeight: 700, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Submitting...' : 'Schedule My Discovery Call'}
              </button>

              <p style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', margin: '12px 0 0' }}>
                No spam, no cold calls. We'll only contact you about your staffing needs.
              </p>
            </form>
          </div>
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
