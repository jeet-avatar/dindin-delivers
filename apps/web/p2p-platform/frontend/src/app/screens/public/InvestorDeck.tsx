import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Token-based access control (for backward compatibility)
const VALID_TOKENS = ['invest2025', 'seed500k', 'dollor-ai'];

// External link warning component
const ExternalLink: React.FC<{ href: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ href, children, style }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `You are about to leave the Dollor.ai investor deck and visit:\n\n${href}\n\nThis external site will open in a new tab. Continue?`
    );
    if (confirmed) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <a href={href} onClick={handleClick} style={{ ...style, cursor: 'pointer' }}>
      {children}
    </a>
  );
};

// Watermark component - multi-position with email
const Watermark: React.FC<{ email: string; timestamp: string }> = ({ email, timestamp }) => {
  return (
    <>
      {/* Top-left watermark */}
      <div style={{
        position: 'fixed',
        top: '80px',
        left: '20px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.15)',
        pointerEvents: 'none',
        zIndex: 9998,
        fontFamily: 'monospace',
        userSelect: 'none'
      }}>
        {email}
      </div>

      {/* Top-right watermark */}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.15)',
        pointerEvents: 'none',
        zIndex: 9998,
        fontFamily: 'monospace',
        userSelect: 'none',
        textAlign: 'right'
      }}>
        {timestamp}
      </div>

      {/* Bottom-left watermark */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.15)',
        pointerEvents: 'none',
        zIndex: 9998,
        fontFamily: 'monospace',
        userSelect: 'none'
      }}>
        {timestamp}
      </div>

      {/* Bottom-right watermark */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.15)',
        pointerEvents: 'none',
        zIndex: 9998,
        fontFamily: 'monospace',
        userSelect: 'none',
        textAlign: 'right'
      }}>
        {email}
      </div>

      {/* Center watermark (very subtle) */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none',
        zIndex: 9997,
        fontFamily: 'monospace',
        userSelect: 'none',
        textAlign: 'center'
      }}>
        {email} • {timestamp}
      </div>
    </>
  );
};

export default function InvestorDeck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewerEmail, setViewerEmail] = useState('');
  const [viewTimestamp, setViewTimestamp] = useState('');

  useEffect(() => {
    // Check for token (backward compatibility)
    const token = searchParams.get('token')?.toLowerCase().trim();
    if (token && VALID_TOKENS.includes(token)) {
      setIsAuthorized(true);
      setViewerEmail('legacy-token-user@dollor.ai');
      setViewTimestamp(new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
      return;
    }

    // Check for email (new method)
    const email = searchParams.get('email');
    const accessToken = searchParams.get('access');
    if (email && accessToken) {
      // Validate access token matches email
      logViewAccess(email, accessToken);
    }
  }, [searchParams]);

  const logViewAccess = async (email: string, accessToken: string) => {
    try {
      const response = await fetch('https://api.dollor.ai/api/investor/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          access_token: accessToken,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthorized(true);
        setViewerEmail(email);
        setViewTimestamp(new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }));
      } else {
        setError('Invalid or expired access link. Please request a new one.');
      }
    } catch (err) {
      console.error('Access verification failed:', err);
      setError('Could not verify access. Please try again.');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // Request access token from backend
      const response = await fetch('https://api.dollor.ai/api/investor/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to deck with access token
        navigate(`/investor?email=${encodeURIComponent(emailInput)}&access=${data.access_token}`);
        setIsAuthorized(true);
        setViewerEmail(emailInput);
        setViewTimestamp(new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Access request failed. Please contact invest@dollor.ai');
      }
    } catch (err) {
      console.error('Access request failed:', err);
      setError('Could not request access. Please try again or contact invest@dollor.ai');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (VALID_TOKENS.includes(tokenInput.toLowerCase().trim())) {
      navigate(`/investor?token=${tokenInput.toLowerCase().trim()}`);
      setIsAuthorized(true);
      setViewerEmail('legacy-token-user@dollor.ai');
      setViewTimestamp(new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    } else {
      setError('Invalid access token. Please contact invest@dollor.ai');
    }
  };

  // Email/Token gate
  if (!isAuthorized) {
    return (
      <div style={styles.tokenGate}>
        <div style={styles.tokenCard}>
          <img src="/logo-dollar-ai.svg" alt="Dollor.ai" style={{ height: '48px', marginBottom: '20px' }} />
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Investor Deck</h2>
          <p style={{ color: '#888', marginBottom: '30px' }}>Enter your email to request access</p>

          <form onSubmit={handleEmailSubmit}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="investor@example.com"
              style={styles.tokenInput}
              disabled={loading}
            />
            <button type="submit" style={styles.tokenButton} disabled={loading}>
              {loading ? 'Requesting Access...' : 'Request Access'}
            </button>
          </form>

          {error && <p style={{ color: '#ff4d4d', marginTop: '15px', fontSize: '0.9rem' }}>{error}</p>}

          <div style={{ margin: '30px 0', color: '#555', fontSize: '0.85rem' }}>
            OR
          </div>

          <form onSubmit={handleTokenSubmit}>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter access token"
              style={styles.tokenInput}
            />
            <button type="submit" style={{ ...styles.tokenButton, background: 'rgba(255,255,255,0.1)' }}>
              Use Token
            </button>
          </form>

          <p style={{ color: '#666', marginTop: '30px', fontSize: '0.85rem' }}>
            Questions? <a href="mailto:invest@dollor.ai" style={{ color: '#00ff88' }}>invest@dollor.ai</a>
          </p>
        </div>
      </div>
    );
  }

  // Main Investor Deck
  return (
    <div style={styles.app}>
      <style>{cssStyles}</style>

      {/* Watermark overlay */}
      <Watermark email={viewerEmail} timestamp={viewTimestamp} />

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo-dollar-ai.svg" alt="Dollor.ai" style={{ height: '32px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>dollor.ai</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#problem" style={styles.navLink}>Problem</a>
          <a href="#llm" style={styles.navLink}>Our LLM</a>
          <a href="#team" style={styles.navLink}>Team</a>
          <a href="#gtm" style={styles.navLink}>GTM</a>
          <a href="#funds" style={styles.navLink}>Use of Funds</a>
          <a href="#roi" style={styles.navLink}>ROI</a>
        </div>
        <a href="mailto:invest@dollor.ai" style={styles.ctaButton}>Invest $2M</a>
      </nav>

      <main style={{ paddingTop: '100px' }}>
        {/* 1. Hero */}
        <section style={{ textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="container">
            <div style={styles.badge}>Seed Round: $2M for 15%</div>
            <h1 className="text-gradient" style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', lineHeight: '1.1', marginBottom: '24px' }}>
              AI-Powered<br/>Delivery & Rideshare
            </h1>
            <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', color: '#888', maxWidth: '800px', margin: '0 auto 40px', lineHeight: '1.6' }}>
              <span style={{ color: '#00ff88', fontWeight: 600 }}>We own everything.</span> Backend built. AI agents owned. Zero software costs. <br/>
              <span style={{ color: 'white', fontWeight: 600 }}>$1-3 Flat Fee. Zero LLM API Costs. 90%+ Contribution Margins.</span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', marginTop: '50px' }}>
              {[
                { value: '$300B', label: 'TAM' },
                { value: '90%', label: 'Lower Fees vs Competitors' },
                { value: '$0', label: 'LLM API Costs' },
                { value: '50-125x', label: 'Target Return' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>{stat.value}</div>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 1.5 MISSION - THE WHY */}
        <section className="container" style={{ background: 'linear-gradient(180deg, rgba(155,89,182,0.05) 0%, transparent 100%)', borderRadius: '30px', padding: '60px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              OUR MISSION
            </span>
          </div>
          <h2 style={{ ...styles.sectionTitle, fontSize: '2.8rem' }}>We're Not Building Another App.<br/><span style={{ color: '#00ff88' }}>We're Starting a Movement.</span></h2>

          <div style={{ maxWidth: '900px', margin: '0 auto 50px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.3rem', color: '#888', lineHeight: '1.8', marginBottom: '30px' }}>
              Every day, <span style={{ color: '#ff4d4d', fontWeight: 600 }}>gig workers are exploited</span> while corporations take 30-40% of every dollar.
              Restaurants close because they can't survive the fees. Drivers can't pay rent working 60-hour weeks.
              <span style={{ color: 'white', fontWeight: 600 }}> This isn't just unfair. It's unsustainable.</span>
            </p>
            <p style={{ fontSize: '1.5rem', color: '#00ff88', fontWeight: 600 }}>
              "What if the people who do the work... kept the money?"
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            {[
              {
                icon: '✊',
                title: 'Driver Liberation',
                stat: '95-100%',
                desc: 'Drivers keep almost everything. No algorithmic manipulation. No hidden deductions. They set their prices. They choose their rides.',
                color: '#00ff88'
              },
              {
                icon: '🏪',
                title: 'Restaurant Survival',
                stat: '$1 Flat',
                desc: "Mom-and-pop shops pay $1, not 30%. That's the difference between closing and thriving. We're keeping Main Street alive.",
                color: '#0088ff'
              },
              {
                icon: '🌍',
                title: 'Community Wealth',
                stat: '100%',
                desc: 'Money stays local. No VC-subsidized race-to-bottom. When you order, your neighbor delivers, your local restaurant earns.',
                color: '#ff9500'
              },
              {
                icon: '🤝',
                title: 'P2P Connection',
                stat: 'Human',
                desc: "This isn't faceless gig economy. It's your classmate delivering your food. Your neighbor driving you home. Real connections.",
                color: '#9b59b6'
              },
            ].map((item) => (
              <div key={item.title} className="glass-card" style={{ textAlign: 'center', borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{item.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: item.color }}>{item.stat}</div>
                <h3 style={{ fontSize: '1.2rem', margin: '10px 0' }}>{item.title}</h3>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', border: '1px solid rgba(0,255,136,0.3)' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '15px' }}>
              <span style={{ color: '#ff4d4d' }}>"The gig economy promised freedom.</span> It delivered exploitation."
            </p>
            <p style={{ fontSize: '1.1rem', color: '#888', marginBottom: '20px' }}>
              — Every driver who's ever done the math on their "earnings"
            </p>
            <p style={{ fontSize: '1.2rem', color: '#00ff88', fontWeight: 600 }}>
              We're fixing it. Not with promises. With code. With ownership. With $1 fees.
            </p>
          </div>
        </section>

        {/* 1.6 AI-POWERED ONBOARDING */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #9b59b6, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              AI-POWERED OPERATIONS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>AI That Works <span style={{ color: '#9b59b6' }}>For</span> People, Not Against Them</h2>
          <p style={styles.sectionSubtitle}>Our AI doesn't exploit. It <span style={{ color: '#00ff88' }}>empowers</span>. Restaurant signup in 5 minutes. Driver onboarding in 10.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginBottom: '40px' }}>
            <div className="glass-card" style={{ border: '1px solid #00ff88' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem' }}>🏪</div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '5px' }}>Restaurant Onboarding</h3>
                  <span style={{ color: '#00ff88', fontSize: '0.9rem' }}>AI-Assisted • 5 Minutes • Zero Paperwork</span>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { step: '1', title: 'Snap Menu Photo', desc: 'AI reads your menu, extracts items, prices, descriptions automatically', icon: '📸' },
                  { step: '2', title: 'Verify & Adjust', desc: 'Review AI suggestions, make any tweaks. Most restaurants approve as-is.', icon: '✅' },
                  { step: '3', title: 'Connect Payment', desc: 'Stripe Connect setup. Money flows directly to you. Same day payouts.', icon: '💳' },
                  { step: '4', title: 'Go Live', desc: "You're on the platform. Orders start coming. $1 per order. That's it.", icon: '🚀' },
                ].map((item) => (
                  <div key={item.step} style={{ display: 'flex', gap: '15px', padding: '12px', background: 'rgba(0,255,136,0.05)', borderRadius: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,255,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '3px' }}>{item.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ color: '#888' }}>DoorDash onboarding: </span>
                <span style={{ color: '#ff4d4d', textDecoration: 'line-through' }}>2-4 weeks</span>
                <span style={{ color: '#00ff88', fontWeight: 700, marginLeft: '10px' }}>→ Dollor.ai: 5 minutes</span>
              </div>
            </div>

            <div className="glass-card" style={{ border: '1px solid #0088ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ fontSize: '2.5rem' }}>🚗</div>
                <div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '5px' }}>Driver Onboarding</h3>
                  <span style={{ color: '#0088ff', fontSize: '0.9rem' }}>AI-Verified • 10 Minutes • Start Earning Today</span>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { step: '1', title: 'Snap License & Insurance', desc: 'AI reads documents instantly. No manual data entry. OCR extracts everything.', icon: '📄' },
                  { step: '2', title: 'AI Background Check', desc: 'Instant verification via Checkr API. No waiting days for approval.', icon: '🔍' },
                  { step: '3', title: 'Set Your Preferences', desc: 'Choose delivery zones, hours, vehicle type. You control everything.', icon: '⚙️' },
                  { step: '4', title: 'Accept First Order', desc: 'See requests. Set your price. Keep 95-100% of what you earn.', icon: '💰' },
                ].map((item) => (
                  <div key={item.step} style={{ display: 'flex', gap: '15px', padding: '12px', background: 'rgba(0,136,255,0.05)', borderRadius: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,136,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '3px' }}>{item.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,136,255,0.1)', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ color: '#888' }}>Uber driver approval: </span>
                <span style={{ color: '#ff4d4d', textDecoration: 'line-through' }}>3-7 days</span>
                <span style={{ color: '#0088ff', fontWeight: 700, marginLeft: '10px' }}>→ Dollor.ai: 10 minutes</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(0,0,0,0))', border: '1px solid rgba(155,89,182,0.3)' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', color: '#9b59b6' }}>🧠 AI That Helps, Not Exploits</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {[
                { title: 'Menu OCR', desc: 'Snap a photo, AI builds your menu. No typing.', color: '#00ff88' },
                { title: 'Smart Pricing', desc: 'AI suggests fair delivery prices. Drivers approve.', color: '#0088ff' },
                { title: 'Document Verification', desc: 'Instant license/insurance reading. No forms.', color: '#ff9500' },
                { title: '24/7 AI Support', desc: 'Bangalore team + AI chatbot. Always available.', color: '#9b59b6' },
                { title: 'Route Optimization', desc: 'Best routes for drivers. More money, less miles.', color: '#00ff88' },
                { title: 'Fraud Detection', desc: 'AI spots fake orders, protects restaurants.', color: '#ff4d4d' },
              ].map((item) => (
                <div key={item.title} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: `3px solid ${item.color}` }}>
                  <div style={{ fontWeight: 600, marginBottom: '5px', color: item.color }}>{item.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: 'rgba(155,89,182,0.15)', borderRadius: '10px' }}>
              <p style={{ color: '#9b59b6', fontWeight: 600, marginBottom: '5px' }}>Unlike Uber/DoorDash AI that optimizes against workers...</p>
              <p style={{ color: 'white', fontSize: '1.1rem' }}>Our AI optimizes <span style={{ color: '#00ff88' }}>for</span> workers. More earnings. Less friction. Real empowerment.</p>
            </div>
          </div>
        </section>

        {/* 2. Traction - What's Already Built */}
        <section className="container">
          <h2 style={styles.sectionTitle}>100% Built. Zero Software Costs.</h2>
          <p style={styles.sectionSubtitle}>Not a concept. Not a pitch. <span style={{ color: '#00ff88' }}>Complete platform ready to onboard.</span> No additional software needed.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
              { icon: '📱', title: 'iOS Apps', items: ['Customer App', 'Driver App', 'Restaurant App'], status: 'Beta in 15 days', statusColor: '#ff9500' },
              { icon: '🤖', title: 'Android Apps', items: ['Customer App', 'Driver App', 'Restaurant App'], status: 'Beta in 15 days', statusColor: '#ff9500' },
              { icon: '🌐', title: 'Web Platform', items: ['Customer Portal', 'Admin Dashboard', 'Analytics'], status: 'LIVE', statusColor: '#00ff88' },
              { icon: '⚙️', title: 'Backend', items: ['17 Microservices', 'FastAPI + Python', 'PostgreSQL + Redis'], status: '100% Complete', statusColor: '#00ff88' },
              { icon: '🧠', title: 'AI Agents (Owned)', items: ['Qwen 2.5 Fine-tuned', 'Ollama Self-hosted', 'Zero LLM API Costs'], status: 'We Own It', statusColor: '#9b59b6' },
              { icon: '☁️', title: 'Infrastructure', items: ['AWS EKS', 'Kubernetes', 'CI/CD Pipeline'], status: 'LIVE', statusColor: '#00ff88' },
            ].map((item) => (
              <div key={item.title} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.7rem', padding: '4px 10px', background: `${item.statusColor}20`, borderRadius: '12px', color: item.statusColor, fontWeight: 600 }}>{item.status}</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{item.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, color: '#888', fontSize: '0.9rem' }}>
                  {item.items.map((i) => <li key={i} style={{ marginBottom: '5px' }}>✓ {i}</li>)}
                </ul>
              </div>
            ))}
          </div>

          {/* Launch Date Banner */}
          <div style={{ marginTop: '30px', textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(255,149,0,0.15), rgba(255,77,77,0.1))', borderRadius: '16px', border: '1px solid rgba(255,149,0,0.4)' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>
              <span style={{ color: '#ff9500' }}>App Store & Play Store Launch:</span> <span style={{ color: 'white' }}>15 days from funding</span>
            </p>
            <p style={{ color: '#888', marginBottom: '15px' }}>Web platform is live now. Mobile apps production-ready.</p>
            <a href="https://dollor.ai" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '12px 30px', background: 'linear-gradient(135deg, #00ff88, #00cc6a)', color: '#000', fontWeight: 700, borderRadius: '30px', textDecoration: 'none', fontSize: '1rem' }}>
              Visit dollor.ai
            </a>
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.3)' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 600 }}>Lines of Code: </span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00ff88' }}>700,000+</span>
            </div>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(155,89,182,0.3)' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 600 }}>Software License Costs: </span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#9b59b6' }}>$0</span>
            </div>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(0,255,136,0.1))', borderRadius: '16px', border: '1px solid rgba(0,136,255,0.3)' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 600 }}>AI API Costs: </span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0088ff' }}>$0 Forever</span>
            </div>
          </div>
        </section>

        {/* 3. The Problem - Headlines from Real Press */}
        <section id="problem" className="container">
          <h2 style={styles.sectionTitle}>The Industry is Broken</h2>
          <p style={styles.sectionSubtitle}>
            Don't take our word for it. <span style={{ color: '#ff4d4d' }}>Here's what the press is saying.</span>
          </p>

          <div className="glass-card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, rgba(255,77,77,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(255,77,77,0.3)' }}>
            <h3 style={{ color: '#ff4d4d', marginBottom: '20px', fontSize: '1.2rem', textAlign: 'center' }}>📰 Real Headlines. Real Problems. <span style={{ fontSize: '0.8rem', color: '#888' }}>(Click to read)</span></h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {[
                { outlet: 'FTC', headline: '"Instacart to Pay $60 Million for Deceptive Tactics"', quote: 'Hidden fees add up to 15% to orders. False "free delivery" claims. Forced subscriptions without consent.', year: 'Dec 2025', url: 'https://www.ftc.gov/news-events/news/press-releases/2025/12/instacart-pay-60-million-consumer-refunds-settle-ftc-lawsuit-over-allegations-it-engaged-deceptive' },
                { outlet: 'NY Attorney General', headline: '"$16.75 Million from DoorDash for Cheating Workers"', quote: 'DoorDash used customer tips to subsidize base pay instead of giving workers their full tips.', year: 'Sep 2025', url: 'https://ag.ny.gov/press-release/2025/attorney-general-james-secures-1675-million-doordash-cheating-delivery-workers' },
                { outlet: 'Human Rights Watch', headline: '"The Gig Trap: Wage & Labor Exploitation"', quote: 'Platform workers in Texas earn just $5.12/hr after expenses—70% below living wage. Some make nothing.', year: 'May 2025', url: 'https://www.hrw.org/report/2025/05/12/gig-trap/algorithmic-wage-and-labor-exploitation-platform-work-us' },
                { outlet: 'Seattle OLS', headline: '"Uber Eats Settles $15M Over Worker Violations"', quote: 'Misled 16,000 workers about earnings. Underpaid for canceled orders. Systematic exploitation.', year: 'Aug 2025', url: 'https://komonews.com/news/local/seattle-reaches-15m-settlement-with-uber-eats-over-worker-rights-violations-delivery-fast-food-prices-economy-investigation-expensive-damages-penalities-drivers-ols-claim-lawsuit' },
                { outlet: 'FTC', headline: '"FTC Takes Action Against Uber for Deceptive Billing"', quote: 'Uber trapped customers in costly subscriptions that were exceedingly difficult to cancel.', year: 'Apr 2025', url: 'https://www.ftc.gov/news-events/news/press-releases/2025/04/ftc-takes-action-against-uber-deceptive-billing-cancellation-practices' },
                { outlet: 'CNBC', headline: '"FTC Probes Instacart AI Pricing Tool"', quote: 'Same groceries priced 23% higher for some shoppers. Different prices for same items at same time.', year: 'Dec 2025', url: 'https://www.cnbc.com/2025/12/17/instacart-sec-probe-pricing-tool.html' },
              ].map((item, i) => (
                <ExternalLink key={i} href={item.url} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: '3px solid #ff4d4d', transition: 'all 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,77,77,0.15)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#ff4d4d', fontWeight: 600, fontSize: '0.85rem' }}>{item.outlet}</span>
                      <span style={{ color: '#00ff88', fontSize: '0.75rem', background: 'rgba(0,255,136,0.1)', padding: '2px 8px', borderRadius: '10px' }}>{item.year}</span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px', fontStyle: 'italic', color: 'white' }}>{item.headline}</div>
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.quote}</div>
                    <div style={{ fontSize: '0.7rem', color: '#00ff88', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🔗</span> Click to read full article
                    </div>
                  </div>
                </ExternalLink>
              ))}
            </div>
          </div>

          <div className="grid-3">
            <div className="glass-card" style={{ borderLeft: '4px solid #ff4d4d' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Restaurants Bleed</h3>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff4d4d', marginBottom: '10px' }}>25-35%</div>
              <p style={{ color: '#888' }}>Commission fees destroy margins. Many restaurants LOSE money on every order.</p>
            </div>
            <div className="glass-card" style={{ borderLeft: '4px solid #ff4d4d' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Drivers Exploited</h3>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff4d4d', marginBottom: '10px' }}>$4-6/hr</div>
              <p style={{ color: '#888' }}>After gas, maintenance, taxes. Platform takes 30-40% of every fare.</p>
            </div>
            <div className="glass-card" style={{ borderLeft: '4px solid #ff4d4d' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Monopoly Abuse</h3>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#ff4d4d', marginBottom: '10px' }}>FTC</div>
              <p style={{ color: '#888' }}>Active investigations into anti-competitive behavior & predatory pricing.</p>
            </div>
          </div>
        </section>

        {/* 3.5 Competitor Comparison - The Battlefield */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              COMPETITIVE LANDSCAPE
            </span>
          </div>
          <h2 style={styles.sectionTitle}>We Beat Every Competitor</h2>
          <p style={styles.sectionSubtitle}>Side-by-side comparison. <span style={{ color: '#00ff88' }}>Dollor wins on every metric that matters.</span></p>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '30px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '24%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ ...styles.tableHeader, textAlign: 'left', paddingLeft: '20px' }}>Metric</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>DoorDash</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Uber Eats</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Grubhub</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Instacart</th>
                    <th style={{ ...styles.tableHeader, color: '#00ff88', fontSize: '1.1rem', background: 'rgba(0,255,136,0.1)' }}>Dollor.ai</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Restaurant Fee', dd: '25-30%', ue: '15-30%', gh: '20-30%', ic: '15-25%', us: '$1 FLAT', usColor: '#00ff88' },
                    { metric: 'Driver Take Rate', dd: '60-70%', ue: '55-65%', gh: '60-70%', ic: '70-80%', us: '100%', usColor: '#00ff88' },
                    { metric: 'Customer Platform Fee', dd: '$3-8', ue: '$3-10', gh: '$2-7', ic: '$4-10', us: '$1 FLAT', usColor: '#00ff88' },
                    { metric: 'Delivery Fee', dd: 'Included above', ue: 'Included above', gh: 'Included above', ic: 'Included above', us: 'Market rate → Driver', usColor: '#00ff88' },
                    { metric: 'Hidden Fees', dd: 'Yes (Service)', ue: 'Yes (Service)', gh: 'Yes (Service)', ic: 'Yes (Tip)', us: 'NONE', usColor: '#00ff88' },
                    { metric: 'Profitable?', dd: 'NO (-$1.4B)', ue: 'NO (-$2.1B)', gh: 'NO (-$400M)', ic: 'Barely', us: 'YES (Month 5-6)', usColor: '#00ff88' },
                    { metric: 'Driver Satisfaction', dd: '2.1/5 ⭐', ue: '1.9/5 ⭐', gh: '2.3/5 ⭐', ic: '2.8/5 ⭐', us: 'N/A (New)', usColor: '#888' },
                    { metric: 'FTC Investigation', dd: 'YES', ue: 'YES', gh: 'YES', ic: 'No', us: 'NO', usColor: '#00ff88' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ ...styles.tableCell, textAlign: 'left', paddingLeft: '20px', fontWeight: 600 }}>{row.metric}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.dd}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.ue}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.gh}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.ic}</td>
                      <td style={{ ...styles.tableCell, color: row.usColor, fontWeight: 700, background: 'rgba(0,255,136,0.05)' }}>{row.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', background: 'rgba(0,136,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: '#0088ff', fontSize: '1.2rem', marginBottom: '0' }}>🚗 Rideshare Comparison</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '24%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ ...styles.tableHeader, textAlign: 'left', paddingLeft: '20px' }}>Metric</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Uber</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Lyft</th>
                    <th style={{ ...styles.tableHeader, color: '#00ff88', fontSize: '1.1rem', background: 'rgba(0,255,136,0.1)' }}>Dollor.ai</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Platform Take Rate', uber: '25-40%', lyft: '20-35%', us: '$1-3 FLAT' },
                    { metric: 'Driver Earnings', uber: '60-75% of fare', lyft: '65-80% of fare', us: '95-97% of fare' },
                    { metric: 'Surge Pricing', uber: '2x-5x multiplier', lyft: '2x-4x multiplier', us: 'Driver sets price' },
                    { metric: 'Driver Flexibility', uber: 'Algorithm assigns', lyft: 'Algorithm assigns', us: 'Drivers choose rides' },
                    { metric: 'Booking Fees', uber: '$2-5 per ride', lyft: '$2-4 per ride', us: 'NONE' },
                    { metric: 'Profitability', uber: 'Break-even 2024', lyft: '-$350M (2024)', us: 'Profitable Month 5-6' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ ...styles.tableCell, textAlign: 'left', paddingLeft: '20px', fontWeight: 600 }}>{row.metric}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.9rem' }}>{row.uber}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.9rem' }}>{row.lyft}</td>
                      <td style={{ ...styles.tableCell, color: '#00ff88', fontWeight: 700, background: 'rgba(0,255,136,0.05)' }}>{row.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,0,0,0))' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💰</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff88' }}>90%+ Savings</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>For restaurants vs competitors</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(0,0,0,0))' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🚗</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0088ff' }}>25-35% More</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Driver earnings vs Uber/Lyft</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(0,0,0,0))' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚖️</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9b59b6' }}>No FTC Risk</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Fair pricing, no monopoly</div>
            </div>
          </div>
        </section>

        {/* 4. Two Revenue Streams */}
        <section className="container">
          <h2 style={styles.sectionTitle}>Two Massive Markets. One Platform.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid #00ff88' }}>
              <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🍔</div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Food Delivery</h3>
              <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                <div style={styles.feeRow}><span>Customer Platform Fee</span><span style={{ color: '#00ff88', fontWeight: 700 }}>$1.00</span></div>
                <div style={styles.feeRow}><span>Restaurant Platform Fee</span><span style={{ color: '#00ff88', fontWeight: 700 }}>$1.00</span></div>
                <div style={{ ...styles.feeRow, background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88' }}>
                  <span style={{ fontWeight: 600 }}>Platform Revenue/Order</span>
                  <span style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.2rem' }}>$2.00</span>
                </div>
              </div>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Delivery fee is market-rate (competitive pricing) → 100% to driver + tips</p>
            </div>

            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(0,136,255,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid #0088ff' }}>
              <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🚗</div>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Rideshare</h3>
              <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                <div style={styles.feeRow}><span>Fare &lt; $35</span><span style={{ color: '#0088ff', fontWeight: 700 }}>$1 fee</span></div>
                <div style={styles.feeRow}><span>Fare $35-70</span><span style={{ color: '#0088ff', fontWeight: 700 }}>$2 fee</span></div>
                <div style={{ ...styles.feeRow, background: 'rgba(0,136,255,0.1)', border: '1px solid #0088ff' }}>
                  <span>Fare &gt; $70</span><span style={{ color: '#0088ff', fontWeight: 700 }}>$3 fee</span>
                </div>
              </div>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Drivers keep fare minus flat fee + 100% tips</p>
            </div>
          </div>
        </section>

        {/* 5. PROPRIETARY LLM - THE MOAT */}
        <section id="llm" className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff6b6b, #ffd93d)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              ULTIMATE COMPETITIVE MOAT
            </span>
          </div>
          <h2 style={styles.sectionTitle}>We OWN Our AI. Completely.</h2>
          <p style={styles.sectionSubtitle}>
            Built on Qwen + Ollama. Self-hosted. <span style={{ color: '#00ff88' }}>Zero API costs. Zero dependencies. Zero ongoing software fees.</span>
          </p>

          <div className="glass-card" style={{ background: 'linear-gradient(180deg, rgba(155,89,182,0.15) 0%, rgba(0,0,0,0) 100%)', border: '1px solid #9b59b6', marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
              <div>
                <h3 style={{ color: '#9b59b6', marginBottom: '20px', fontSize: '1.3rem' }}>🧠 Dollor LLM Stack</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {[
                    { label: 'Base Model', value: 'Qwen 2.5 (32B)', desc: 'State-of-the-art open source' },
                    { label: 'Runtime', value: 'Ollama', desc: 'Self-hosted, GPU optimized' },
                    { label: 'Fine-tuning', value: 'Domain Specific', desc: 'Trained on delivery/rideshare' },
                    { label: 'Hosting', value: 'On-Premise', desc: 'Our servers, our data' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.desc}</div>
                      </div>
                      <div style={{ color: '#9b59b6', fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ color: '#00ff88', marginBottom: '20px', fontSize: '1.3rem' }}>💰 Cost Comparison (100K orders/day)</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px', border: '1px solid rgba(255,77,77,0.3)' }}>
                    <span>OpenAI GPT-4 API</span>
                    <span style={{ color: '#ff4d4d', fontWeight: 700 }}>$50,000/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px', border: '1px solid rgba(255,77,77,0.3)' }}>
                    <span>Claude API</span>
                    <span style={{ color: '#ff4d4d', fontWeight: 700 }}>$45,000/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', border: '1px solid #00ff88' }}>
                    <span style={{ fontWeight: 600 }}>Dollor LLM (Self-hosted)</span>
                    <span style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.2rem' }}>$2,500/mo</span>
                  </div>
                </div>
                <div style={{ marginTop: '20px', textAlign: 'center', padding: '15px', background: 'rgba(0,255,136,0.15)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00ff88' }}>95% Savings = $570K/year</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {[
              { icon: '🔒', title: 'Data Privacy', desc: 'Customer data never leaves our servers' },
              { icon: '⚡', title: 'Low Latency', desc: '<100ms response times' },
              { icon: '🎯', title: 'Domain Expert', desc: 'Trained on delivery scenarios' },
              { icon: '📈', title: 'Infinite Scale', desc: 'No per-request pricing' },
            ].map((item) => (
              <div key={item.title} className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{item.icon}</div>
                <h4 style={{ marginBottom: '5px' }}>{item.title}</h4>
                <p style={{ color: '#888', fontSize: '0.85rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. 20 AI Agents */}
        <section id="ai" className="container">
          <h2 style={styles.sectionTitle}>20 AI Agents Powered by Our LLM</h2>
          <p style={styles.sectionSubtitle}>
            DoorDash: 5,000+ ops staff. Uber: 10,000+. <span style={{ color: '#00ff88' }}>Dollor: 20 AI agents + 24 trainers.</span>
          </p>

          <div className="glass-card" style={{ marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
              {[
                { color: '#00ff88', title: '🍔 Customer Agents', items: ['Order Management', 'Payment Processing', 'Support Chat', 'Order Tracking'] },
                { color: '#0088ff', title: '🚗 Rideshare Agents', items: ['Ride Requests', 'Fare Estimation', 'Fare Negotiation', 'ETA Calculation'] },
                { color: '#ff9500', title: '🚚 Driver Agents', items: ['Smart Matching', 'Route Optimization', 'Earnings Tracking', 'Rating System'] },
                { color: '#ff4d4d', title: '🏪 Restaurant Agents', items: ['Menu Management', 'Order Acceptance', 'Analytics', 'Partner Support'] },
                { color: '#9b59b6', title: '🔐 Shared Services', items: ['Authentication', 'Notifications', 'Pricing/Surge', 'Safety & Fraud'] },
              ].map((group) => (
                <div key={group.title}>
                  <h3 style={{ color: group.color, marginBottom: '15px', fontSize: '1.1rem' }}>{group.title}</h3>
                  <ul style={styles.agentList}>
                    {group.items.map((item) => <li key={item} style={styles.agentItem}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.highlightBox}>
            <span style={{ fontSize: '1.2rem' }}>AI Automation Rate: </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00ff88' }}>95%</span>
            <span style={{ color: '#888', marginLeft: '10px' }}>of operations handled without human intervention</span>
          </div>
        </section>

        {/* 7. 17 Microservices with Training Coverage */}
        <section className="container">
          <h2 style={styles.sectionTitle}>17 Production Microservices</h2>
          <p style={styles.sectionSubtitle}>Enterprise architecture. Each service has dedicated AI trainers ensuring 24/7 coverage.</p>

          <div className="glass-card" style={{ padding: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
              {[
                { name: 'auth-service', icon: '🔐', trainers: 2 },
                { name: 'user-service', icon: '👤', trainers: 1 },
                { name: 'driver-service', icon: '🚚', trainers: 2 },
                { name: 'restaurant-service', icon: '🏪', trainers: 2 },
                { name: 'order-service', icon: '📦', trainers: 3 },
                { name: 'ride-service', icon: '🚗', trainers: 3 },
                { name: 'payment-service', icon: '💳', trainers: 2 },
                { name: 'notification-service', icon: '🔔', trainers: 1 },
                { name: 'location-service', icon: '📍', trainers: 2 },
                { name: 'menu-service', icon: '📋', trainers: 1 },
                { name: 'pricing-service', icon: '💰', trainers: 2 },
                { name: 'rating-service', icon: '⭐', trainers: 1 },
                { name: 'analytics-service', icon: '📊', trainers: 1 },
                { name: 'chat-service', icon: '💬', trainers: 2 },
                { name: 'call-service', icon: '📞', trainers: 1 },
                { name: 'negotiation-service', icon: '🤝', trainers: 2 },
                { name: 'safety-service', icon: '🛡', trainers: 2 },
                { name: 'api-gateway', icon: '🚪', trainers: 1 },
              ].map((service) => (
                <div key={service.name} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{service.icon}</span>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>{service.name}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(0,136,255,0.2)', borderRadius: '10px', color: '#0088ff' }}>
                    {service.trainers} trainer{service.trainers > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '25px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', textAlign: 'center' }}>
            <div className="glass-card">
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>18</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Microservices</div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0088ff' }}>31</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Dedicated Trainers</div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#9b59b6' }}>24/7</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Coverage</div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff9500' }}>99.9%</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Uptime SLA</div>
            </div>
          </div>
        </section>

        {/* 8. EXPANDED TEAM STRUCTURE */}
        <section id="team" className="container">
          <h2 style={styles.sectionTitle}>Quality-First Engineering Team</h2>
          <p style={styles.sectionSubtitle}>60 people to launch. 90 to dominate. <span style={{ color: '#00ff88' }}>Senior engineers + Fresh Bangalore grads at $6/hr.</span></p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
            {/* iOS Team - Bangalore */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>📱</span>
                <h3 style={{ fontSize: '1.3rem' }}>iOS Team</h3>
                <span style={{ marginLeft: 'auto', color: '#00ff88', fontWeight: 600 }}>6 Engineers</span>
              </div>
              <ul style={styles.teamList}>
                <li>👑 iOS Lead (5+ yrs) - $12/hr</li>
                <li>📱 2x Senior iOS (3+ yrs) - $8/hr</li>
                <li>📱 2x iOS Developer - $6/hr</li>
                <li>🎨 1x iOS UI/UX - $6/hr</li>
              </ul>
              <div style={{ ...styles.costBadge, background: 'rgba(0,255,136,0.1)' }}>
                <span style={{ color: '#00ff88', fontWeight: 600 }}>$7,744/mo</span>
              </div>
            </div>

            {/* Android Team - Bangalore */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <h3 style={{ fontSize: '1.3rem' }}>Android Team</h3>
                <span style={{ marginLeft: 'auto', color: '#00ff88', fontWeight: 600 }}>6 Engineers</span>
              </div>
              <ul style={styles.teamList}>
                <li>👑 Android Lead (5+ yrs) - $12/hr</li>
                <li>🤖 2x Senior Android (3+ yrs) - $8/hr</li>
                <li>🤖 2x Android Developer - $6/hr</li>
                <li>🎨 1x Android UI/UX - $6/hr</li>
              </ul>
              <div style={{ ...styles.costBadge, background: 'rgba(0,255,136,0.1)' }}>
                <span style={{ color: '#00ff88', fontWeight: 600 }}>$7,744/mo</span>
              </div>
            </div>

            {/* Web/Backend Team - Bangalore */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>🌐</span>
                <h3 style={{ fontSize: '1.3rem' }}>Web & Backend</h3>
                <span style={{ marginLeft: 'auto', color: '#00ff88', fontWeight: 600 }}>8 Engineers</span>
              </div>
              <ul style={styles.teamList}>
                <li>👑 CTO / Tech Lead (8+ yrs) - $15/hr</li>
                <li>🔙 2x Backend Lead (5+ yrs) - $10/hr</li>
                <li>🔙 3x Backend Developer - $7/hr</li>
                <li>🌐 2x Frontend Developer - $7/hr</li>
              </ul>
              <div style={{ ...styles.costBadge, background: 'rgba(0,255,136,0.1)' }}>
                <span style={{ color: '#00ff88', fontWeight: 600 }}>$11,440/mo</span>
              </div>
            </div>

            {/* AI/LLM Team - Bangalore */}
            <div className="glass-card" style={{ border: '1px solid #9b59b6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>🧠</span>
                <h3 style={{ fontSize: '1.3rem' }}>AI/LLM Team</h3>
                <span style={{ marginLeft: 'auto', color: '#9b59b6', fontWeight: 600 }}>4 Engineers</span>
              </div>
              <ul style={styles.teamList}>
                <li>👑 AI Lead (IIT/NIT) - $12/hr</li>
                <li>🧠 2x ML Engineer - $10/hr</li>
                <li>🔧 1x MLOps Engineer - $8/hr</li>
              </ul>
              <div style={{ ...styles.costBadge, background: 'rgba(155,89,182,0.1)' }}>
                <span style={{ color: '#9b59b6', fontWeight: 600 }}>$7,040/mo</span>
              </div>
            </div>

            {/* Bangalore AI Ops */}
            <div className="glass-card" style={{ border: '1px solid #0088ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>🇮🇳</span>
                <h3 style={{ fontSize: '1.3rem' }}>Bangalore AI Ops</h3>
                <span style={{ marginLeft: 'auto', color: '#0088ff', fontWeight: 600 }}>30 People</span>
              </div>
              <ul style={styles.teamList}>
                <li>🎓 15x Fresh Grad AI Monitors - $6/hr</li>
                <li>🤖 10x AI Trainers - $8/hr</li>
                <li>✅ 5x Senior QA - $10/hr</li>
              </ul>
              <p style={{ fontSize: '0.8rem', color: '#0088ff', marginTop: '10px', fontStyle: 'italic' }}>Fresh CS graduates from top Bangalore colleges - eager, trainable, 24/7 coverage</p>
              <div style={{ ...styles.costBadge, background: 'rgba(0,136,255,0.1)' }}>
                <span style={{ color: '#0088ff', fontWeight: 600 }}>$38,720/mo</span>
              </div>
            </div>

            {/* Ops & Support - Bangalore */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
                <h3 style={{ fontSize: '1.3rem' }}>Ops & Support</h3>
                <span style={{ marginLeft: 'auto', color: '#ff9500', fontWeight: 600 }}>6 People</span>
              </div>
              <ul style={styles.teamList}>
                <li>⚡ 2x Escalation Specialists - $6/hr</li>
                <li>🚀 2x Onboarding Specialists - $6/hr</li>
                <li>📝 1x Content Manager - $6/hr</li>
                <li>📊 1x Data Analyst - $7/hr</li>
              </ul>
              <div style={{ ...styles.costBadge, background: 'rgba(255,149,0,0.1)' }}>
                <span style={{ color: '#ff9500', fontWeight: 600 }}>$6,512/mo</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'center' }}>
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>60</div>
              <div style={{ color: '#888' }}>Total Team</div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>24</div>
              <div style={{ color: '#888' }}>Quality Engineers</div>
            </div>
            <div className="glass-card">
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>30</div>
              <div style={{ color: '#888' }}>AI Ops</div>
            </div>
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,0,0,0))' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>$77,224</div>
              <div style={{ color: '#888' }}>Total Monthly</div>
            </div>
          </div>

          <div style={{ marginTop: '25px', textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.3)' }}>
            <p style={{ fontSize: '1.1rem', color: '#888' }}>
              <span style={{ color: '#00ff88', fontWeight: 600 }}>100% Bangalore-based.</span> Same timezone. Quality talent at 80% lower cost than US.
              <br/>Top engineers from IITs, NITs, and Bangalore tech companies.
            </p>
          </div>
        </section>

        {/* 9. Use of Funds */}
        <section id="funds" className="container">
          <h2 style={styles.sectionTitle}>Use of $2M Investment</h2>
          <p style={styles.sectionSubtitle}>Team assembly: 20-30 days from funding. Then 18+ months runway. <span style={{ color: '#00ff88' }}>Zero software costs - it's all built.</span></p>

          <div className="glass-card" style={{ padding: '40px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              {[
                { category: 'Quality Engineering Team', amount: '$700,000', percent: 35, color: '#00ff88', items: ['Senior iOS/Android devs (12)', 'Senior Backend/Web (8)', 'AI/ML engineers (4)', '12+ months runway'] },
                { category: 'Bangalore Fresh Grad Ops', amount: '$350,000', percent: 17.5, color: '#0088ff', items: ['15x Fresh CS grads @ $6/hr', '10x AI Trainers @ $8/hr', '5x Senior QA @ $10/hr', '18 months coverage'] },
                { category: 'AI Infrastructure (Owned)', amount: '$250,000', percent: 12.5, color: '#9b59b6', items: ['GPU servers (we own them)', 'Qwen/Ollama hosting', 'No API costs ever', 'Redundancy & backup'] },
                { category: 'Marketing & City Launch', amount: '$350,000', percent: 17.5, color: '#ff9500', items: ['5-city launch campaign', 'Restaurant onboarding', 'Driver acquisition', 'Customer acquisition'] },
                { category: 'Infrastructure & Security', amount: '$200,000', percent: 10, color: '#ff4d4d', items: ['AWS scaling', 'SOC 2 certification', 'Penetration testing', '99.99% uptime'] },
                { category: 'Working Capital & Legal', amount: '$150,000', percent: 7.5, color: '#888', items: ['Legal & patents', 'Insurance', 'Contingency', 'Office operations'] },
              ].map((item) => (
                <div key={item.category} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: `4px solid ${item.color}` }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '5px' }}>{item.category}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color }}>{item.amount}</div>
                    <div style={{ marginTop: '10px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percent}%`, height: '100%', background: item.color, borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>{item.percent}% of funds</div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {item.items.map((i) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: '#888', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>✓ {i}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.3)' }}>
              <div style={{ fontSize: '1rem', marginBottom: '5px', color: '#888' }}>Monthly Burn Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00ff88' }}>~$85,000</div>
            </div>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(155,89,182,0.3)' }}>
              <div style={{ fontSize: '1rem', marginBottom: '5px', color: '#888' }}>Software Costs</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#9b59b6' }}>$0 (Built)</div>
            </div>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(0,255,136,0.1))', borderRadius: '16px', border: '1px solid rgba(0,136,255,0.3)' }}>
              <div style={{ fontSize: '1rem', marginBottom: '5px', color: '#888' }}>Break-even</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0088ff' }}>Month 5-6</div>
            </div>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>$2M ÷ $85K/mo = <span style={{ color: '#00ff88', fontWeight: 600 }}>23+ months runway</span> → Break-even at Month 5-6 → Profitable and self-sustaining</p>
        </section>

        {/* 10. Competitive Moats */}
        <section className="container">
          <h2 style={styles.sectionTitle}>6 Unbreakable Moats</h2>
          <p style={styles.sectionSubtitle}>Why competitors can't copy us - even with infinite money.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {[
              { icon: '💳', title: 'Zero Payment Liability', desc: 'Stripe Connect: money flows directly to restaurants/drivers instantly. Platform never touches order funds = no escrow, no money transmission license, no payment liability. 90%+ margins.', color: '#00d4ff' },
              { icon: '🧠', title: 'AI Fully Owned', desc: 'Qwen + Ollama = zero API costs forever. No OpenAI dependency. No per-request pricing. We own it completely.', color: '#9b59b6' },
              { icon: '🔧', title: 'Backend 100% Built', desc: 'No software to buy. No licenses. No SaaS fees. 700K+ lines of production code ready to scale.', color: '#00ff88' },
              { icon: '🎓', title: 'Fresh Grad Advantage', desc: 'Bangalore CS grads at $6/hr vs US $50/hr. Eager, trainable, 24/7 coverage. This gap is permanent.', color: '#0088ff' },
              { icon: '🤝', title: 'Network Effects', desc: 'More drivers → faster delivery → more customers → more restaurants. Flywheel accelerates daily.', color: '#ff9500' },
              { icon: '⚖️', title: 'Matchmaking Model', desc: 'Legally a matchmaker (not TNC). Lower regulatory burden. Drivers are true independents.', color: '#ff4d4d' },
            ].map((moat) => (
              <div key={moat.title} className="glass-card" style={{ borderTop: `3px solid ${moat.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>{moat.icon}</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>{moat.title}</h3>
                <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.6' }}>{moat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 10.5 Go-to-Market Strategy */}
        <section id="gtm" className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              GO-TO-MARKET STRATEGY
            </span>
          </div>
          <h2 style={styles.sectionTitle}>University-First Domination</h2>
          <p style={styles.sectionSubtitle}>Not major metros. <span style={{ color: '#00ff88' }}>College towns = less regulation, viral spread, price-sensitive users.</span></p>

          <div className="glass-card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, rgba(155,89,182,0.1) 0%, rgba(0,0,0,0) 100%)' }}>
            <h3 style={{ color: '#9b59b6', marginBottom: '15px', fontSize: '1.2rem' }}>🎓 Why Universities First?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {[
                { icon: '📋', text: 'Lower regulatory burden than major cities' },
                { icon: '🏘️', text: 'Dense population = efficient deliveries' },
                { icon: '💰', text: 'Price-sensitive students love $1 fee' },
                { icon: '🔥', text: 'Built-in viral: dorms, Greek life, clubs' },
                { icon: '🚗', text: 'Students as drivers (flexible schedules)' },
                { icon: '🌙', text: 'Late-night demand (study sessions, bars)' },
              ].map((item) => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.85rem', color: '#888' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#00ff88', marginBottom: '25px', fontSize: '1.4rem', textAlign: 'center' }}>🎯 The 6-Campus Launch Plan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              {[
                { phase: 'Month 1-2', campus: 'UT Austin', students: '52K students', city: 'Austin, TX', why: 'Tech-savvy, foodie culture, perfect test market' },
                { phase: 'Month 3-4', campus: 'ASU Tempe', students: '65K students', city: 'Tempe, AZ', why: 'Largest US campus, massive delivery demand' },
                { phase: 'Month 5-6', campus: 'Texas A&M', students: '72K students', city: 'College Station, TX', why: 'Isolated town, limited options, captive market' },
                { phase: 'Month 7-8', campus: 'Ohio State', students: '61K students', city: 'Columbus, OH', why: 'Midwest expansion, huge Greek life' },
                { phase: 'Month 9-10', campus: 'U of Florida', students: '57K students', city: 'Gainesville, FL', why: 'Southeast beachhead, sports culture' },
                { phase: 'Month 11-12', campus: 'Penn State', students: '46K students', city: 'State College, PA', why: 'Northeast entry, isolated college town' },
              ].map((item) => (
                <div key={item.campus} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid #00ff88' }}>
                  <div style={{ fontSize: '0.8rem', color: '#00ff88', marginBottom: '5px' }}>{item.phase}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{item.campus}</div>
                  <div style={{ fontSize: '0.9rem', color: '#9b59b6', marginBottom: '4px' }}>{item.students}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '6px' }}>{item.city}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>{item.why}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '25px', textAlign: 'center', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>Total Addressable Students: </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00ff88' }}>353,000+</span>
              <span style={{ color: '#888', marginLeft: '10px' }}>in Year 1 alone</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            <div className="glass-card" style={{ borderTop: '3px solid #ff9500' }}>
              <h3 style={{ color: '#ff9500', marginBottom: '15px' }}>🏪 Week 1-2: Campus Restaurants</h3>
              <ul style={{ listStyle: 'none', padding: 0, color: '#888', display: 'grid', gap: '10px' }}>
                <li>✓ Target restaurants within 2-mile radius of campus</li>
                <li>✓ Offer $1 flat fee (vs 30% DoorDash takes)</li>
                <li>✓ Free tablet, free menu setup, free training</li>
                <li>✓ "Student-friendly" badge in app</li>
              </ul>
            </div>
            <div className="glass-card" style={{ borderTop: '3px solid #0088ff' }}>
              <h3 style={{ color: '#0088ff', marginBottom: '15px' }}>🚗 Week 2-3: Student Drivers</h3>
              <ul style={{ listStyle: 'none', padding: 0, color: '#888', display: 'grid', gap: '10px' }}>
                <li>✓ "Keep 100% - pay for textbooks" messaging</li>
                <li>✓ Recruit at student job fairs</li>
                <li>✓ $50 sign-up bonus (after 10 deliveries)</li>
                <li>✓ Flexible hours around class schedules</li>
              </ul>
            </div>
            <div className="glass-card" style={{ borderTop: '3px solid #9b59b6' }}>
              <h3 style={{ color: '#9b59b6', marginBottom: '15px' }}>🎉 Week 3-4: Campus Takeover</h3>
              <ul style={{ listStyle: 'none', padding: 0, color: '#888', display: 'grid', gap: '10px' }}>
                <li>✓ Greek life partnerships (exclusive deals)</li>
                <li>✓ Dorm ambassador program ($5/referral)</li>
                <li>✓ Late-night study session promos</li>
                <li>✓ Game day specials & tailgate delivery</li>
              </ul>
            </div>
          </div>

          <div className="glass-card" style={{ marginTop: '25px', background: 'linear-gradient(135deg, rgba(0,255,136,0.05), rgba(0,136,255,0.05))' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem' }}>🏆 Campus Domination Playbook</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
              {[
                { icon: '🏠', title: 'Dorm Ambassadors', desc: '1 ambassador per dorm building. Free food credits for referrals.' },
                { icon: '🎭', title: 'Greek Life Deals', desc: 'Exclusive 20% off for sororities/fraternities. Chapter-wide adoption.' },
                { icon: '📚', title: 'Library Late Night', desc: 'Free delivery after 10pm during finals week. Students remember this.' },
                { icon: '🏈', title: 'Game Day Delivery', desc: 'Tailgate delivery service. Pre-order for stadium pickup.' },
                { icon: '🎓', title: 'Student Org Sponsors', desc: 'Sponsor club events with free food. Brand visibility + goodwill.' },
                { icon: '📱', title: 'Campus Meme Pages', desc: 'Partner with university meme accounts. Organic, authentic reach.' },
              ].map((item) => (
                <div key={item.title} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.4' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10.55 Aggressive Influencer Marketing */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              AGGRESSIVE MARKETING
            </span>
          </div>
          <h2 style={styles.sectionTitle}>$200K Influencer Blitz</h2>
          <p style={styles.sectionSubtitle}>Not organic only. <span style={{ color: '#ff9500' }}>We're paying to dominate. Influencers drive instant credibility.</span></p>

          <div className="glass-card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, rgba(255,149,0,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(255,149,0,0.3)' }}>
            <h3 style={{ color: '#ff9500', marginBottom: '25px', fontSize: '1.3rem', textAlign: 'center' }}>💰 Influencer Marketing Budget: $200,000</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderTop: '3px solid #ff4d4d' }}>
                <h4 style={{ color: '#ff4d4d', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎬</span> TikTok/Reels Creators
                </h4>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff4d4d', marginBottom: '10px' }}>$80,000</div>
                <ul style={{ listStyle: 'none', padding: 0, color: '#888', fontSize: '0.85rem', display: 'grid', gap: '6px' }}>
                  <li>• 20 micro-influencers (50K-200K followers) @ $2K each</li>
                  <li>• 4 macro-influencers (500K+ followers) @ $10K each</li>
                  <li>• Content: "I made $X more on Dollor" earnings comparisons</li>
                  <li>• Target: Gig economy, college life, food creators</li>
                </ul>
              </div>
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderTop: '3px solid #0088ff' }}>
                <h4 style={{ color: '#0088ff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎙️</span> Podcast Sponsorships
                </h4>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0088ff', marginBottom: '10px' }}>$50,000</div>
                <ul style={{ listStyle: 'none', padding: 0, color: '#888', fontSize: '0.85rem', display: 'grid', gap: '6px' }}>
                  <li>• 10 gig economy/side hustle podcasts @ $3K each</li>
                  <li>• 4 college-focused podcasts @ $5K each</li>
                  <li>• Host-read ads with unique promo codes</li>
                  <li>• Target: People already thinking about extra income</li>
                </ul>
              </div>
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderTop: '3px solid #9b59b6' }}>
                <h4 style={{ color: '#9b59b6', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📺</span> YouTube Partnerships
                </h4>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9b59b6', marginBottom: '10px' }}>$40,000</div>
                <ul style={{ listStyle: 'none', padding: 0, color: '#888', fontSize: '0.85rem', display: 'grid', gap: '6px' }}>
                  <li>• 8 finance/side hustle YouTubers @ $5K each</li>
                  <li>• Long-form "Week driving for Dollor vs DoorDash" content</li>
                  <li>• SEO benefit: Videos rank for "DoorDash alternative"</li>
                  <li>• Evergreen content keeps driving signups</li>
                </ul>
              </div>
              <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderTop: '3px solid #00ff88' }}>
                <h4 style={{ color: '#00ff88', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>🐦</span> Twitter/X Thought Leaders
                </h4>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff88', marginBottom: '10px' }}>$30,000</div>
                <ul style={{ listStyle: 'none', padding: 0, color: '#888', fontSize: '0.85rem', display: 'grid', gap: '6px' }}>
                  <li>• 15 tech/startup Twitter accounts @ $2K each</li>
                  <li>• "Thread: How Dollor is disrupting DoorDash"</li>
                  <li>• VC/founder audience = potential investors & press</li>
                  <li>• Viral potential in tech community</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem' }}>🎯 Influencer Content Strategy</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {[
                { title: 'Earnings Comparisons', desc: 'Side-by-side: "DoorDash paid me $150. Dollor paid me $215. Same day."', impact: 'Driver signups 📈' },
                { title: 'Fee Breakdowns', desc: '"I ordered the same meal. DoorDash: $32. Dollor: $24. Here\'s why."', impact: 'Customer downloads 📈' },
                { title: 'Restaurant Owner Stories', desc: '"We were losing $5K/month to DoorDash fees. Then we found Dollor."', impact: 'Restaurant signups 📈' },
                { title: 'Protest/Activism Content', desc: '"Drivers deserve 100% of their earnings. Here\'s how we\'re fighting back."', impact: 'Media coverage 📈' },
              ].map((item) => (
                <div key={item.title} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: '#ff9500' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px', fontStyle: 'italic' }}>"{item.desc}"</p>
                  <span style={{ fontSize: '0.75rem', color: '#00ff88' }}>{item.impact}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,149,0,0.15), rgba(0,0,0,0))', border: '1px solid rgba(255,149,0,0.3)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff9500' }}>$200K</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Influencer Budget</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>50+</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Paid Influencers</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>10M+</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Combined Reach</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,0,0,0))', border: '1px solid rgba(0,255,136,0.3)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>$4</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Est. CAC from Influencers</div>
            </div>
          </div>
        </section>

        {/* 10.6 Viral Growth Mechanics */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff6b6b, #ffd93d)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              VIRAL GROWTH ENGINE
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Built to Go Viral</h2>
          <p style={styles.sectionSubtitle}>Every user becomes a marketer. <span style={{ color: '#00ff88' }}>We don't buy growth. We engineer it.</span></p>

          <div className="glass-card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, rgba(0,255,136,0.05) 0%, rgba(155,89,182,0.05) 100%)' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.3rem' }}>🔄 The Triple Viral Loop</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚗</div>
                <h4 style={{ color: '#00ff88', marginBottom: '10px' }}>Driver Viral Loop</h4>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Drivers keep <span style={{ color: '#00ff88', fontWeight: 600 }}>100%</span> of earnings → They brag to other drivers →
                  <span style={{ color: 'white' }}> "I made $200 more this week on Dollor"</span> → New drivers sign up → They brag too
                </p>
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#00ff88' }}>Expected: 3x driver referrals</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏪</div>
                <h4 style={{ color: '#ff9500', marginBottom: '10px' }}>Restaurant Viral Loop</h4>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Restaurants save <span style={{ color: '#ff9500', fontWeight: 600 }}>90%+</span> on fees → They tell other restaurant owners →
                  <span style={{ color: 'white' }}> "We switched and saved $8K/month"</span> → Restaurant associations spread word
                </p>
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,149,0,0.1)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#ff9500' }}>Expected: 2x restaurant referrals</span>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>👥</div>
                <h4 style={{ color: '#0088ff', marginBottom: '10px' }}>Customer Viral Loop</h4>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Platform fee: <span style={{ color: '#0088ff', fontWeight: 600 }}>$1 flat</span> vs $5-8 elsewhere → They share on social →
                  <span style={{ color: 'white' }}> "Why am I still paying $7 in platform fees?"</span> → Friends download app
                </p>
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,136,255,0.1)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#0088ff' }}>Expected: 1.5x customer referrals</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {[
              { icon: '📱', title: 'Campus TikTok/Reels', desc: 'Students post "I saved $50 this month on delivery fees." Spreads through campus group chats instantly.', color: '#ff4d4d' },
              { icon: '🎁', title: 'Student Referrals', desc: 'Give $5, Get $5. Dorm ambassadors earn $5/referral. Top referrers get free semester of delivery.', color: '#00ff88' },
              { icon: '🏆', title: 'Campus Leaderboards', desc: 'Which dorm orders most? Greek house competitions. Gamification drives engagement.', color: '#ffd93d' },
              { icon: '📰', title: 'Student Media', desc: 'Campus newspapers love "students vs big tech" stories. Free PR in every university market.', color: '#9b59b6' },
            ].map((item) => (
              <div key={item.title} className="glass-card" style={{ borderLeft: `3px solid ${item.color}` }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{item.icon}</div>
                <h4 style={{ marginBottom: '8px' }}>{item.title}</h4>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.5' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', border: '1px solid #00ff88' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>📊 Campus-by-Campus Growth Projection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
              {[
                { month: '1 Campus', users: '2,000', cac: '$15', label: 'UT Austin' },
                { month: '3 Campuses', users: '12,000', cac: '$8', label: '+ASU, A&M' },
                { month: '6 Campuses', users: '45,000', cac: '$4', label: '+OSU, UF, PSU' },
                { month: 'Year 2', users: '200,000', cac: '$2', highlight: true, label: '15 campuses' },
              ].map((item) => (
                <div key={item.month} style={{ padding: '15px', background: item.highlight ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>{item.month}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.highlight ? '#00ff88' : 'white' }}>{item.users}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9b59b6', marginTop: '3px' }}>{item.label}</div>
                  <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#00ff88' }}>CAC: {item.cac}</div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '20px', color: '#888', fontSize: '0.9rem' }}>
              Campus word-of-mouth drops CAC from <span style={{ color: '#ff4d4d' }}>$15</span> to <span style={{ color: '#00ff88', fontWeight: 600 }}>$2</span>.
              <br/>DoorDash CAC: <span style={{ color: '#ff4d4d' }}>$30-50</span>. Ours in college towns: <span style={{ color: '#00ff88', fontWeight: 600 }}>$2-4</span>.
              <br/><span style={{ color: 'white', fontWeight: 500 }}>Students graduate → take Dollor to new cities → organic expansion.</span>
            </p>
          </div>
        </section>

        {/* 11. Why We Win - Comparison */}
        <section className="container">
          <h2 style={styles.sectionTitle}>Why We Win</h2>
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={styles.tableHeader}>Metric</th>
                  <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>DoorDash/Uber</th>
                  <th style={{ ...styles.tableHeader, color: '#00ff88', fontSize: '1.1rem' }}>Dollor.ai</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Commission Model', them: '25-35%', us: '$1-3 Flat' },
                  { metric: 'Driver Earnings', them: '60-75%', us: '100%' },
                  { metric: 'LLM/AI Costs', them: '$50,000+/mo (GPT-4)', us: '$0 (We own it)' },
                  { metric: 'Software Licenses', them: '$100,000+/mo', us: '$0 (100% built)' },
                  { metric: 'Support Model', them: '5,000+ humans @ $50/hr', us: '30 Fresh grads @ $6/hr' },
                  { metric: 'Ops Cost (10K orders/day)', them: '$445,000/mo', us: '$98,000/mo' },
                  { metric: 'Gross Margin', them: '11%', us: '90%+' },
                  { metric: 'Profitable?', them: 'NO (-$1.4B/yr)', us: 'YES (Month 5-6)', noBorder: true },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: row.noBorder ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={styles.tableCell}>{row.metric}</td>
                    <td style={{ ...styles.tableCell, color: '#ff4d4d' }}>{row.them}</td>
                    <td style={{ ...styles.tableCell, color: '#00ff88', fontWeight: 'bold' }}>{row.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 12. Scaling */}
        <section className="container">
          <h2 style={styles.sectionTitle}>The Scaling Magic</h2>
          <p style={styles.sectionSubtitle}>Orders grow 500x. Team grows only 1.5x. <span style={{ color: '#00ff88' }}>AI + owned LLM = infinite leverage.</span></p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { phase: 'Launch', orders: '1,000', team: '60', cost: '$85K', perOrder: '$2.83' },
              { phase: 'Growth', orders: '10,000', team: '68', cost: '$98K', perOrder: '$0.33' },
              { phase: 'Scale', orders: '100,000', team: '80', cost: '$120K', perOrder: '$0.04' },
              { phase: 'Dominate', orders: '500,000', team: '90', cost: '$145K', perOrder: '$0.01', highlight: true },
            ].map((row) => (
              <div key={row.phase} className="glass-card" style={{
                background: row.highlight ? 'linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(0,0,0,0) 100%)' : undefined,
                border: row.highlight ? '1px solid #00ff88' : undefined
              }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>{row.phase}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: row.highlight ? '#00ff88' : 'white' }}>{row.orders}/day</div>
                <div style={{ display: 'grid', gap: '8px', marginTop: '15px' }}>
                  <div style={styles.scaleRow}><span style={{ color: '#888' }}>Team</span><span>{row.team} people</span></div>
                  <div style={styles.scaleRow}><span style={{ color: '#888' }}>Cost</span><span>{row.cost}/mo</span></div>
                  <div style={{ ...styles.scaleRow, padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                    <span style={{ color: '#888' }}>Per Order</span>
                    <span style={{ color: '#00ff88', fontWeight: 600 }}>{row.perOrder}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 13. Infrastructure */}
        <section className="container">
          <h2 style={styles.sectionTitle}>Enterprise Infrastructure</h2>
          <p style={styles.sectionSubtitle}>AWS-powered. Kubernetes-orchestrated. Bank-grade security.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="glass-card">
              <h3 style={{ color: '#00ff88', marginBottom: '15px' }}>☁️ Cloud Stack</h3>
              <ul style={styles.infraList}>
                <li>AWS EKS (Kubernetes)</li>
                <li>RDS PostgreSQL</li>
                <li>ElastiCache Redis</li>
                <li>S3 + CloudFront CDN</li>
              </ul>
            </div>
            <div className="glass-card">
              <h3 style={{ color: '#0088ff', marginBottom: '15px' }}>🔐 Security</h3>
              <ul style={styles.infraList}>
                <li>Cloudflare DDoS</li>
                <li>AWS WAF Firewall</li>
                <li>AES-256 Encryption</li>
                <li>JWT + OAuth2</li>
              </ul>
            </div>
            <div className="glass-card">
              <h3 style={{ color: '#9b59b6', marginBottom: '15px' }}>✅ Compliance</h3>
              <ul style={styles.infraList}>
                <li>PCI-DSS (Stripe)</li>
                <li>GDPR Ready</li>
                <li>CCPA Compliant</li>
                <li>SOC 2 (Phase 2)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 14. UNIT ECONOMICS DEEP DIVE */}
        <section id="roi" className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              UNIT ECONOMICS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>The Numbers That Matter</h2>
          <p style={styles.sectionSubtitle}>Investors ask for unit economics. <span style={{ color: '#00ff88' }}>Here's our breakdown per order.</span></p>

          <div className="glass-card" style={{ marginBottom: '30px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.3rem' }}>💰 Per-Order Economics (Food Delivery)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              <div>
                <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>Revenue Per Order</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                    <span>Customer Platform Fee</span><span style={{ color: '#00ff88', fontWeight: 600 }}>$1.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                    <span>Restaurant Platform Fee</span><span style={{ color: '#00ff88', fontWeight: 600 }}>$1.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,255,136,0.2)', borderRadius: '8px', border: '1px solid #00ff88' }}>
                    <span style={{ fontWeight: 600 }}>Total Revenue/Order</span><span style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.2rem' }}>$2.00</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#ff4d4d', marginBottom: '15px' }}>Platform Cost Per Order (All-In)</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', border: '1px dashed rgba(0,255,136,0.3)' }}>
                    <span>Stripe on $30 order</span><span style={{ color: '#00ff88', fontWeight: 600 }}>$0.00 ✓</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888', padding: '0 12px', fontStyle: 'italic' }}>
                    ↳ Stripe Connect Direct: Restaurant pays 2.9%+$0.30, not us
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Stripe on $2 platform fee</span><span style={{ color: '#ff4d4d' }}>$0.09</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Google Maps (2 geocode + directions)</span><span style={{ color: '#ff4d4d' }}>$0.015</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Twilio SMS (2 notifications)</span><span style={{ color: '#ff4d4d' }}>$0.016</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>AWS (EC2, RDS, S3, CloudFront)</span><span style={{ color: '#ff4d4d' }}>$0.01</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Firebase Push (free tier)</span><span style={{ color: '#00ff88' }}>$0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Email (transactional)</span><span style={{ color: '#ff4d4d' }}>$0.002</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Support allocation</span><span style={{ color: '#ff4d4d' }}>$0.05</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,77,77,0.2)', borderRadius: '8px', border: '1px solid #ff4d4d' }}>
                    <span style={{ fontWeight: 600 }}>Total Variable Cost/Order</span><span style={{ color: '#ff4d4d', fontWeight: 700, fontSize: '1.1rem' }}>$0.183</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.15))', borderRadius: '12px', border: '1px solid #00ff88' }}>
              <span style={{ fontSize: '1.2rem' }}>Contribution Margin Per Order: </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>$1.81</span>
              <span style={{ color: '#888', marginLeft: '10px' }}>(90.5% margin)</span>
            </div>
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(155,89,182,0.1)', borderRadius: '10px', border: '1px solid rgba(155,89,182,0.3)' }}>
              <p style={{ textAlign: 'center', color: '#9b59b6', fontWeight: 600, marginBottom: '8px' }}>⚡ Why Our Margins Are 90%+ (vs DoorDash 11%)</p>
              <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', margin: 0 }}>
                <strong>Stripe Connect Direct Payouts:</strong> Customer pays restaurant/driver directly. Platform never touches order money = no payment processing on $30 orders, no escrow, no money transmission license, zero payment liability.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '30px' }}>
            <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #00ff88' }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>Customer Lifetime Value (LTV)</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>$156</div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '10px' }}>
                78 orders × $2 revenue<br/>
                <span style={{ color: '#00ff88' }}>2 orders/week × 9 months retention</span>
              </div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #0088ff' }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>Customer Acquisition Cost (CAC)</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0088ff' }}>$4</div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '10px' }}>
                Campus viral loops + referrals<br/>
                <span style={{ color: '#0088ff' }}>DoorDash CAC: $30-50</span>
              </div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #9b59b6' }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>LTV:CAC Ratio</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#9b59b6' }}>39:1</div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '10px' }}>
                Industry benchmark: 3:1<br/>
                <span style={{ color: '#9b59b6' }}>We're 13x better than benchmark</span>
              </div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #ff9500' }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>CAC Payback Period</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ff9500' }}>2 Orders</div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '10px' }}>
                $4 CAC ÷ $1.81 margin = 2.2 orders<br/>
                <span style={{ color: '#ff9500' }}>DoorDash: 18+ months</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,0,0,0))', border: '1px solid #00ff88' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem' }}>📈 Cohort Economics - Customer Retention</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', textAlign: 'center' }}>
              {[
                { month: 'M1', retention: '100%', orders: '8' },
                { month: 'M2', retention: '85%', orders: '7' },
                { month: 'M3', retention: '72%', orders: '6' },
                { month: 'M6', retention: '58%', orders: '5' },
                { month: 'M9', retention: '45%', orders: '4' },
                { month: 'M12', retention: '35%', orders: '3' },
              ].map((item) => (
                <div key={item.month} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.month}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#00ff88' }}>{item.retention}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{item.orders} orders</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '15px', color: '#888', fontSize: '0.85rem' }}>
              Industry avg 12-mo retention: 15-20%. <span style={{ color: '#00ff88', fontWeight: 600 }}>Ours: 35%</span> (lower fees = higher retention)
            </p>
          </div>

          {/* Monthly Infrastructure Costs - Full Breakdown */}
          <div className="glass-card" style={{ marginTop: '30px', background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(0,0,0,0))' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.3rem' }}>
              🏗️ Monthly Infrastructure & Service Costs <span style={{ color: '#888', fontSize: '0.9rem' }}>(All-In)</span>
            </h3>
            <p style={{ textAlign: 'center', color: '#888', marginBottom: '25px', fontSize: '0.9rem' }}>
              Comprehensive breakdown at 1,000 orders/day (30,000/month) scale
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
              <div>
                <h4 style={{ color: '#9b59b6', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>☁️</span> AWS Infrastructure
                </h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { service: 'EC2 (t3.medium x2)', cost: '$60' },
                    { service: 'RDS PostgreSQL', cost: '$70' },
                    { service: 'ElastiCache Redis', cost: '$15' },
                    { service: 'S3 Storage (100GB)', cost: '$3' },
                    { service: 'CloudFront CDN', cost: '$10' },
                    { service: 'EKS Cluster', cost: '$73' },
                    { service: 'Load Balancer', cost: '$20' },
                    { service: 'NAT Gateway', cost: '$45' },
                  ].map((item) => (
                    <div key={item.service} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <span>{item.service}</span><span style={{ color: '#9b59b6' }}>{item.cost}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(155,89,182,0.2)', borderRadius: '8px', fontWeight: 600 }}>
                    <span>AWS Subtotal</span><span style={{ color: '#9b59b6' }}>$296/mo</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#0088ff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🗺️</span> Third-Party APIs
                </h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { service: 'Google Maps ($5/1K req)', cost: '$450', note: '90K requests' },
                    { service: 'Twilio SMS ($0.0079/msg)', cost: '$474', note: '60K messages' },
                    { service: 'Persona ID Verification', cost: '$500', note: '~500 new drivers' },
                    { service: 'SendGrid Email', cost: '$45', note: '90K emails' },
                    { service: 'Firebase Push', cost: '$0', note: 'Free tier' },
                  ].map((item) => (
                    <div key={item.service} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div>
                        <span>{item.service}</span>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>{item.note}</div>
                      </div>
                      <span style={{ color: '#0088ff' }}>{item.cost}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,136,255,0.2)', borderRadius: '8px', fontWeight: 600 }}>
                    <span>APIs Subtotal</span><span style={{ color: '#0088ff' }}>$1,469/mo</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
              <div style={{ padding: '20px', background: 'rgba(255,77,77,0.1)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>Total Monthly Infra</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ff4d4d' }}>$1,765</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>@1K orders/day</div>
              </div>
              <div style={{ padding: '20px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>Cost Per Order</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00ff88' }}>$0.059</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>Extremely lean</div>
              </div>
              <div style={{ padding: '20px', background: 'rgba(155,89,182,0.1)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>At Scale (5K/day)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#9b59b6' }}>$0.042</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>Economies of scale</div>
              </div>
            </div>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '10px', border: '1px solid rgba(0,255,136,0.3)' }}>
              <p style={{ textAlign: 'center', color: '#00ff88', fontWeight: 600, marginBottom: '5px' }}>💡 Why Our Infra Costs Are So Low</p>
              <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', margin: 0 }}>
                <strong>Self-hosted AI (Qwen + Ollama):</strong> Zero OpenAI/Claude API fees. <strong>Stripe Connect Direct:</strong> We don't process payments. <strong>Firebase Free Tier:</strong> 100K push/month free. <strong>Bangalore DevOps:</strong> 24/7 monitoring at $8/hr.
              </p>
            </div>

            {/* Stripe Cost Clarification */}
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(155,89,182,0.1)', borderRadius: '10px', border: '1px solid rgba(155,89,182,0.3)' }}>
              <p style={{ textAlign: 'center', color: '#9b59b6', fontWeight: 600, marginBottom: '8px' }}>💳 Stripe Payment Flow (Who Pays What)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#ff9500', fontWeight: 600, marginBottom: '5px' }}>Restaurant Pays</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>2.9% + $0.30 on order</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>$30 order = $1.17</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#0088ff', fontWeight: 600, marginBottom: '5px' }}>Customer Pays</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>$1 flat platform fee</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>No hidden fees</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(0,255,136,0.3)' }}>
                  <div style={{ color: '#00ff88', fontWeight: 600, marginBottom: '5px' }}>Platform Pays</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>Only on $2 app fee</div>
                  <div style={{ fontSize: '0.75rem', color: '#00ff88', marginTop: '5px' }}>= $0.09/order ✓</div>
                </div>
              </div>
            </div>
          </div>

          {/* ONE-TIME STARTUP COSTS */}
          <div className="glass-card" style={{ marginTop: '30px', background: 'linear-gradient(135deg, rgba(255,149,0,0.1), rgba(0,0,0,0))' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.3rem' }}>
              🚀 One-Time Startup Costs <span style={{ color: '#888', fontSize: '0.9rem' }}>(Already Invested)</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
              <div>
                <h4 style={{ color: '#ff9500', marginBottom: '15px' }}>🧠 AI/LLM Infrastructure</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { item: 'GPU Server (RTX 4090 x2)', cost: '$4,000', note: 'Runs Qwen 2.5 32B locally' },
                    { item: 'Qwen Fine-tuning (QLoRA)', cost: '$500', note: '~10 hrs compute' },
                    { item: 'Training Data Prep', cost: '$2,000', note: '5K labeled examples' },
                    { item: 'Ollama Setup', cost: '$0', note: 'Open source' },
                  ].map((row) => (
                    <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div><span>{row.item}</span><div style={{ fontSize: '0.7rem', color: '#666' }}>{row.note}</div></div>
                      <span style={{ color: '#ff9500' }}>{row.cost}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,149,0,0.2)', borderRadius: '8px', fontWeight: 600 }}>
                    <span>AI Subtotal</span><span style={{ color: '#ff9500' }}>$6,500</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#0088ff', marginBottom: '15px' }}>⚙️ Platform Development</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {[
                    { item: 'iOS Apps (3 apps)', cost: '$45,000', note: 'Customer, Driver, Restaurant' },
                    { item: 'Android Apps (3 apps)', cost: '$35,000', note: 'Customer, Driver, Restaurant' },
                    { item: 'Backend (17 services)', cost: '$60,000', note: 'FastAPI + PostgreSQL' },
                    { item: 'Admin Portal', cost: '$15,000', note: 'React dashboard' },
                  ].map((row) => (
                    <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div><span>{row.item}</span><div style={{ fontSize: '0.7rem', color: '#666' }}>{row.note}</div></div>
                      <span style={{ color: '#0088ff' }}>{row.cost}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,136,255,0.2)', borderRadius: '8px', fontWeight: 600 }}>
                    <span>Dev Subtotal</span><span style={{ color: '#0088ff' }}>$155,000</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                <h5 style={{ color: '#9b59b6', marginBottom: '10px', fontSize: '0.9rem' }}>📋 Legal</h5>
                {[{ item: 'LLC + ToS + Privacy', cost: '$5,000' }, { item: 'Insurance', cost: '$3,000' }].map((row) => (
                  <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0' }}>
                    <span style={{ color: '#888' }}>{row.item}</span><span style={{ color: '#9b59b6' }}>{row.cost}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>Total</span><span style={{ color: '#9b59b6' }}>$8,000</span>
                </div>
              </div>
              <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                <h5 style={{ color: '#00ff88', marginBottom: '10px', fontSize: '0.9rem' }}>🔧 Infrastructure</h5>
                {[{ item: 'AWS + CI/CD Setup', cost: '$2,500' }, { item: 'Security Audit', cost: '$5,000' }].map((row) => (
                  <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0' }}>
                    <span style={{ color: '#888' }}>{row.item}</span><span style={{ color: '#00ff88' }}>{row.cost}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>Total</span><span style={{ color: '#00ff88' }}>$7,500</span>
                </div>
              </div>
              <div style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                <h5 style={{ color: '#ff4d4d', marginBottom: '10px', fontSize: '0.9rem' }}>📦 Misc + Buffer</h5>
                {[{ item: 'Devices + Tools', cost: '$2,500' }, { item: 'Contingency (10%)', cost: '$18,000' }].map((row) => (
                  <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0' }}>
                    <span style={{ color: '#888' }}>{row.item}</span><span style={{ color: '#ff4d4d' }}>{row.cost}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.85rem' }}>
                  <span>Total</span><span style={{ color: '#ff4d4d' }}>$20,500</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.15))', borderRadius: '12px', border: '2px solid #00ff88', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>Total Startup Investment (Already Completed)</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>$197,500</div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '10px' }}>
                Platform is <strong style={{ color: '#00ff88' }}>100% built</strong>. This cost is sunk. <span style={{ color: '#ff9500' }}>Your $2M goes to growth, not development.</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,149,0,0.1)', borderRadius: '10px', border: '1px solid rgba(255,149,0,0.3)' }}>
              <p style={{ textAlign: 'center', color: '#ff9500', fontWeight: 600, marginBottom: '8px' }}>🖥️ Ongoing GPU Costs for Self-Hosted LLM</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>Power Cost</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff9500' }}>$50/mo</div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>350W x 24/7</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>Colocation</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff9500' }}>$100/mo</div>
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>Data center</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(0,255,136,0.3)' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>vs OpenAI</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00ff88' }}>Save $2,850/mo</div>
                  <div style={{ fontSize: '0.7rem', color: '#00ff88' }}>$150 vs $3K+</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 14.5 EXIT STRATEGY & COMPARABLES */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ffd93d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              EXIT STRATEGY
            </span>
          </div>
          <h2 style={styles.sectionTitle}>How Investors Make Money</h2>
          <p style={styles.sectionSubtitle}>Clear path to 150x returns. <span style={{ color: '#00ff88' }}>Multiple exit options.</span></p>

          <div className="glass-card" style={{ marginBottom: '30px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.3rem' }}>🏆 Comparable Exits & Valuations</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ ...styles.tableHeader, textAlign: 'left' }}>Company</th>
                    <th style={styles.tableHeader}>IPO/Exit</th>
                    <th style={styles.tableHeader}>Valuation</th>
                    <th style={styles.tableHeader}>Revenue Multiple</th>
                    <th style={styles.tableHeader}>GMV Multiple</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { company: 'DoorDash', event: 'IPO 2020', valuation: '$72B', revMult: '15x', gmvMult: '2.5x' },
                    { company: 'Uber', event: 'IPO 2019', valuation: '$82B', revMult: '6x', gmvMult: '1.3x' },
                    { company: 'Instacart', event: 'IPO 2023', valuation: '$10B', revMult: '4x', gmvMult: '0.3x' },
                    { company: 'Grubhub', event: 'Acquired 2021', valuation: '$7.3B', revMult: '4x', gmvMult: '0.8x' },
                    { company: 'Postmates', event: 'Acquired 2020', valuation: '$2.65B', revMult: '5x', gmvMult: '0.5x' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ ...styles.tableCell, fontWeight: 600 }}>{row.company}</td>
                      <td style={{ ...styles.tableCell, color: '#888' }}>{row.event}</td>
                      <td style={{ ...styles.tableCell, color: '#00ff88', fontWeight: 600 }}>{row.valuation}</td>
                      <td style={styles.tableCell}>{row.revMult}</td>
                      <td style={styles.tableCell}>{row.gmvMult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '30px' }}>
            <div className="glass-card" style={{ borderTop: '3px solid #00ff88' }}>
              <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>🎯 Exit Scenario 1: Acquisition</h4>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '15px' }}>Strategic acquirer (Uber, DoorDash, Amazon) buys to eliminate competition or acquire our AI/tech.</p>
              <div style={{ padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Year 3 Revenue</span><span style={{ color: '#00ff88' }}>$18M</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>5x Revenue Multiple</span><span style={{ color: '#00ff88' }}>$90M</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Investor Return (15%)</span><span style={{ color: '#00ff88' }}>$13.5M = 6.75x</span>
                </div>
              </div>
            </div>
            <div className="glass-card" style={{ borderTop: '3px solid #9b59b6' }}>
              <h4 style={{ color: '#9b59b6', marginBottom: '15px' }}>🚀 Exit Scenario 2: Series B+ & IPO</h4>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '15px' }}>Raise Series A/B, scale to 50 cities, IPO at $1B+ valuation in Year 5.</p>
              <div style={{ padding: '15px', background: 'rgba(155,89,182,0.1)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Year 5 Revenue</span><span style={{ color: '#9b59b6' }}>$206M</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>8x Revenue Multiple</span><span style={{ color: '#9b59b6' }}>$1.65B</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Investor Return (diluted to 8%)</span><span style={{ color: '#9b59b6' }}>$132M = 66x</span>
                </div>
              </div>
            </div>
            <div className="glass-card" style={{ borderTop: '3px solid #ff9500' }}>
              <h4 style={{ color: '#ff9500', marginBottom: '15px' }}>💎 Exit Scenario 3: Category Leader</h4>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '15px' }}>Become the "fair" alternative. DoorDash-level scale with profitable unit economics.</p>
              <div style={{ padding: '15px', background: 'rgba(255,149,0,0.1)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Year 7 Revenue</span><span style={{ color: '#ff9500' }}>$500M+</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>10x Revenue Multiple</span><span style={{ color: '#ff9500' }}>$5B+</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Investor Return (diluted to 5%)</span><span style={{ color: '#ff9500' }}>$250M = 125x+</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(255,149,0,0.1))', border: '1px solid #00ff88' }}>
            <h3 style={{ marginBottom: '15px' }}>Why We're Acquirable</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
              {[
                { icon: '🧠', text: 'Proprietary LLM trained on delivery data' },
                { icon: '👥', text: 'Loyal driver/restaurant network' },
                { icon: '🎓', text: 'Campus market dominance' },
                { icon: '💰', text: 'Profitable unit economics (they aren\'t)' },
              ].map((item) => (
                <div key={item.text} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 14.6 WHY INVEST NOW */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              MARKET TIMING
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Why Invest NOW</h2>
          <p style={styles.sectionSubtitle}>The window is open. <span style={{ color: '#ff9500' }}>It won't stay open forever.</span></p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '30px' }}>
            {[
              { icon: '😤', title: 'Driver Frustration at Peak', desc: 'Uber/DoorDash cut pay 25% in 2024. Drivers actively seeking alternatives. 2M+ gig workers ready to switch.', color: '#ff4d4d' },
              { icon: '🏪', title: 'Restaurants Desperate', desc: 'Post-COVID margins crushed. 62% say delivery fees unsustainable. They\'ll promote any alternative.', color: '#ff9500' },
              { icon: '🤖', title: 'AI Finally Ready', desc: 'Agentic AI (2024-2025) enables 95% automation. 2 years ago this wasn\'t possible. Competitors haven\'t adapted.', color: '#9b59b6' },
              { icon: '⚖️', title: 'Regulatory Pressure', desc: 'FTC investigations, NYC fee caps, CA AB5. Incumbents distracted. Perfect time to enter.', color: '#0088ff' },
              { icon: '🎓', title: 'Gen-Z Wants Fairness', desc: 'Students prefer "ethical" brands. Anti-corporate sentiment strong. We\'re the underdog they\'ll root for.', color: '#00ff88' },
              { icon: '💸', title: 'Seed Valuations Normalized', desc: '2021 froth is gone. $2M at $11M pre-money is reasonable. In 12 months, with traction, Series A at $50M+.', color: '#ffd93d' },
            ].map((item) => (
              <div key={item.title} className="glass-card" style={{ borderLeft: `4px solid ${item.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                  <h4 style={{ color: item.color, fontSize: '1.1rem' }}>{item.title}</h4>
                </div>
                <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,77,77,0.1), rgba(255,149,0,0.1))', border: '1px solid #ff9500' }}>
            <h3 style={{ color: '#ff9500', marginBottom: '15px' }}>⏰ The Window Closes When...</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {[
                'DoorDash/Uber fix their driver pay (unlikely)',
                'A well-funded competitor copies our model',
                'Regulations force incumbents to lower fees',
                'AI costs drop and they automate too',
              ].map((item, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#888', fontSize: '0.85rem' }}>
                  {item}
                </div>
              ))}
            </div>
            <p style={{ marginTop: '20px', color: '#ff9500', fontWeight: 600 }}>First-mover advantage is EVERYTHING in marketplaces. We need to move NOW.</p>
          </div>
        </section>

        {/* 14.7 RISKS & MITIGATION */}
        <section className="container">
          <h2 style={styles.sectionTitle}>Risks & How We Mitigate Them</h2>
          <p style={styles.sectionSubtitle}>We've thought through the challenges. <span style={{ color: '#00ff88' }}>Here's our playbook.</span></p>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', width: '25%' }}>Risk</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', width: '35%' }}>Impact</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'left', width: '40%', color: '#00ff88' }}>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { risk: 'DoorDash lowers fees', impact: 'Reduces our competitive advantage', mitigation: 'Our costs are 90% lower. They can\'t match $1 flat and stay profitable. Their shareholders won\'t allow it.' },
                  { risk: 'Can\'t get enough drivers', impact: 'Long wait times, bad experience', mitigation: 'Drivers keep 95%+ (just $1-3 flat fee). Food delivery: 100% of tips. Campus-first = students need flexible income. $100 referral bonuses.' },
                  { risk: 'Restaurants won\'t switch', impact: 'No supply = no customers', mitigation: 'Free onboarding, no lock-in. Start with frustrated restaurants already vocal about DoorDash.' },
                  { risk: 'Tech doesn\'t scale', impact: 'Service outages at growth', mitigation: 'AWS auto-scaling, 17 microservices, Kubernetes. Built to handle 500K orders/day from day 1.' },
                  { risk: 'Regulatory issues', impact: 'Fines, operational limits', mitigation: 'Matchmaking model (not TNC). Drivers are true independents. Legal review completed.' },
                  { risk: 'Team execution', impact: 'Miss milestones', mitigation: 'Bangalore talent is deep. 23+ months runway. Can course-correct multiple times.' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ ...styles.tableCell, color: '#ff4d4d', fontWeight: 600 }}>{row.risk}</td>
                    <td style={{ ...styles.tableCell, color: '#888', fontSize: '0.9rem' }}>{row.impact}</td>
                    <td style={{ ...styles.tableCell, color: '#00ff88', fontSize: '0.9rem' }}>{row.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 14.8 MILESTONES & TRANCHES */}
        <section className="container">
          <h2 style={styles.sectionTitle}>What $2M Unlocks</h2>
          <p style={styles.sectionSubtitle}>Clear milestones. Measurable progress. <span style={{ color: '#00ff88' }}>Accountability built in.</span></p>

          <div className="glass-card" style={{ marginBottom: '30px' }}>
            <div style={{ display: 'grid', gap: '0' }}>
              {[
                { phase: 'Month 1-3', title: 'Launch Ready', amount: '$400K', milestones: ['App Store + Play Store approval', 'First campus launch (UT Austin)', '50 restaurants onboarded', '100 drivers active', '1,000 orders completed'], color: '#0088ff' },
                { phase: 'Month 4-6', title: 'Campus Expansion', amount: '$500K', milestones: ['3 campuses live (add ASU, A&M)', '150 restaurants total', '400 drivers', '5,000 orders/month', 'Positive unit economics proven'], color: '#00ff88' },
                { phase: 'Month 7-9', title: 'Growth Mode', amount: '$600K', milestones: ['6 campuses live', '350 restaurants', '1,000 drivers', '25,000 orders/month', 'Break-even achieved'], color: '#9b59b6' },
                { phase: 'Month 10-12', title: 'Series A Ready', amount: '$500K', milestones: ['Rideshare feature launch', '10+ campuses', '50,000 orders/month', 'Series A materials prepared', '$3M+ ARR run-rate'], color: '#ff9500' },
              ].map((item, i) => (
                <div key={item.phase} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                  <div style={{ padding: '25px 20px', background: `rgba(${item.color === '#0088ff' ? '0,136,255' : item.color === '#00ff88' ? '0,255,136' : item.color === '#9b59b6' ? '155,89,182' : '255,149,0'},0.1)`, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.phase}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: item.color }}>{item.amount}</div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <h4 style={{ color: item.color, marginBottom: '10px' }}>{item.title}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {item.milestones.map((m) => (
                        <span key={m} style={{ fontSize: '0.8rem', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', color: '#888' }}>✓ {m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>12 Months</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>From funded to Series A ready</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>10+</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Campuses conquered</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>50,000</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Monthly orders</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>$3M+</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>ARR at month 12</div>
            </div>
          </div>
        </section>

        {/* 14.9 PHASE 2: TNC EVOLUTION */}
        <section className="container">
          <h2 style={styles.sectionTitle}>Phase 2: TNC Evolution</h2>
          <p style={styles.sectionSubtitle}>When scale justifies compliance. <span style={{ color: '#00ff88' }}>Advanced Uber-like service at half the cost.</span></p>

          {/* Phase Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px', marginBottom: '40px' }}>
            <div className="glass-card" style={{ borderLeft: '4px solid #0088ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <span style={{ fontSize: '2rem' }}>🚀</span>
                <div>
                  <h3 style={{ color: '#0088ff' }}>Phase 1: Matchmaking</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>NOW - Month 18</p>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '10px' }}>
                {[
                  'P2P matchmaking model',
                  'Drivers are true independents',
                  'No TNC license required',
                  'Minimal regulatory burden',
                  '$1-$3 flat platform fee',
                  'University campus focus',
                  'Food delivery + rideshare',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', color: '#ccc' }}>
                    <span style={{ color: '#0088ff' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid #00ff88' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <span style={{ fontSize: '2rem' }}>⚡</span>
                <div>
                  <h3 style={{ color: '#00ff88' }}>Phase 2: TNC Licensed</h3>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>Month 18+</p>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '10px' }}>
                {[
                  'Full Transportation Network Company',
                  'Uber/Lyft-level service capabilities',
                  'Airport pickups & commercial zones',
                  'Corporate accounts & scheduled rides',
                  'Dynamic surge pricing (when needed)',
                  'Nationwide expansion ready',
                  'Premium tiers & subscription models',
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', color: '#ccc' }}>
                    <span style={{ color: '#00ff88' }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Why We Still Win as TNC */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '30px' }}>
              Why We <span style={{ color: '#00ff88' }}>Still Beat Uber/DoorDash</span> Even as Full TNC
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Cost Category</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center', color: '#ff4d4d' }}>Uber/DoorDash</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center', color: '#00ff88' }}>Dollor.ai (TNC Phase)</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Our Advantage</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { category: 'AI/ML Development', uber: '$500M+/year R&D', dollor: '$0 (owned in-house)', advantage: '100% savings' },
                  { category: 'Engineering Team', uber: '$2.5M/mo (50 SF engineers)', dollor: '$77K/mo (60 Bangalore)', advantage: '97% lower' },
                  { category: 'Cloud Infrastructure', uber: '$100M+/year', dollor: 'AWS optimized ~$15K/mo', advantage: '99% lower' },
                  { category: 'Customer Acquisition', uber: '$25-40/user', dollor: '$4/user (campus viral)', advantage: '90% lower' },
                  { category: 'TNC Compliance', uber: '$50M+/year legal', dollor: '$200K/year (lean)', advantage: '99% lower' },
                  { category: 'Driver Take Rate', uber: '25-35% of fare', dollor: '$1-3 FLAT (5-10%)', advantage: 'Drivers earn more' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ ...styles.tableCell, fontWeight: 600 }}>{row.category}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', color: '#ff4d4d' }}>{row.uber}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', color: '#00ff88' }}>{row.dollor}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700, color: '#00ff88' }}>{row.advantage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '25px', textAlign: 'center', padding: '20px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px' }}>
              <span style={{ fontSize: '1.2rem', color: '#00ff88', fontWeight: 600 }}>
                Bottom Line: Even with full TNC compliance costs, our operating expenses are 85% lower than Uber/DoorDash
              </span>
            </div>
          </div>

          {/* TNC License Requirements */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '30px' }}>
              TNC License: <span style={{ color: '#9b59b6' }}>When & How</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
              {[
                {
                  title: 'When to Get TNC',
                  color: '#0088ff',
                  icon: '📅',
                  items: [
                    '10,000+ active riders in state',
                    '$500K+ monthly GMV per state',
                    'Airport/commercial demand proven',
                    'Corporate accounts requesting service'
                  ]
                },
                {
                  title: 'TNC Requirements',
                  color: '#ff9500',
                  icon: '📋',
                  items: [
                    'State PUC/DMV application ($5K-25K)',
                    '$1M commercial liability insurance',
                    'Driver background check system',
                    'Vehicle inspection protocols'
                  ]
                },
                {
                  title: 'Timeline',
                  color: '#00ff88',
                  icon: '⏱️',
                  items: [
                    'Application: 2-4 weeks prep',
                    'Review: 30-90 days (varies by state)',
                    'Texas: 60 days avg approval',
                    'California: 90 days (strictest)'
                  ]
                },
              ].map((card) => (
                <div key={card.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '25px', border: `1px solid ${card.color}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                    <h4 style={{ color: card.color }}>{card.title}</h4>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '8px' }}>
                    {card.items.map((item, i) => (
                      <li key={i} style={{ color: '#888', fontSize: '0.9rem', display: 'flex', gap: '8px' }}>
                        <span style={{ color: card.color }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 2 Features Unlocked */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '30px' }}>
              <span style={{ color: '#00ff88' }}>Premium Features</span> Unlocked with TNC Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {[
                { icon: '✈️', title: 'Airport Rides', desc: 'Direct pickup/dropoff at all major airports', color: '#0088ff' },
                { icon: '🏢', title: 'Corporate Accounts', desc: 'B2B contracts with expense integration', color: '#9b59b6' },
                { icon: '📅', title: 'Scheduled Rides', desc: 'Book rides hours/days in advance', color: '#ff9500' },
                { icon: '💎', title: 'Premium Tiers', desc: 'Black car, SUV, luxury options', color: '#00d4ff' },
                { icon: '🔄', title: 'Subscriptions', desc: '$29/mo unlimited delivery, $99/mo rides', color: '#00ff88' },
                { icon: '📍', title: 'Commercial Zones', desc: 'Hotels, convention centers, stadiums', color: '#e74c3c' },
              ].map((feature) => (
                <div key={feature.title} style={{ textAlign: 'center', padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{feature.icon}</div>
                  <h4 style={{ color: feature.color, marginBottom: '8px' }}>{feature.title}</h4>
                  <p style={{ color: '#888', fontSize: '0.85rem' }}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Impact */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>Phase 1 Revenue (Matchmaking)</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>$3M ARR</div>
              <div style={{ color: '#0088ff', fontSize: '0.85rem' }}>By Month 12</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center', border: '1px solid rgba(0,255,136,0.3)' }}>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>Phase 2 Revenue (TNC)</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#00ff88' }}>$25M+ ARR</div>
              <div style={{ color: '#00ff88', fontSize: '0.85rem' }}>By Month 24</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>TNC License Cost</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>~$200K</div>
              <div style={{ color: '#ff9500', fontSize: '0.85rem' }}>First 5 states</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '10px' }}>ROI on TNC Investment</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#00ff88' }}>110x</div>
              <div style={{ color: '#888', fontSize: '0.85rem' }}>$200K → $22M incremental</div>
            </div>
          </div>

          {/* Strategic Timeline */}
          <div className="glass-card" style={{ marginTop: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '30px' }}>Strategic Evolution Timeline</h3>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: '40px', bottom: '40px', width: '2px', background: 'linear-gradient(to bottom, #0088ff, #00ff88)', transform: 'translateX(-50%)' }}></div>
              {[
                { month: 'Month 1-6', title: 'Campus Dominance', desc: 'Launch matchmaking model at 6 universities. Prove demand, refine operations.', color: '#0088ff', side: 'left' },
                { month: 'Month 7-12', title: 'Regional Proof', desc: '10+ campuses, $3M ARR, break-even. Validate unit economics at scale.', color: '#0088ff', side: 'right' },
                { month: 'Month 13-18', title: 'TNC Prep', desc: 'Apply for TNC in Texas & Arizona. Build commercial partnerships.', color: '#9b59b6', side: 'left' },
                { month: 'Month 18-24', title: 'TNC Launch', desc: 'Full Uber-like service in licensed states. Airport, corporate, premium tiers.', color: '#00ff88', side: 'right' },
                { month: 'Month 24+', title: 'National Scale', desc: 'TNC in 10+ states. $25M+ ARR. Series A/B for aggressive expansion.', color: '#00ff88', side: 'left' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: item.side === 'left' ? '1fr 60px 1fr' : '1fr 60px 1fr', marginBottom: '30px' }}>
                  {item.side === 'left' ? (
                    <>
                      <div style={{ textAlign: 'right', paddingRight: '30px' }}>
                        <span style={{ color: item.color, fontWeight: 600 }}>{item.month}</span>
                        <h4 style={{ margin: '5px 0' }}>{item.title}</h4>
                        <p style={{ color: '#888', fontSize: '0.85rem' }}>{item.desc}</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: item.color, border: '3px solid #1a1a2e' }}></div>
                      </div>
                      <div></div>
                    </>
                  ) : (
                    <>
                      <div></div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: item.color, border: '3px solid #1a1a2e' }}></div>
                      </div>
                      <div style={{ paddingLeft: '30px' }}>
                        <span style={{ color: item.color, fontWeight: 600 }}>{item.month}</span>
                        <h4 style={{ margin: '5px 0' }}>{item.title}</h4>
                        <p style={{ color: '#888', fontSize: '0.85rem' }}>{item.desc}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 15. CFO-GRADE EBITDA & FINANCIAL MODEL */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              CFO-GRADE FINANCIALS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>EBITDA Model & Use of Funds</h2>
          <p style={styles.sectionSubtitle}>Bank-ready financials. <span style={{ color: '#00ff88' }}>Every dollar accounted for.</span></p>

          {/* Key Assumptions Box */}
          <div className="glass-card" style={{ marginBottom: '40px', borderLeft: '4px solid #ff9500' }}>
            <h3 style={{ color: '#ff9500', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚠️</span> Key Assumptions (Auditable)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {[
                { label: 'Avg Order Value (AOV)', value: '$30', note: 'Food delivery average' },
                { label: 'Platform Revenue/Order', value: '$2.00', note: '$1 customer + $1 restaurant' },
                { label: 'Variable Cost/Order', value: '$0.19', note: 'Stripe on $2 fee + AWS + Support' },
                { label: 'Contribution Margin', value: '$1.81 (90.5%)', note: 'Revenue - Variable Costs (Stripe direct)' },
                { label: 'Monthly Fixed Costs', value: '$85,000', note: 'Team + Infra + Overhead' },
                { label: 'Break-even Orders/Month', value: '46,961', note: '$85K ÷ $1.81/order' },
                { label: 'Break-even Orders/Day', value: '1,566', note: '46,961 ÷ 30 days' },
                { label: 'Customer Retention', value: '9 months avg', note: 'College students = 2 semesters' },
              ].map((item) => (
                <div key={item.label} style={{ padding: '15px', background: 'rgba(255,149,0,0.1)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ff9500' }}>{item.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Use of Funds Waterfall */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              💰 Use of Funds: <span style={{ color: '#00ff88' }}>$2,000,000 Allocation</span>
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left', width: '30%' }}>Category</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>%</th>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Monthly Burn</th>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Runway</th>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Justification</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { category: 'Engineering (Senior)', amount: '$700,000', pct: '35%', monthly: '$38,889', runway: '18 mo', justify: '12 iOS/Android + 8 Backend @ $12-15/hr Bangalore senior rates', color: '#00ff88' },
                  { category: 'Operations (Fresh Grads)', amount: '$350,000', pct: '17.5%', monthly: '$19,444', runway: '18 mo', justify: '30 fresh CS grads @ $6-10/hr for QA, AI training, support', color: '#0088ff' },
                  { category: 'AI Infrastructure', amount: '$250,000', pct: '12.5%', monthly: '-', runway: 'CapEx', justify: 'GPU servers (owned), Qwen/Ollama setup, zero recurring API costs', color: '#9b59b6' },
                  { category: 'Marketing & Launch', amount: '$350,000', pct: '17.5%', monthly: '$29,167', runway: '12 mo', justify: '6 campus launches × $50K each + $50K influencer reserve', color: '#ff9500' },
                  { category: 'Infrastructure & Security', amount: '$200,000', pct: '10%', monthly: '$8,000', runway: '25 mo', justify: 'AWS ($5K/mo) + SOC 2 audit ($50K) + security tools ($3K/mo)', color: '#ff4d4d' },
                  { category: 'Working Capital & Legal', amount: '$150,000', pct: '7.5%', monthly: '-', runway: 'Reserve', justify: 'Legal ($40K), Insurance ($30K), Patents ($30K), Contingency ($50K)', color: '#888' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ ...styles.tableCell, fontWeight: 600 }}><span style={{ color: row.color }}>●</span> {row.category}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: 700 }}>{row.amount}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>{row.pct}</td>
                    <td style={{ ...styles.tableCell }}>{row.monthly}</td>
                    <td style={{ ...styles.tableCell }}>{row.runway}</td>
                    <td style={{ ...styles.tableCell, fontSize: '0.8rem', color: '#888' }}>{row.justify}</td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(0,255,136,0.1)' }}>
                  <td style={{ ...styles.tableCell, fontWeight: 700 }}>TOTAL</td>
                  <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 700, color: '#00ff88' }}>$2,000,000</td>
                  <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700 }}>100%</td>
                  <td style={{ ...styles.tableCell, fontWeight: 700 }}>$95,500</td>
                  <td style={{ ...styles.tableCell, fontWeight: 700, color: '#00ff88' }}>20.9 mo</td>
                  <td style={{ ...styles.tableCell, fontSize: '0.8rem', color: '#00ff88' }}>Break-even at Month 6 extends runway indefinitely</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Month-by-Month P&L - Year 1 */}
          <div className="glass-card" style={{ marginBottom: '40px', overflowX: 'auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              📊 Month-by-Month P&L: <span style={{ color: '#0088ff' }}>Year 1 Projection</span>
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Metric</th>
                  {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'].map(m => (
                    <th key={m} style={{ ...styles.tableCell, textAlign: 'right', fontSize: '0.75rem', padding: '8px 4px' }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Orders/Day', values: [0, 0, 500, 1000, 1500, 2000, 2500, 2800, 3200, 3800, 4500, 5000], color: '#888' },
                  { metric: 'Orders/Month', values: [0, 0, 15000, 30000, 45000, 60000, 75000, 84000, 96000, 114000, 135000, 150000], color: '#888' },
                  { metric: 'Gross Revenue', values: ['$0', '$0', '$30K', '$60K', '$90K', '$120K', '$150K', '$168K', '$192K', '$228K', '$270K', '$300K'], color: '#00ff88' },
                  { metric: 'Variable Costs (9.2%)', values: ['$0', '$0', '$3K', '$5K', '$8K', '$11K', '$14K', '$15K', '$18K', '$21K', '$25K', '$27K'], color: '#ff4d4d' },
                  { metric: 'Contribution Margin', values: ['$0', '$0', '$27K', '$55K', '$82K', '$109K', '$136K', '$153K', '$174K', '$207K', '$245K', '$273K'], color: '#0088ff' },
                  { metric: 'Fixed Costs', values: ['$85K', '$85K', '$85K', '$85K', '$85K', '$85K', '$85K', '$85K', '$85K', '$90K', '$90K', '$90K'], color: '#ff9500' },
                  { metric: 'EBITDA', values: ['-$85K', '-$85K', '-$58K', '-$30K', '-$3K', '+$24K', '+$51K', '+$68K', '+$89K', '+$117K', '+$155K', '+$183K'], highlight: true },
                  { metric: 'Cumulative EBITDA', values: ['-$85K', '-$170K', '-$228K', '-$258K', '-$261K', '-$237K', '-$186K', '-$118K', '-$29K', '+$88K', '+$243K', '+$426K'], color: '#9b59b6' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: row.highlight ? 'rgba(0,255,136,0.1)' : 'transparent' }}>
                    <td style={{ ...styles.tableCell, fontWeight: 600, fontSize: '0.8rem' }}>{row.metric}</td>
                    {row.values.map((v, j) => (
                      <td key={j} style={{
                        ...styles.tableCell,
                        textAlign: 'right',
                        fontSize: '0.7rem',
                        padding: '8px 4px',
                        color: row.highlight ? (String(v).includes('+') ? '#00ff88' : '#ff4d4d') : row.color
                      }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '15px 25px', background: 'rgba(0,255,136,0.15)', borderRadius: '10px', border: '1px solid #00ff88' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>Break-even Month</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff88' }}>Month 6</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>2,000 orders/day</div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px 25px', background: 'rgba(0,136,255,0.15)', borderRadius: '10px', border: '1px solid #0088ff' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>Year 1 EBITDA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff88' }}>+$426K</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>Profitable Year 1</div>
              </div>
              <div style={{ textAlign: 'center', padding: '15px 25px', background: 'rgba(155,89,182,0.15)', borderRadius: '10px', border: '1px solid #9b59b6' }}>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>Year 1 Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#9b59b6' }}>$1.61M</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>804,000 orders</div>
              </div>
            </div>
          </div>

          {/* 5-Year EBITDA Projection */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              📈 5-Year EBITDA Projection
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Metric</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 1</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 2</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 3</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 4</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 5</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Campuses/Cities', y1: '6', y2: '15', y3: '40', y4: '100', y5: '200', color: '#888' },
                  { metric: 'Daily Orders', y1: '5,000', y2: '25,000', y3: '100,000', y4: '300,000', y5: '600,000', color: '#888' },
                  { metric: 'Annual Orders', y1: '804K', y2: '9.1M', y3: '36.5M', y4: '109.5M', y5: '219M', color: '#888' },
                  { metric: 'Gross Revenue', y1: '$1.61M', y2: '$18.2M', y3: '$73M', y4: '$219M', y5: '$438M', color: '#00ff88' },
                  { metric: 'Rideshare Revenue', y1: '$0', y2: '$2M', y3: '$10M', y4: '$40M', y5: '$100M', color: '#0088ff' },
                  { metric: 'Total Revenue', y1: '$1.61M', y2: '$20.2M', y3: '$83M', y4: '$259M', y5: '$538M', color: '#00ff88', bold: true },
                  { metric: 'Variable Costs (9.2%)', y1: '$0.15M', y2: '$1.9M', y3: '$7.6M', y4: '$23.8M', y5: '$49.5M', color: '#ff4d4d' },
                  { metric: 'Contribution Margin', y1: '$1.46M', y2: '$18.3M', y3: '$75.4M', y4: '$235.2M', y5: '$488.5M', color: '#0088ff' },
                  { metric: 'Fixed Costs', y1: '$1.02M', y2: '$3.5M', y3: '$8.5M', y4: '$20M', y5: '$35M', color: '#ff9500' },
                  { metric: 'EBITDA', y1: '+$0.44M', y2: '$14.8M', y3: '$66.9M', y4: '$215.2M', y5: '$453.5M', highlight: true },
                  { metric: 'EBITDA Margin', y1: '27%', y2: '73%', y3: '81%', y4: '83%', y5: '84%', color: '#9b59b6' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: row.highlight ? 'rgba(0,255,136,0.1)' : 'transparent' }}>
                    <td style={{ ...styles.tableCell, fontWeight: row.bold ? 700 : 600, fontSize: '0.85rem' }}>{row.metric}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.highlight ? '#00ff88' : row.color, fontWeight: row.highlight || row.bold ? 700 : 400 }}>{row.y1}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.highlight ? '#00ff88' : row.color, fontWeight: row.highlight || row.bold ? 700 : 400 }}>{row.y2}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.highlight ? '#00ff88' : row.color, fontWeight: row.highlight || row.bold ? 700 : 400 }}>{row.y3}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.highlight ? '#00ff88' : row.color, fontWeight: row.highlight || row.bold ? 700 : 400 }}>{row.y4}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.highlight ? '#00ff88' : row.color, fontWeight: row.highlight || row.bold ? 700 : 400 }}>{row.y5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cash Flow & Runway Analysis */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              💵 Cash Flow & Runway Analysis
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
              <div style={{ padding: '25px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px', border: '1px solid rgba(0,255,136,0.3)' }}>
                <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>Cash Position Timeline</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { month: 'Day 0', cash: '$2,000,000', note: 'Investment received' },
                    { month: 'Month 3', cash: '$1,730,000', note: 'First campus launched' },
                    { month: 'Month 6', cash: '$1,374,000', note: 'BREAK-EVEN reached!' },
                    { month: 'Month 9', cash: '$1,460,000', note: 'Cash building up' },
                    { month: 'Month 12', cash: '$1,886,000', note: 'Strong cash position' },
                    { month: 'Month 18', cash: '$3,200,000', note: 'Self-funded growth' },
                  ].map((item) => (
                    <div key={item.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{item.month}</span>
                      <span style={{ color: '#00ff88', fontWeight: 600 }}>{item.cash}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '25px', background: 'rgba(0,136,255,0.1)', borderRadius: '12px', border: '1px solid rgba(0,136,255,0.3)' }}>
                <h4 style={{ color: '#0088ff', marginBottom: '15px' }}>Sensitivity Analysis</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { scenario: 'Base Case', breakeven: 'Month 6', orders: '2,000/day', prob: '70%' },
                    { scenario: 'Optimistic (+20%)', breakeven: 'Month 5', orders: '1,700/day', prob: '20%' },
                    { scenario: 'Conservative (-20%)', breakeven: 'Month 8', orders: '2,500/day', prob: '10%' },
                  ].map((item) => (
                    <div key={item.scenario} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 600 }}>{item.scenario}</span>
                        <span style={{ color: '#0088ff' }}>{item.prob}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        Break-even: {item.breakeven} @ {item.orders}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,149,0,0.2)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <strong style={{ color: '#ff9500' }}>Worst Case:</strong> Even at -40% performance, runway extends to 18+ months with $600K remaining for pivot.
                </div>
              </div>

              <div style={{ padding: '25px', background: 'rgba(155,89,182,0.1)', borderRadius: '12px', border: '1px solid rgba(155,89,182,0.3)' }}>
                <h4 style={{ color: '#9b59b6', marginBottom: '15px' }}>Capital Efficiency Metrics</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {[
                    { metric: 'Revenue per $1 Invested', value: '$0.80 (Y1) → $269 (Y5)', color: '#9b59b6' },
                    { metric: 'CAC Payback', value: '4 days', color: '#00ff88' },
                    { metric: 'LTV:CAC Ratio', value: '39:1', color: '#0088ff' },
                    { metric: 'Gross Margin', value: '90.5%', color: '#00ff88' },
                    { metric: 'EBITDA Margin (Y5)', value: '84%', color: '#00ff88' },
                    { metric: 'Cash Conversion Cycle', value: '0 days', color: '#9b59b6' },
                  ].map((item) => (
                    <div key={item.metric} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#888' }}>{item.metric}</span>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Break-even Math Proof */}
          <div className="glass-card" style={{ marginBottom: '40px', borderLeft: '4px solid #00ff88' }}>
            <h3 style={{ marginBottom: '20px' }}>
              🧮 Break-even Math (Auditable)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              <div>
                <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>The Formula</h4>
                <div style={{ fontFamily: 'monospace', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div style={{ marginBottom: '10px' }}>Break-even Orders = Fixed Costs ÷ Contribution Margin</div>
                  <div style={{ marginBottom: '10px' }}>= $85,000 ÷ $1.81</div>
                  <div style={{ color: '#00ff88', fontWeight: 700 }}>= 46,961 orders/month</div>
                  <div style={{ marginTop: '15px', color: '#888' }}>= 1,566 orders/day</div>
                  <div style={{ color: '#888' }}>= 65 orders/hour (24/7)</div>
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#00d4ff' }}>✓ Stripe Connect: Platform only pays fees on $2 platform fee, not $30 order</div>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#0088ff', marginBottom: '15px' }}>Why Break-even by Month 5-6 is Achievable</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { fact: '6 campuses × 261 orders/day each', check: '= 1,566 orders/day (break-even) ✓' },
                    { fact: 'Avg campus: 40,000 students', check: '261 orders = 0.65% daily penetration' },
                    { fact: 'DoorDash college penetration', check: '3-5% daily (we need only 0.65%)' },
                    { fact: '90%+ margin via Stripe Connect', check: 'No payment processing on $30 orders' },
                  ].map((item) => (
                    <div key={item.fact} style={{ padding: '10px', background: 'rgba(0,136,255,0.1)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.85rem' }}>{item.fact}</div>
                      <div style={{ fontSize: '0.8rem', color: '#00ff88' }}>{item.check}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Investor Return Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>$242M</div>
              <div style={{ color: '#888' }}>Year 5 EBITDA</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0088ff' }}>45%</div>
              <div style={{ color: '#888' }}>EBITDA Margin</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#9b59b6' }}>8-12x</div>
              <div style={{ color: '#888' }}>EBITDA Multiple (Exit)</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>$2-3B</div>
              <div style={{ color: '#888' }}>Exit Valuation Range</div>
            </div>
          </div>
        </section>

        {/* INVESTMENT BURN DOWN CHART */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff9500, #ff4d4d)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              CASH RUNWAY
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Investment Burn Down Chart</h2>
          <p style={styles.sectionSubtitle}>18-month cash projection. <span style={{ color: '#00ff88' }}>Break-even at Month 6. Self-sustaining thereafter.</span></p>

          {/* Visual Burn Down Chart */}
          <div className="glass-card" style={{ marginBottom: '40px', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <span style={{ color: '#00ff88', fontWeight: 600 }}>●</span> Cash Position
                <span style={{ color: '#0088ff', fontWeight: 600, marginLeft: '20px' }}>●</span> Monthly Revenue
                <span style={{ color: '#ff4d4d', fontWeight: 600, marginLeft: '20px' }}>●</span> Monthly Burn
              </div>
              <div style={{ color: '#888', fontSize: '0.85rem' }}>Values in $000s</div>
            </div>

            {/* Chart Container */}
            <div style={{ position: 'relative', height: '400px', marginBottom: '20px' }}>
              {/* Y-axis labels */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 30, width: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {['$3.0M', '$2.5M', '$2.0M', '$1.5M', '$1.0M', '$0.5M', '$0'].map((label) => (
                  <div key={label} style={{ fontSize: '0.75rem', color: '#888', textAlign: 'right', paddingRight: '10px' }}>{label}</div>
                ))}
              </div>

              {/* Chart Area */}
              <div style={{ position: 'absolute', left: '60px', right: 0, top: 0, bottom: '30px', borderLeft: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 16.67}%`, borderTop: '1px dashed rgba(255,255,255,0.1)' }} />
                ))}

                {/* Break-even line at Month 6 */}
                <div style={{ position: 'absolute', left: `${(6/18) * 100}%`, top: 0, bottom: 0, borderLeft: '2px dashed #00ff88', zIndex: 10 }}>
                  <div style={{ position: 'absolute', top: '-25px', left: '-40px', background: '#00ff88', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    BREAK-EVEN
                  </div>
                </div>

                {/* Data bars */}
                {[
                  { month: 0, cash: 2000, revenue: 0, burn: 0, label: 'Start' },
                  { month: 1, cash: 1915, revenue: 0, burn: 85, label: 'M1' },
                  { month: 2, cash: 1830, revenue: 0, burn: 85, label: 'M2' },
                  { month: 3, cash: 1775, revenue: 30, burn: 85, label: 'M3' },
                  { month: 4, cash: 1751, revenue: 60, burn: 85, label: 'M4' },
                  { month: 5, cash: 1758, revenue: 90, burn: 85, label: 'M5' },
                  { month: 6, cash: 1793, revenue: 120, burn: 85, label: 'M6' },
                  { month: 7, cash: 1858, revenue: 150, burn: 85, label: 'M7' },
                  { month: 8, cash: 1943, revenue: 168, burn: 85, label: 'M8' },
                  { month: 9, cash: 2050, revenue: 192, burn: 85, label: 'M9' },
                  { month: 10, cash: 2188, revenue: 228, burn: 90, label: 'M10' },
                  { month: 11, cash: 2367, revenue: 270, burn: 90, label: 'M11' },
                  { month: 12, cash: 2577, revenue: 300, burn: 90, label: 'M12' },
                  { month: 13, cash: 2827, revenue: 340, burn: 90, label: 'M13' },
                  { month: 14, cash: 3117, revenue: 380, burn: 90, label: 'M14' },
                  { month: 15, cash: 3457, revenue: 430, burn: 90, label: 'M15' },
                  { month: 16, cash: 3847, revenue: 480, burn: 90, label: 'M16' },
                  { month: 17, cash: 4297, revenue: 540, burn: 90, label: 'M17' },
                  { month: 18, cash: 4807, revenue: 600, burn: 90, label: 'M18' },
                ].map((d, i) => {
                  const maxCash = 3000;
                  const barWidth = `${100 / 19}%`;
                  const cashHeight = Math.min((d.cash / maxCash) * 100, 100);
                  const isBelowStart = d.cash < 2000;
                  const isBreakeven = d.month === 8;

                  return (
                    <div key={i} style={{ position: 'absolute', left: `${(i / 19) * 100}%`, bottom: 0, width: barWidth, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: '0 2px' }}>
                      {/* Cash bar */}
                      <div style={{
                        width: '80%',
                        height: `${cashHeight}%`,
                        background: isBreakeven
                          ? 'linear-gradient(180deg, #00ff88, #0088ff)'
                          : isBelowStart
                            ? 'linear-gradient(180deg, #ff9500, #ff4d4d)'
                            : 'linear-gradient(180deg, #00ff88, #0088ff)',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        transition: 'height 0.3s ease',
                        boxShadow: isBreakeven ? '0 0 15px rgba(0,255,136,0.5)' : 'none'
                      }}>
                        {/* Value label on hover */}
                        <div style={{
                          position: 'absolute',
                          top: '-25px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '0.65rem',
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          fontWeight: 600
                        }}>
                          ${(d.cash / 1000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* $2M starting line */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${100 - (2000/3000) * 100}%`, borderTop: '2px solid rgba(255,255,255,0.3)', zIndex: 5 }}>
                  <span style={{ position: 'absolute', right: '5px', top: '-18px', fontSize: '0.7rem', color: '#888' }}>$2M Start</span>
                </div>
              </div>

              {/* X-axis labels */}
              <div style={{ position: 'absolute', left: '60px', right: 0, bottom: 0, height: '30px', display: 'flex' }}>
                {['Start', 'M3', 'M6', 'M8', 'M9', 'M12', 'M15', 'M18'].map((label, i) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: label === 'M8' ? '#00ff88' : '#888', fontWeight: label === 'M8' ? 700 : 400 }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '30px' }}>
              {[
                { month: 'Month 0', cash: '$2.00M', event: 'Investment Received', color: '#0088ff', icon: '💰' },
                { month: 'Month 3', cash: '$1.73M', event: 'First Campus Live', color: '#ff9500', icon: '🚀' },
                { month: 'Month 6', cash: '$1.37M', event: 'BREAK-EVEN!', color: '#00ff88', icon: '✓' },
                { month: 'Month 9', cash: '$1.46M', event: 'Cash Building', color: '#9b59b6', icon: '📊' },
                { month: 'Month 12', cash: '$1.89M', event: 'Strong Position', color: '#00ff88', icon: '📈' },
                { month: 'Month 18', cash: '$3.20M', event: 'Self-Funded Growth', color: '#00ff88', icon: '🎯' },
              ].map((m) => (
                <div key={m.month} style={{ padding: '15px', background: `rgba(${m.color === '#00ff88' ? '0,255,136' : m.color === '#0088ff' ? '0,136,255' : m.color === '#ff9500' ? '255,149,0' : '155,89,182'},0.1)`, borderRadius: '10px', border: `1px solid ${m.color}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>{m.month}</span>
                    <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: m.color }}>{m.cash}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>{m.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Cash Flow Table */}
          <div className="glass-card" style={{ marginBottom: '40px', overflowX: 'auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              📋 Monthly Cash Flow Detail
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Month</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Opening Cash</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right', color: '#00ff88' }}>+ Revenue</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right', color: '#ff4d4d' }}>- Fixed Costs</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right', color: '#ff9500' }}>- Variable Costs</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right', color: '#0088ff' }}>= Net Cash Flow</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 700 }}>Closing Cash</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { m: '0', open: '-', rev: '$2,000,000', fixed: '-', variable: '-', net: '+$2,000,000', close: '$2,000,000', highlight: true },
                  { m: '1', open: '$2,000,000', rev: '$0', fixed: '$85,000', variable: '$0', net: '-$85,000', close: '$1,915,000' },
                  { m: '2', open: '$1,915,000', rev: '$0', fixed: '$85,000', variable: '$0', net: '-$85,000', close: '$1,830,000' },
                  { m: '3', open: '$1,830,000', rev: '$30,000', fixed: '$85,000', variable: '$14,550', net: '-$69,550', close: '$1,760,450' },
                  { m: '4', open: '$1,760,450', rev: '$60,000', fixed: '$85,000', variable: '$29,100', net: '-$54,100', close: '$1,706,350' },
                  { m: '5', open: '$1,706,350', rev: '$90,000', fixed: '$85,000', variable: '$43,650', net: '-$38,650', close: '$1,667,700' },
                  { m: '6', open: '$1,667,700', rev: '$120,000', fixed: '$85,000', variable: '$58,200', net: '-$23,200', close: '$1,644,500' },
                  { m: '7', open: '$1,644,500', rev: '$150,000', fixed: '$85,000', variable: '$72,750', net: '-$7,750', close: '$1,636,750' },
                  { m: '8', open: '$1,636,750', rev: '$168,000', fixed: '$85,000', variable: '$81,480', net: '+$1,520', close: '$1,638,270', breakeven: true },
                  { m: '9', open: '$1,638,270', rev: '$192,000', fixed: '$85,000', variable: '$93,120', net: '+$13,880', close: '$1,652,150' },
                  { m: '10', open: '$1,652,150', rev: '$228,000', fixed: '$90,000', variable: '$110,580', net: '+$27,420', close: '$1,679,570' },
                  { m: '11', open: '$1,679,570', rev: '$270,000', fixed: '$90,000', variable: '$130,950', net: '+$49,050', close: '$1,728,620' },
                  { m: '12', open: '$1,728,620', rev: '$300,000', fixed: '$90,000', variable: '$145,500', net: '+$64,500', close: '$1,793,120', highlight: true },
                ].map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: row.breakeven ? 'rgba(0,255,136,0.15)' : row.highlight ? 'rgba(0,136,255,0.1)' : 'transparent'
                  }}>
                    <td style={{ ...styles.tableCell, fontWeight: row.breakeven ? 700 : 400 }}>
                      {row.breakeven && <span style={{ color: '#00ff88', marginRight: '5px' }}>★</span>}
                      {row.m === '0' ? 'Funding' : `Month ${row.m}`}
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>{row.open}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: '#00ff88' }}>{row.rev}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: '#ff4d4d' }}>{row.fixed}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: '#ff9500' }}>{row.variable}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.net.includes('+') ? '#00ff88' : '#ff4d4d', fontWeight: 600 }}>{row.net}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 700, color: row.breakeven ? '#00ff88' : 'white' }}>{row.close}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: '#00ff88', fontWeight: 600 }}>★ Month 6: First month of positive cash flow (+$24K)</span>
              <span style={{ color: '#888', marginLeft: '20px' }}>Year 1 ends with $1.89M cash (94% of starting capital preserved)</span>
            </div>
          </div>

          {/* Burn Rate Analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            <div className="glass-card">
              <h4 style={{ color: '#ff4d4d', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🔥</span> Burn Rate Breakdown
              </h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { category: 'Engineering Salaries', amount: '$38,889', pct: '45.7%' },
                  { category: 'Operations Team', amount: '$19,444', pct: '22.9%' },
                  { category: 'Marketing (avg)', amount: '$19,444', pct: '22.9%' },
                  { category: 'AWS/Infrastructure', amount: '$5,000', pct: '5.9%' },
                  { category: 'Tools & Software', amount: '$2,223', pct: '2.6%' },
                ].map((item) => (
                  <div key={item.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{item.category}</span>
                      <span style={{ color: '#ff4d4d', fontWeight: 600 }}>{item.amount}</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: item.pct, height: '100%', background: '#ff4d4d', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888', textAlign: 'right' }}>{item.pct}</div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Total Monthly Burn</span>
                  <span style={{ fontWeight: 700, color: '#ff4d4d' }}>$85,000</span>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ color: '#00ff88', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📈</span> Path to Profitability
              </h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {[
                  { phase: 'Pre-Launch', months: 'M1-M2', status: 'Pure burn, no revenue', burn: '-$170K cumulative', color: '#ff4d4d' },
                  { phase: 'Launch & Grow', months: 'M3-M7', status: 'Revenue growing, burn shrinking', burn: '-$193K cumulative', color: '#ff9500' },
                  { phase: 'Break-even', months: 'M8', status: 'Revenue = Costs', burn: '+$1.5K (positive!)', color: '#00ff88' },
                  { phase: 'Cash Generation', months: 'M9-M12', status: 'Profitable, reinvesting', burn: '+$155K cumulative', color: '#00ff88' },
                ].map((item) => (
                  <div key={item.phase} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 600 }}>{item.phase}</span>
                      <span style={{ color: item.color, fontSize: '0.85rem' }}>{item.months}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.status}</div>
                    <div style={{ fontSize: '0.85rem', color: item.color, fontWeight: 600, marginTop: '5px' }}>{item.burn}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ color: '#0088ff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🛡️</span> Safety Margins
              </h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {[
                  { scenario: 'Base Case', runway: '∞ (profitable M8)', minCash: '$1.64M', color: '#00ff88' },
                  { scenario: '20% Slower Growth', runway: '24+ months', minCash: '$1.35M', color: '#0088ff' },
                  { scenario: '40% Slower Growth', runway: '19 months', minCash: '$0.85M', color: '#ff9500' },
                  { scenario: 'Worst Case (no growth)', runway: '23 months', minCash: '$0', color: '#ff4d4d' },
                ].map((item) => (
                  <div key={item.scenario} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.scenario}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>Min cash: {item.minCash}</div>
                    </div>
                    <div style={{ color: item.color, fontWeight: 700, fontSize: '0.9rem' }}>{item.runway}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center' }}>
                <strong style={{ color: '#00ff88' }}>Key Insight:</strong> Even with ZERO growth, $2M provides 23 months to pivot
              </div>
            </div>
          </div>
        </section>

        {/* REVENUE VS BURN RATE CHART */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              BREAK-EVEN ANALYSIS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Revenue vs Total Costs</h2>
          <p style={styles.sectionSubtitle}>Watch the lines cross at Month 6. <span style={{ color: '#00ff88' }}>That's when we become self-sustaining.</span></p>

          <div className="glass-card" style={{ padding: '40px', marginBottom: '40px' }}>
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '4px', background: 'linear-gradient(90deg, #00ff88, #00d4ff)', borderRadius: '2px' }}></div>
                <span style={{ color: '#00ff88', fontWeight: 600 }}>Gross Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '4px', background: 'linear-gradient(90deg, #ff4d4d, #ff9500)', borderRadius: '2px' }}></div>
                <span style={{ color: '#ff4d4d', fontWeight: 600 }}>Total Costs (Fixed + Variable)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', background: 'rgba(0,255,136,0.3)', borderRadius: '4px' }}></div>
                <span style={{ color: '#888' }}>Profit Zone</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '20px', height: '20px', background: 'rgba(255,77,77,0.3)', borderRadius: '4px' }}></div>
                <span style={{ color: '#888' }}>Loss Zone</span>
              </div>
            </div>

            {/* Chart */}
            <div style={{ position: 'relative', height: '350px' }}>
              {/* Y-axis */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 40, width: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {['$300K', '$250K', '$200K', '$150K', '$100K', '$50K', '$0'].map((label) => (
                  <div key={label} style={{ fontSize: '0.75rem', color: '#888', textAlign: 'right', paddingRight: '10px' }}>{label}</div>
                ))}
              </div>

              {/* Chart Area */}
              <div style={{ position: 'absolute', left: '70px', right: '20px', top: 0, bottom: '40px', borderLeft: '2px solid rgba(255,255,255,0.2)', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                {/* Grid lines */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 16.67}%`, borderTop: '1px dashed rgba(255,255,255,0.1)' }} />
                ))}

                {/* Data points and lines */}
                {(() => {
                  const data = [
                    { month: 1, revenue: 0, costs: 85, label: 'M1' },
                    { month: 2, revenue: 0, costs: 85, label: 'M2' },
                    { month: 3, revenue: 30, costs: 100, label: 'M3' },
                    { month: 4, revenue: 60, costs: 114, label: 'M4' },
                    { month: 5, revenue: 90, costs: 129, label: 'M5' },
                    { month: 6, revenue: 120, costs: 143, label: 'M6' },
                    { month: 7, revenue: 150, costs: 158, label: 'M7' },
                    { month: 8, revenue: 168, costs: 166, label: 'M8' },
                    { month: 9, revenue: 192, costs: 178, label: 'M9' },
                    { month: 10, revenue: 228, costs: 201, label: 'M10' },
                    { month: 11, revenue: 270, costs: 221, label: 'M11' },
                    { month: 12, revenue: 300, costs: 236, label: 'M12' },
                  ];
                  const maxValue = 300;
                  const chartWidth = 100;
                  const chartHeight = 100;

                  return (
                    <>
                      {/* Loss zone (before break-even) */}
                      <svg style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }}>
                        <defs>
                          <linearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ff4d4d" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0.05" />
                          </linearGradient>
                          <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#00ff88" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {/* Loss area polygon (M1-M8) */}
                        <polygon
                          points={data.slice(0, 8).map((d, i) => {
                            const x = (i / 11) * 100;
                            const yRev = 100 - (d.revenue / maxValue) * 100;
                            const yCost = 100 - (d.costs / maxValue) * 100;
                            return `${x}%,${yCost}%`;
                          }).join(' ') + ' ' + data.slice(0, 8).reverse().map((d, i) => {
                            const x = ((7 - i) / 11) * 100;
                            const yRev = 100 - (d.revenue / maxValue) * 100;
                            return `${x}%,${yRev}%`;
                          }).join(' ')}
                          fill="url(#lossGradient)"
                        />

                        {/* Profit area polygon (M8-M12) */}
                        <polygon
                          points={data.slice(7).map((d, i) => {
                            const x = ((i + 7) / 11) * 100;
                            const yRev = 100 - (d.revenue / maxValue) * 100;
                            return `${x}%,${yRev}%`;
                          }).join(' ') + ' ' + data.slice(7).reverse().map((d, i) => {
                            const x = ((11 - i) / 11) * 100;
                            const yCost = 100 - (d.costs / maxValue) * 100;
                            return `${x}%,${yCost}%`;
                          }).join(' ')}
                          fill="url(#profitGradient)"
                        />

                        {/* Revenue line */}
                        <polyline
                          points={data.map((d, i) => `${(i / 11) * 100}%,${100 - (d.revenue / maxValue) * 100}%`).join(' ')}
                          fill="none"
                          stroke="url(#revenueLineGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <defs>
                          <linearGradient id="revenueLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00ff88" />
                            <stop offset="100%" stopColor="#00d4ff" />
                          </linearGradient>
                        </defs>

                        {/* Costs line */}
                        <polyline
                          points={data.map((d, i) => `${(i / 11) * 100}%,${100 - (d.costs / maxValue) * 100}%`).join(' ')}
                          fill="none"
                          stroke="url(#costLineGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <defs>
                          <linearGradient id="costLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ff4d4d" />
                            <stop offset="100%" stopColor="#ff9500" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Data points */}
                      {data.map((d, i) => {
                        const x = (i / 11) * 100;
                        const yRev = 100 - (d.revenue / maxValue) * 100;
                        const yCost = 100 - (d.costs / maxValue) * 100;
                        const isBreakeven = d.month === 8;

                        return (
                          <div key={i}>
                            {/* Revenue point */}
                            <div style={{
                              position: 'absolute',
                              left: `${x}%`,
                              top: `${yRev}%`,
                              width: isBreakeven ? '16px' : '10px',
                              height: isBreakeven ? '16px' : '10px',
                              background: '#00ff88',
                              borderRadius: '50%',
                              transform: 'translate(-50%, -50%)',
                              boxShadow: isBreakeven ? '0 0 20px rgba(0,255,136,0.8)' : '0 0 10px rgba(0,255,136,0.5)',
                              zIndex: 10
                            }} />

                            {/* Cost point */}
                            <div style={{
                              position: 'absolute',
                              left: `${x}%`,
                              top: `${yCost}%`,
                              width: isBreakeven ? '16px' : '10px',
                              height: isBreakeven ? '16px' : '10px',
                              background: '#ff4d4d',
                              borderRadius: '50%',
                              transform: 'translate(-50%, -50%)',
                              boxShadow: isBreakeven ? '0 0 20px rgba(255,77,77,0.8)' : '0 0 10px rgba(255,77,77,0.5)',
                              zIndex: 10
                            }} />

                            {/* Break-even indicator */}
                            {isBreakeven && (
                              <div style={{
                                position: 'absolute',
                                left: `${x}%`,
                                top: '-30px',
                                transform: 'translateX(-50%)',
                                background: 'linear-gradient(135deg, #00ff88, #0088ff)',
                                color: '#000',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 15px rgba(0,255,136,0.4)',
                                zIndex: 20
                              }}>
                                ✓ BREAK-EVEN
                              </div>
                            )}

                            {/* Value labels for key months */}
                            {(d.month === 1 || d.month === 8 || d.month === 12) && (
                              <>
                                <div style={{
                                  position: 'absolute',
                                  left: `${x}%`,
                                  top: `${yRev - 8}%`,
                                  transform: 'translateX(-50%)',
                                  fontSize: '0.7rem',
                                  color: '#00ff88',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  ${d.revenue}K
                                </div>
                                <div style={{
                                  position: 'absolute',
                                  left: `${x}%`,
                                  top: `${yCost + 5}%`,
                                  transform: 'translateX(-50%)',
                                  fontSize: '0.7rem',
                                  color: '#ff4d4d',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  ${d.costs}K
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Break-even vertical line */}
                      <div style={{
                        position: 'absolute',
                        left: `${(7 / 11) * 100}%`,
                        top: 0,
                        bottom: 0,
                        borderLeft: '2px dashed rgba(0,255,136,0.5)',
                        zIndex: 5
                      }} />
                    </>
                  );
                })()}
              </div>

              {/* X-axis labels */}
              <div style={{ position: 'absolute', left: '70px', right: '20px', bottom: 0, height: '40px', display: 'flex', justifyContent: 'space-between' }}>
                {['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'].map((label) => (
                  <div key={label} style={{
                    fontSize: '0.75rem',
                    color: label === 'M8' ? '#00ff88' : '#888',
                    fontWeight: label === 'M8' ? 700 : 400,
                    textAlign: 'center',
                    width: `${100/12}%`
                  }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <div style={{ padding: '20px', background: 'rgba(255,77,77,0.1)', borderRadius: '12px', borderLeft: '4px solid #ff4d4d' }}>
                <div style={{ fontSize: '0.85rem', color: '#ff4d4d', fontWeight: 600, marginBottom: '10px' }}>📉 Loss Phase (M1-M7)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff4d4d' }}>-$363K</div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Cumulative operating loss</div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '10px' }}>Costs exceed revenue as we build customer base</div>
              </div>
              <div style={{ padding: '20px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px', borderLeft: '4px solid #00ff88' }}>
                <div style={{ fontSize: '0.85rem', color: '#00ff88', fontWeight: 600, marginBottom: '10px' }}>✓ Break-even (M8)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff88' }}>$168K = $166K</div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Revenue meets costs</div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '10px' }}>2,800 orders/day across 6 campuses</div>
              </div>
              <div style={{ padding: '20px', background: 'rgba(0,136,255,0.1)', borderRadius: '12px', borderLeft: '4px solid #0088ff' }}>
                <div style={{ fontSize: '0.85rem', color: '#0088ff', fontWeight: 600, marginBottom: '10px' }}>📈 Profit Phase (M9-M12)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0088ff' }}>+$156K</div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Cumulative operating profit</div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '10px' }}>Revenue grows faster than costs</div>
              </div>
            </div>
          </div>

          {/* The Math Behind Break-even */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              🧮 The Math Behind Month 6 Break-even
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              <div>
                <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>Revenue Side</h4>
                <div style={{ fontFamily: 'monospace', padding: '20px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px' }}>Orders/day: <span style={{ color: '#00ff88' }}>2,800</span></div>
                  <div style={{ marginBottom: '8px' }}>× Revenue/order: <span style={{ color: '#00ff88' }}>$2.00</span></div>
                  <div style={{ marginBottom: '8px' }}>= Daily revenue: <span style={{ color: '#00ff88' }}>$5,600</span></div>
                  <div style={{ marginBottom: '8px' }}>× 30 days: </div>
                  <div style={{ borderTop: '1px solid rgba(0,255,136,0.3)', paddingTop: '8px', fontWeight: 700, color: '#00ff88' }}>
                    = $168,000/month
                  </div>
                </div>
              </div>
              <div>
                <h4 style={{ color: '#ff4d4d', marginBottom: '15px' }}>Cost Side</h4>
                <div style={{ fontFamily: 'monospace', padding: '20px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px' }}>Fixed costs: <span style={{ color: '#ff4d4d' }}>$85,000</span></div>
                  <div style={{ marginBottom: '8px' }}>+ Variable (84K orders × $0.19):</div>
                  <div style={{ marginBottom: '8px', paddingLeft: '15px' }}>Stripe fee on $2 platform fee: <span style={{ color: '#ff9500' }}>~$7,560</span></div>
                  <div style={{ marginBottom: '8px', paddingLeft: '15px' }}>Maps/SMS/Support allocation: <span style={{ color: '#ff9500' }}>~$8,400</span></div>
                  <div style={{ borderTop: '1px solid rgba(255,77,77,0.3)', paddingTop: '8px', fontWeight: 700, color: '#ff4d4d' }}>
                    = $100,960/month
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.15))', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '10px' }}>
                <span style={{ color: '#00ff88', fontWeight: 700 }}>$168,000</span>
                <span style={{ color: '#888' }}> revenue </span>
                <span style={{ fontSize: '1.5rem' }}>−</span>
                <span style={{ color: '#ff4d4d', fontWeight: 700 }}> $100,960</span>
                <span style={{ color: '#888' }}> costs </span>
                <span style={{ fontSize: '1.5rem' }}>=</span>
                <span style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.5rem' }}> +$67,040</span>
              </div>
              <div style={{ color: '#00ff88', fontWeight: 600 }}>Strongly profitable - economies of scale accelerating!</div>
            </div>
          </div>

          {/* Why Costs Don't Scale Linearly */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            <div className="glass-card">
              <h4 style={{ color: '#ff9500', marginBottom: '15px' }}>📊 Cost Structure Advantage</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Fixed Costs</span>
                    <span style={{ color: '#ff9500', fontWeight: 600 }}>$85K/mo</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Team, infrastructure - doesn't change with volume</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Variable Costs</span>
                    <span style={{ color: '#0088ff', fontWeight: 600 }}>$0.19/order</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Stripe fees, maps/SMS, support - scales with orders</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', borderLeft: '3px solid #00ff88' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Contribution Margin</span>
                    <span style={{ color: '#00ff88', fontWeight: 700 }}>$1.81/order</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Each order covers costs + contributes to fixed (90.5%)</div>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>🚀 Operating Leverage</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {[
                  { orders: '50K/mo', revenue: '$100K', costs: '$134K', profit: '-$34K', color: '#ff4d4d' },
                  { orders: '84K/mo', revenue: '$168K', costs: '$166K', profit: '+$2K', color: '#00ff88' },
                  { orders: '150K/mo', revenue: '$300K', costs: '$236K', profit: '+$64K', color: '#00ff88' },
                  { orders: '300K/mo', revenue: '$600K', costs: '$376K', profit: '+$224K', color: '#00ff88' },
                ].map((row) => (
                  <div key={row.orders} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem' }}>{row.orders}</div>
                    <div style={{ fontSize: '0.8rem', color: '#00ff88' }}>{row.revenue}</div>
                    <div style={{ fontSize: '0.8rem', color: '#ff4d4d' }}>{row.costs}</div>
                    <div style={{ fontSize: '0.8rem', color: row.color, fontWeight: 700 }}>{row.profit}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '10px', textAlign: 'center' }}>
                Fixed costs get spread across more orders → margins expand
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ color: '#9b59b6', marginBottom: '15px' }}>💎 Margin Expansion</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  { period: 'Month 6', margin: '20%', bar: '20%', color: '#ff9500' },
                  { period: 'Month 12', margin: '61%', bar: '61%', color: '#0088ff' },
                  { period: 'Year 2', margin: '73%', bar: '73%', color: '#00ff88' },
                  { period: 'Year 3', margin: '81%', bar: '81%', color: '#00ff88' },
                  { period: 'Year 5', margin: '84%', bar: '84%', color: '#00ff88' },
                ].map((row) => (
                  <div key={row.period}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{row.period}</span>
                      <span style={{ color: row.color, fontWeight: 600 }}>{row.margin}</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: row.bar, height: '100%', background: row.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(155,89,182,0.1)', borderRadius: '6px', fontSize: '0.8rem', textAlign: 'center' }}>
                <strong style={{ color: '#9b59b6' }}>From 20% → 84% EBITDA margin</strong>
              </div>
            </div>
          </div>
        </section>

        {/* RIDESHARE ECONOMICS - THE PROFIT ACCELERATOR */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #9b59b6, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              RIDESHARE ECONOMICS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>The Profit Accelerator</h2>
          <p style={styles.sectionSubtitle}>Food delivery gets us to break-even. <span style={{ color: '#9b59b6' }}>Rideshare makes us massively profitable.</span></p>

          {/* Food vs Rideshare Comparison */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              🍔 Food Delivery vs 🚗 Rideshare: Unit Economics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
              {/* Food Delivery */}
              <div style={{ padding: '25px', background: 'rgba(0,255,136,0.1)', borderRadius: '16px', border: '2px solid rgba(0,255,136,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '2.5rem' }}>🍔</span>
                  <div>
                    <h4 style={{ color: '#00ff88', fontSize: '1.3rem' }}>Food Delivery</h4>
                    <p style={{ color: '#888', fontSize: '0.85rem' }}>Phase 1: Month 1-12</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span>Avg Order Value</span>
                    <span style={{ fontWeight: 600 }}>$30</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span>Customer Fee</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>$1.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span>Restaurant Fee</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>$1.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,255,136,0.2)', borderRadius: '8px', border: '1px solid #00ff88' }}>
                    <span style={{ fontWeight: 700 }}>Platform Revenue</span>
                    <span style={{ fontWeight: 700, color: '#00ff88', fontSize: '1.2rem' }}>$2.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Variable Costs</span>
                    <span style={{ fontWeight: 600, color: '#ff4d4d' }}>$0.19</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,136,255,0.2)', borderRadius: '8px', border: '1px solid #0088ff' }}>
                    <span style={{ fontWeight: 700 }}>Contribution Margin</span>
                    <span style={{ fontWeight: 700, color: '#0088ff', fontSize: '1.2rem' }}>$1.81 (90.5%)</span>
                  </div>
                </div>
              </div>

              {/* Rideshare */}
              <div style={{ padding: '25px', background: 'rgba(155,89,182,0.1)', borderRadius: '16px', border: '2px solid rgba(155,89,182,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '2.5rem' }}>🚗</span>
                  <div>
                    <h4 style={{ color: '#9b59b6', fontSize: '1.3rem' }}>Rideshare</h4>
                    <p style={{ color: '#888', fontSize: '0.85rem' }}>Phase 2: Month 10+</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span>Avg Fare</span>
                    <span style={{ fontWeight: 600 }}>$25</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span>Customer Fee (Tier 1: &lt;$35)</span>
                    <span style={{ fontWeight: 600, color: '#9b59b6' }}>$1.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span>Driver Fee (from fare)</span>
                    <span style={{ fontWeight: 600, color: '#9b59b6' }}>$1.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(155,89,182,0.2)', borderRadius: '8px', border: '1px solid #9b59b6' }}>
                    <span style={{ fontWeight: 700 }}>Platform Revenue</span>
                    <span style={{ fontWeight: 700, color: '#9b59b6', fontSize: '1.2rem' }}>$2.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Variable Costs</span>
                    <span style={{ fontWeight: 600, color: '#ff4d4d' }}>$0.65</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,136,255,0.2)', borderRadius: '8px', border: '1px solid #0088ff' }}>
                    <span style={{ fontWeight: 700 }}>Contribution Margin</span>
                    <span style={{ fontWeight: 700, color: '#0088ff', fontSize: '1.2rem' }}>$1.35 (67.5%)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(135deg, rgba(155,89,182,0.2), rgba(0,136,255,0.2))', borderRadius: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>Both models deliver </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff88' }}>strong margins</span>
              <span style={{ fontSize: '1.1rem' }}> (Food: $1.81 / Ride: $1.35)</span>
            </div>
          </div>

          {/* Rideshare Tier Breakdown */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              🚗 Rideshare Pricing Tiers
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Tier</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Fare Range</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Customer Fee</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Driver Fee</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Platform Revenue</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Variable Cost</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Contribution</th>
                  <th style={{ ...styles.tableCell, textAlign: 'center' }}>Expected %</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: 'Tier 1', range: '< $35', custFee: '$1', driverFee: '$1', revenue: '$2', cost: '$0.65', contrib: '$1.35', pct: '60%', color: '#0088ff' },
                  { tier: 'Tier 2', range: '$35 - $70', custFee: '$2', driverFee: '$2', revenue: '$4', cost: '$1.05', contrib: '$2.95', pct: '30%', color: '#9b59b6' },
                  { tier: 'Tier 3', range: '> $70', custFee: '$3', driverFee: '$3', revenue: '$6', cost: '$1.45', contrib: '$4.55', pct: '10%', color: '#00ff88' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ ...styles.tableCell, fontWeight: 600, color: row.color }}>{row.tier}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center' }}>{row.range}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', color: row.color }}>{row.custFee}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', color: row.color }}>{row.driverFee}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700, color: row.color }}>{row.revenue}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', color: '#ff4d4d' }}>{row.cost}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700, color: '#00ff88' }}>{row.contrib}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'center', color: '#888' }}>{row.pct}</td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(155,89,182,0.1)' }}>
                  <td colSpan={4} style={{ ...styles.tableCell, fontWeight: 700 }}>Weighted Average (based on expected distribution)</td>
                  <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700, color: '#9b59b6' }}>$2.80</td>
                  <td style={{ ...styles.tableCell, textAlign: 'center', color: '#ff4d4d' }}>$0.85</td>
                  <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700, color: '#00ff88' }}>$1.95</td>
                  <td style={{ ...styles.tableCell, textAlign: 'center', color: '#888' }}>100%</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>
              Variable costs include: Stripe fees (2.9% of fare), AWS compute, support allocation. Lower than food delivery due to simpler transaction (no restaurant).
            </div>
          </div>

          {/* Combined Financial Model */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              📊 Combined Revenue Model: Food + Rideshare
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Metric</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 1</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 2</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 3</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 4</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Year 5</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: '🍔 Food Delivery', header: true },
                  { metric: 'Daily Orders', y1: '5,000', y2: '20,000', y3: '60,000', y4: '150,000', y5: '250,000', color: '#888' },
                  { metric: 'Revenue/Order', y1: '$2.00', y2: '$2.00', y3: '$2.00', y4: '$2.00', y5: '$2.00', color: '#888' },
                  { metric: 'Annual Food Revenue', y1: '$1.61M', y2: '$14.6M', y3: '$43.8M', y4: '$109.5M', y5: '$182.5M', color: '#00ff88', bold: true },
                  { metric: '🚗 Rideshare', header: true },
                  { metric: 'Daily Rides', y1: '0', y2: '2,000', y3: '10,000', y4: '40,000', y5: '100,000', color: '#888' },
                  { metric: 'Revenue/Ride (avg)', y1: '-', y2: '$2.80', y3: '$2.80', y4: '$2.80', y5: '$2.80', color: '#888' },
                  { metric: 'Annual Rideshare Revenue', y1: '$0', y2: '$2.0M', y3: '$10.2M', y4: '$40.9M', y5: '$102.2M', color: '#9b59b6', bold: true },
                  { metric: '📊 Combined', header: true },
                  { metric: 'Total Annual Revenue', y1: '$1.61M', y2: '$16.6M', y3: '$54.0M', y4: '$150.4M', y5: '$284.7M', color: '#00ff88', bold: true, highlight: true },
                  { metric: 'Blended Contribution Margin', y1: '$1.03', y2: '$1.14', y3: '$1.21', y4: '$1.28', y5: '$1.32', color: '#0088ff' },
                  { metric: 'Total Contribution', y1: '$0.83M', y2: '$9.5M', y3: '$32.7M', y4: '$96.3M', y5: '$188.5M', color: '#0088ff', bold: true },
                ].map((row, i) => (
                  row.header ? (
                    <tr key={i} style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <td colSpan={6} style={{ ...styles.tableCell, fontWeight: 700, fontSize: '1rem', color: row.metric.includes('🍔') ? '#00ff88' : row.metric.includes('🚗') ? '#9b59b6' : '#0088ff' }}>{row.metric}</td>
                    </tr>
                  ) : (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: row.highlight ? 'rgba(0,255,136,0.1)' : 'transparent' }}>
                      <td style={{ ...styles.tableCell, fontWeight: row.bold ? 600 : 400, paddingLeft: '20px' }}>{row.metric}</td>
                      <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.y1}</td>
                      <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.y2}</td>
                      <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.y3}</td>
                      <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.y4}</td>
                      <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 400 }}>{row.y5}</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Rideshare Burn & Profitability Impact */}
          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              🔥 How Rideshare Accelerates Profitability
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
              <div style={{ padding: '25px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px', borderTop: '4px solid #00ff88' }}>
                <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>Food Delivery Only</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Break-even</span>
                    <span style={{ fontWeight: 600 }}>Month 6</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 1 EBITDA</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>+$426K</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 2 EBITDA</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>$12.9M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 5 EBITDA</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>$368M</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '25px', background: 'rgba(155,89,182,0.1)', borderRadius: '12px', borderTop: '4px solid #9b59b6' }}>
                <h4 style={{ color: '#9b59b6', marginBottom: '15px' }}>Food + Rideshare Combined</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Break-even</span>
                    <span style={{ fontWeight: 600 }}>Month 6</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 1 EBITDA</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>+$426K</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 2 EBITDA</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>$14.8M (73%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 5 EBITDA</span>
                    <span style={{ fontWeight: 600, color: '#00ff88' }}>$453M (84%)</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '25px', background: 'rgba(0,136,255,0.1)', borderRadius: '12px', borderTop: '4px solid #0088ff' }}>
                <h4 style={{ color: '#0088ff', marginBottom: '15px' }}>Rideshare Incremental Value</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 2 Uplift</span>
                    <span style={{ fontWeight: 600, color: '#0088ff' }}>+$1.8M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 3 Uplift</span>
                    <span style={{ fontWeight: 600, color: '#0088ff' }}>+$8.5M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#888' }}>Year 5 Uplift</span>
                    <span style={{ fontWeight: 600, color: '#0088ff' }}>+$97M</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ color: '#888' }}>5-Year Extra EBITDA</span>
                    <span style={{ fontWeight: 700, color: '#00ff88' }}>+$120M</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rideshare Cost Structure */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            <div className="glass-card">
              <h4 style={{ color: '#ff9500', marginBottom: '15px' }}>💰 Rideshare Variable Costs</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { item: 'Stripe (2.9% of $25 fare)', cost: '$0.73', pct: '45%' },
                  { item: 'Stripe Fixed', cost: '$0.30', pct: '18%' },
                  { item: 'AWS Compute', cost: '$0.02', pct: '1%' },
                  { item: 'Maps API (Google)', cost: '$0.05', pct: '3%' },
                  { item: 'SMS/Push Notifications', cost: '$0.03', pct: '2%' },
                  { item: 'Support Allocation', cost: '$0.05', pct: '3%' },
                ].map((row) => (
                  <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.85rem' }}>{row.item}</span>
                    <span style={{ color: '#ff9500', fontWeight: 600 }}>{row.cost}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,149,0,0.2)', borderRadius: '8px', borderTop: '2px solid #ff9500' }}>
                  <span style={{ fontWeight: 700 }}>Total Variable/Ride</span>
                  <span style={{ fontWeight: 700, color: '#ff9500' }}>~$1.18</span>
                </div>
              </div>
              <div style={{ marginTop: '15px', fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>
                *Weighted avg across tiers. Tier 1 = $0.65, Tier 3 = $1.45
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>🎯 Why Rideshare Margins Are Higher</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {[
                  { reason: 'No restaurant in transaction', impact: 'Simpler payment flow, fewer parties', icon: '🍔❌' },
                  { reason: 'Higher avg transaction', impact: '$25 ride vs $30 order, but we get 2× fee on rides', icon: '💰' },
                  { reason: 'Longer trips = higher tiers', impact: 'Airport rides at $6 rev vs short hops at $2', icon: '✈️' },
                  { reason: 'No food-related costs', impact: 'No order accuracy issues, no refunds for cold food', icon: '🔥' },
                ].map((row) => (
                  <div key={row.reason} style={{ padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{row.icon}</span>
                      <span style={{ fontWeight: 600, color: '#00ff88' }}>{row.reason}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', paddingLeft: '30px' }}>{row.impact}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ color: '#9b59b6', marginBottom: '15px' }}>📈 Rideshare Growth Drivers</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  { driver: 'Cross-sell to food customers', metric: '15% conversion', color: '#00ff88' },
                  { driver: 'Campus party nights', metric: 'Fri-Sat 3x demand', color: '#0088ff' },
                  { driver: 'Airport runs', metric: 'High-value Tier 3', color: '#9b59b6' },
                  { driver: 'Same driver network', metric: '$0 incremental CAC', color: '#ff9500' },
                  { driver: 'TNC license (Y2+)', metric: 'Unlocks corporate', color: '#00ff88' },
                ].map((row) => (
                  <div key={row.driver} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.85rem' }}>{row.driver}</span>
                    <span style={{ color: row.color, fontWeight: 600, fontSize: '0.85rem' }}>{row.metric}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(155,89,182,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                <strong style={{ color: '#9b59b6' }}>Same app, same users, same drivers</strong>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Zero marginal acquisition cost for rideshare launch</div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '40px' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#9b59b6' }}>$1.95</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Avg Contribution/Ride</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>67.5%</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Rideshare Margin</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0088ff' }}>+$97M</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Y5 EBITDA Uplift</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ff9500' }}>36%</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>Y5 Revenue from Rideshare</div>
            </div>
          </div>
        </section>

        {/* TEAM & CAP TABLE */}
        <section className="container">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ background: 'linear-gradient(135deg, #9b59b6, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              LEADERSHIP TEAM
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Built by Operators, Not MBAs</h2>
          <p style={styles.sectionSubtitle}>Technical founders who ship. <span style={{ color: '#00ff88' }}>150K+ lines of production code already written.</span></p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            {[
              {
                name: 'Founder & CEO',
                role: 'Technical Architect',
                highlights: ['15+ years full-stack experience', 'Built 3 production platforms', 'Led teams of 50+ engineers', 'Zero-to-one product builder'],
                color: '#00ff88'
              },
              {
                name: 'CTO',
                role: 'AI & Infrastructure',
                highlights: ['8+ years ML/AI experience', 'Self-hosted LLM expertise (Ollama/Qwen)', 'AWS/Kubernetes at scale', 'Cost optimization specialist'],
                color: '#0088ff'
              },
              {
                name: 'COO',
                role: 'Operations & Growth',
                highlights: ['Bangalore operations lead', 'Scaled teams from 5 to 60', 'Fresh grad talent pipeline', '24/7 global coverage architect'],
                color: '#9b59b6'
              },
            ].map((member) => (
              <div key={member.name} className="glass-card" style={{ borderTop: `3px solid ${member.color}` }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '5px' }}>{member.name}</div>
                <div style={{ color: member.color, fontSize: '0.9rem', marginBottom: '15px' }}>{member.role}</div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '8px' }}>
                  {member.highlights.map((h) => (
                    <li key={h} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem', color: '#888' }}>
                      <span style={{ color: member.color, marginRight: '8px' }}>✓</span>{h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ marginBottom: '40px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px' }}>
              📊 Cap Table: <span style={{ color: '#00ff88' }}>Pre-Money $11.3M → Post-Money $13.3M</span>
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Shareholder</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Pre-Round</th>
                  <th style={{ ...styles.tableCell, textAlign: 'right' }}>Post-Round</th>
                  <th style={{ ...styles.tableCell, textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { holder: 'Founders (3)', pre: '85%', post: '72.25%', notes: 'Fully vested, active operators', color: '#00ff88' },
                  { holder: 'Employee Option Pool', pre: '15%', post: '12.75%', notes: 'For key hires (60 planned)', color: '#0088ff' },
                  { holder: 'New Investor(s)', pre: '-', post: '15%', notes: '$2M for 15% equity', color: '#ff9500' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ ...styles.tableCell, fontWeight: 600 }}><span style={{ color: row.color }}>●</span> {row.holder}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>{row.pre}</td>
                    <td style={{ ...styles.tableCell, textAlign: 'right', color: row.color, fontWeight: 600 }}>{row.post}</td>
                    <td style={{ ...styles.tableCell, color: '#888', fontSize: '0.85rem' }}>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#00ff88', fontSize: '1.3rem', fontWeight: 700 }}>$11.3M</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Pre-Money Valuation</div>
              </div>
              <div style={{ padding: '15px', background: 'rgba(0,136,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#0088ff', fontSize: '1.3rem', fontWeight: 700 }}>$13.3M</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Post-Money Valuation</div>
              </div>
              <div style={{ padding: '15px', background: 'rgba(255,149,0,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#ff9500', fontSize: '1.3rem', fontWeight: 700 }}>15%</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Investor Ownership</div>
              </div>
              <div style={{ padding: '15px', background: 'rgba(155,89,182,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#9b59b6', fontSize: '1.3rem', fontWeight: 700 }}>50-150x</div>
                <div style={{ color: '#888', fontSize: '0.85rem' }}>Target Return Range</div>
              </div>
            </div>
          </div>
        </section>

        {/* 15. The Ask */}
        <section className="container" style={{ paddingBottom: '150px' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 40px', background: 'linear-gradient(180deg, #1a1a2e 0%, rgba(0, 255, 136, 0.08) 100%)' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>The Ask</h2>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: '#00ff88', marginBottom: '10px', textShadow: '0 0 30px rgba(0,255,136,0.3)' }}>
              $2,000,000
            </div>
            <p style={{ fontSize: '1.3rem', color: '#888', marginBottom: '30px' }}>for 15% Equity</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '25px', marginBottom: '40px', width: '100%', maxWidth: '900px' }}>
              {[
                { value: '$11.3M', label: 'Pre-money' },
                { value: '23+ Months', label: 'Runway' },
                { value: 'Month 5-6', label: 'Break-even' },
                { value: '60 People', label: 'Quality Team' },
                { value: '$0', label: 'Software Costs' },
                { value: '150x', label: 'Target Return' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{stat.value}</div>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px', maxWidth: '700px' }}>
              <p style={{ color: '#00ff88', fontWeight: 600, marginBottom: '10px' }}>Why $2M?</p>
              <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Quality over quantity. Senior engineers who ship fast. Fresh Bangalore grads at $6/hr who are eager to learn.
                <span style={{ color: 'white' }}> Backend is 100% built. AI is 100% owned. Zero ongoing software costs.</span>
              </p>
            </div>

            <div className="btn-group" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
              <a href="mailto:invest@dollor.ai" style={{ ...styles.ctaButton, padding: '18px 40px', fontSize: '1.1rem', textDecoration: 'none', minWidth: '220px', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>invest@dollor.ai</a>
              <a href="https://dollor.ai" target="_blank" rel="noopener noreferrer" style={{ ...styles.ctaButton, padding: '18px 40px', fontSize: '1.1rem', textDecoration: 'none', background: 'transparent', border: '2px solid #00ff88', color: '#00ff88', minWidth: '220px', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>Visit dollor.ai</a>
              <a href="https://api.dollor.ai/docs" target="_blank" rel="noopener noreferrer" style={{ ...styles.ctaButton, padding: '18px 40px', fontSize: '1.1rem', textDecoration: 'none', background: 'transparent', border: '2px solid #9b59b6', color: '#9b59b6', minWidth: '220px', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>View Live API</a>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '40px 0', textAlign: 'center', color: '#888' }}>
        <div className="container">
          <p style={{ marginBottom: '15px', fontSize: '1.1rem' }}>"We own our AI. We own our margins. We own the future."</p>
          <p style={{ marginBottom: '20px' }}>&copy; 2025-2026 Dollor.ai - Confidential Investor Deck</p>
          <div style={{ fontSize: '0.75rem', color: '#555', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            <p style={{ fontWeight: 600, marginBottom: '10px' }}>FORWARD-LOOKING STATEMENTS DISCLAIMER</p>
            <p>
              This presentation contains forward-looking statements based on current expectations and assumptions. Actual results may differ materially due to risks including: market conditions, competitive dynamics, regulatory changes, technology risks, and execution challenges. Financial projections are estimates only and should not be relied upon as guarantees. Past performance does not guarantee future results. This is not an offer to sell or solicitation to buy securities. Investors should conduct their own due diligence. Break-even timeline, revenue projections, and return estimates are targets, not commitments.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// CSS Styles
const cssStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
    color: #fff;
    min-height: 100vh;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 60px 20px; }
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 30px;
    height: 100%;
  }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; }
  .text-gradient {
    background: linear-gradient(135deg, #fff 0%, #00ff88 50%, #00d4ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  a { color: #00ff88; }
  a:hover { opacity: 0.8; }

  /* Table alignment fixes */
  table { table-layout: fixed; }
  table th, table td { vertical-align: middle; }

  /* Grid alignment */
  .align-grid > * { display: flex; flex-direction: column; }

  /* Button alignment */
  .btn-group { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; align-items: stretch; }
  .btn-group a, .btn-group button { min-width: 180px; text-align: center; display: inline-flex; align-items: center; justify-content: center; }

  /* List alignment */
  ul { padding-left: 0; }
  li { list-style-position: inside; }

  @media (max-width: 768px) {
    .grid-3 { grid-template-columns: 1fr; }
    table { font-size: 0.8rem; }
    .btn-group { flex-direction: column; }
    .btn-group a, .btn-group button { width: 100%; }
  }
`;

const styles: { [key: string]: React.CSSProperties } = {
  app: { background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', minHeight: '100vh', color: '#fff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  tokenGate: { minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tokenCard: { background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '50px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px', width: '90%' },
  tokenInput: { width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '1rem', marginBottom: '15px', outline: 'none' },
  tokenButton: { width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', color: '#000', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  nav: { position: 'fixed' as const, top: '20px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 40px)', maxWidth: '1200px', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' },
  navLink: { color: '#888', fontSize: '0.9rem', textDecoration: 'none' },
  ctaButton: { padding: '8px 24px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #00ff88, #00d4ff)', color: '#000', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' },
  badge: { display: 'inline-block', padding: '8px 16px', background: 'rgba(0, 255, 136, 0.1)', borderRadius: '20px', color: '#00ff88', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 },
  sectionTitle: { fontSize: '2.5rem', marginBottom: '20px', textAlign: 'center' as const },
  sectionSubtitle: { textAlign: 'center' as const, color: '#888', marginBottom: '50px', maxWidth: '700px', margin: '0 auto 50px' },
  feeRow: { display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' },
  agentList: { listStyle: 'none', padding: 0, display: 'grid', gap: '8px' },
  agentItem: { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem' },
  highlightBox: { textAlign: 'center' as const, padding: '20px', background: 'rgba(0,255,136,0.1)', borderRadius: '12px', border: '1px solid #00ff88' },
  tableHeader: { padding: '15px 12px', color: '#888', textAlign: 'center' as const, verticalAlign: 'middle' as const, whiteSpace: 'nowrap' as const },
  tableCell: { padding: '15px 12px', textAlign: 'center' as const, verticalAlign: 'middle' as const },
  teamList: { listStyle: 'none', padding: 0, color: '#888', display: 'grid', gap: '8px' },
  costBadge: { marginTop: '15px', padding: '10px', borderRadius: '8px', textAlign: 'center' as const },
  scaleRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' },
  infraList: { listStyle: 'none', padding: 0, display: 'grid', gap: '10px', color: '#888' },
  yearCard: { background: '#1a1a2e', padding: '25px' },
};
