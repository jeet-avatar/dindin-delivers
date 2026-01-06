import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Password-based access control
const VALID_PASSWORD = 'investor2026';

// Watermark component - multi-position with viewer info
const Watermark: React.FC<{ timestamp: string }> = ({ timestamp }) => {
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
        Confidential
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
        Confidential
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
        Dollor.ai Confidential • {timestamp}
      </div>
    </>
  );
};

export default function InvestorDeck2026() {
  const [searchParams] = useSearchParams();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [viewTimestamp] = useState(new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }));

  useEffect(() => {
    const pwd = searchParams.get('pwd');
    if (pwd === VALID_PASSWORD) {
      setIsAuthorized(true);
    }
  }, [searchParams]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === VALID_PASSWORD) {
      setIsAuthorized(true);
    } else {
      setError('Invalid password. Please contact invest@dollor.ai');
    }
  };

  // Password gate
  if (!isAuthorized) {
    return (
      <div style={styles.tokenGate}>
        <div style={styles.tokenCard}>
          <img src="/logo-dollar-ai.svg" alt="Dollor.ai" style={{ height: '48px', marginBottom: '20px' }} />
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Investor Deck 2026</h2>
          <p style={{ color: '#888', marginBottom: '30px' }}>Enter password to view</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              style={styles.tokenInput}
            />
            <button type="submit" style={styles.tokenButton}>Access Deck</button>
          </form>
          {error && <p style={{ color: '#ff4d4d', marginTop: '15px', fontSize: '0.9rem' }}>{error}</p>}
          <p style={{ color: '#666', marginTop: '30px', fontSize: '0.85rem' }}>
            Request access: <a href="mailto:invest@dollor.ai" style={{ color: '#00ff88' }}>invest@dollor.ai</a>
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
      <Watermark timestamp={viewTimestamp} />

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo-dollar-ai.svg" alt="Dollor.ai" style={{ height: '32px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>dollor.ai</span>
        </div>
        <a href="mailto:invest@dollor.ai" style={styles.ctaButton}>Contact Us</a>
      </nav>

      <main style={{ paddingTop: '100px' }}>
        {/* Slide 1: The One-Line Wedge */}
        <section style={{ textAlign: 'center', minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="container">
            <div style={{ marginBottom: '20px' }}>
              <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '8px 20px', borderRadius: '25px', fontSize: '0.85rem', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>
                SEED STAGE • PRE-REVENUE
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, background: 'linear-gradient(135deg, #00ff88, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '30px', lineHeight: '1.2' }}>
              Dollor.ai
            </h1>
            <p style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: 'white', maxWidth: '900px', margin: '0 auto 40px', lineHeight: '1.5', fontWeight: 600 }}>
              A $1–$3 flat-fee marketplace testing whether delivery & rideshare can work without exploiting drivers or restaurants
            </p>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '1.1rem', color: '#888', marginBottom: '20px', lineHeight: '1.6' }}>
                Replacing % commissions with flat fees<br/>
                Starting in dense university markets
              </p>
              <div style={{ marginTop: '25px', padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.1))', borderRadius: '12px' }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#00ff88', marginBottom: '10px' }}>
                  Question we're answering:
                </p>
                <p style={{ fontSize: '1.1rem', color: 'white' }}>
                  Can fairness + AI cost advantages unlock a new marketplace behavior?
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '30px', fontStyle: 'italic' }}>
              ⚠️ This is a hypothesis, not a guarantee
            </p>
          </div>
        </section>

        {/* Slide 2: The Problem (Narrow, Not Moral) */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              THE PROBLEM
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Percent-Based Platforms Break Unit Economics at the Edges</h2>
          <p style={styles.sectionSubtitle}>This isn't about morality. <span style={{ color: '#ff4d4d' }}>It's about math.</span></p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            <div className="glass-card" style={{ borderTop: '3px solid #ff4d4d' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#ff4d4d' }}>Restaurants</h3>
              <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Lose 20–35% per order</p>
              <p style={{ color: '#888', fontSize: '0.95rem' }}>→ Shrink menus or quit platforms</p>
            </div>

            <div className="glass-card" style={{ borderTop: '3px solid #ff9500' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#ff9500' }}>Drivers</h3>
              <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Lose 25–40% per delivery/ride</p>
              <p style={{ color: '#888', fontSize: '0.95rem' }}>→ Churn, multi-app, low trust</p>
            </div>

            <div className="glass-card" style={{ borderTop: '3px solid #9b59b6' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#9b59b6' }}>Platforms</h3>
              <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Depend on fee opacity</p>
              <p style={{ color: '#888', fontSize: '0.95rem' }}>→ System works only if users don't see the math</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '30px', background: 'linear-gradient(135deg, rgba(255,77,77,0.15), rgba(255,149,0,0.1))', borderRadius: '16px', border: '1px solid rgba(255,77,77,0.3)' }}>
            <p style={{ fontSize: '1.3rem', fontWeight: 600, color: 'white' }}>
              <span style={{ color: '#ff4d4d' }}>Observation:</span> The system works only because participants don't see the math clearly.
            </p>
          </div>
        </section>

        {/* Slide 3: The Hypothesis (This Is the Bet) */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #0088ff, #00d4ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              THE HYPOTHESIS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>This Is the Bet</h2>
          <p style={{ ...styles.sectionSubtitle, fontSize: '1.2rem', fontStyle: 'italic' }}>
            <span style={{ color: '#0088ff' }}>Not yet proven.</span> This is what we're testing.
          </p>

          <div className="glass-card" style={{ padding: '40px', background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(0,255,136,0.05))', border: '2px solid rgba(0,136,255,0.3)', marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#00d4ff' }}>Our Hypothesis:</h3>
            <p style={{ fontSize: '1.2rem', lineHeight: '1.7', color: 'white' }}>
              If the platform cost is flat and transparent,<br/>
              <strong style={{ color: '#00ff88' }}>drivers and restaurants behave differently</strong><br/>
              — even if demand isn't perfectly cleared.
            </p>
          </div>

          <h3 style={{ fontSize: '1.4rem', marginBottom: '25px', color: '#ff9500' }}>What must be true:</h3>
          <div style={{ display: 'grid', gap: '20px' }}>
            {[
              { condition: 'Drivers accept lower surge upside', trade: 'in exchange for predictability', icon: '🚗' },
              { condition: 'Restaurants trade margin savings', trade: 'for volume', icon: '🍕' },
              { condition: 'Customers tolerate fewer dark-pattern fees', trade: 'for transparency', icon: '👥' },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px' }}>
                <div style={{ fontSize: '2rem' }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '5px' }}>
                    <strong>{item.condition}</strong>
                  </p>
                  <p style={{ color: '#888', fontSize: '0.95rem' }}>{item.trade}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '25px', background: 'rgba(255,149,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,149,0,0.4)' }}>
            <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ff9500' }}>
              This is what we are testing first.
            </p>
          </div>
        </section>

        {/* Slide 4: The Simplest Possible Solution */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              THE SOLUTION
            </span>
          </div>
          <h2 style={styles.sectionTitle}>One Rule Change. Everything Else Stays Boring.</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginTop: '40px' }}>
            {/* Food Delivery */}
            <div className="glass-card" style={{ padding: '35px', border: '2px solid #00ff88' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#00ff88' }}>🍕 Food Delivery</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                  <span>Customer fee</span>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>$1</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,255,136,0.1)', borderRadius: '8px' }}>
                  <span>Restaurant fee</span>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>$1</span>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderTop: '2px solid #00ff88' }}>
                  <span style={{ fontSize: '0.9rem', color: '#888' }}>Driver keeps</span><br/>
                  <span style={{ color: 'white', fontWeight: 600 }}>Delivery fee + 100% tips</span>
                </div>
              </div>
            </div>

            {/* Rideshare */}
            <div className="glass-card" style={{ padding: '35px', border: '2px solid #0088ff' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#0088ff' }}>🚗 Rideshare</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,136,255,0.1)', borderRadius: '8px' }}>
                  <span>Fare &lt; $35</span>
                  <span style={{ color: '#0088ff', fontWeight: 700 }}>$1 fee</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,136,255,0.1)', borderRadius: '8px' }}>
                  <span>$35–$70</span>
                  <span style={{ color: '#0088ff', fontWeight: 700 }}>$2 fee</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,136,255,0.1)', borderRadius: '8px' }}>
                  <span>$70+</span>
                  <span style={{ color: '#0088ff', fontWeight: 700 }}>$3 fee</span>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderTop: '2px solid #0088ff' }}>
                  <span style={{ fontSize: '0.9rem', color: '#888' }}>Driver keeps</span><br/>
                  <span style={{ color: 'white', fontWeight: 600 }}>Fare - flat fee + 100% tips</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center' }}>
            {[
              { label: 'No subscriptions', icon: '🚫' },
              { label: 'No surge tax', icon: '📈' },
              { label: 'No % extraction', icon: '💸' },
            ].map((item, i) => (
              <div key={i} className="glass-card">
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{item.icon}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Slide 5: Why This Might Work Now */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #9b59b6, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              TIMING
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Why This Might Work Now</h2>
          <p style={styles.sectionSubtitle}>This model failed before. <span style={{ color: '#ff9500' }}>Timing is why it might work now.</span></p>

          <div style={{ marginTop: '40px', display: 'grid', gap: '30px' }}>
            {[
              {
                title: 'AI-driven ops',
                subtitle: 'Onboarding, support, routing at much lower cost',
                desc: 'Self-hosted LLM (Qwen 2.5 32B via Ollama) runs on our servers. Zero LLM inference API costs. Automated document verification, menu OCR, routing, fraud detection.',
                color: '#9b59b6',
                icon: '🤖'
              },
              {
                title: 'Dense micro-markets',
                subtitle: 'Campuses behave differently than cities',
                desc: 'Students walk to restaurants. Deliveries are 0.5-2 miles, not 5-10. High order density enables profitability even without surge pricing. Social virality reduces CAC to $4 vs $25-40 citywide.',
                color: '#0088ff',
                icon: '🎓'
              },
              {
                title: 'Driver fatigue with incumbents',
                subtitle: 'Willingness to try alternatives',
                desc: '$60M+ in FTC/AG settlements in 2025 alone. Drivers earning $5.12/hr after expenses. Social media full of "quitting Uber" stories. Regulatory pressure mounting in 15+ states.',
                color: '#ff9500',
                icon: '😤'
              },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ padding: '30px', borderLeft: `4px solid ${item.color}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: item.color }}>{i + 1}. {item.title}</h3>
                    <p style={{ fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600, color: 'white' }}>{item.subtitle}</p>
                    <p style={{ fontSize: '0.95rem', color: '#888', lineHeight: '1.6' }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '25px', background: 'rgba(155,89,182,0.15)', borderRadius: '12px', border: '1px solid rgba(155,89,182,0.4)' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>
              We are not claiming inevitability — <span style={{ color: '#9b59b6' }}>only testability.</span>
            </p>
          </div>
        </section>

        {/* Slide 6: Competitive Landscape - Beyond Uber & Lyft */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              COMPETITIVE LANDSCAPE
            </span>
          </div>
          <h2 style={styles.sectionTitle}>U.S. Rideshare Market: Beyond Uber & Lyft</h2>
          <p style={styles.sectionSubtitle}>
            The market is <span style={{ color: '#ff9500' }}>much bigger and more fragmented</span> than most realize.
          </p>

          {/* Mass Market Rideshare */}
          <div className="glass-card" style={{ padding: '40px', marginTop: '40px', background: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.3)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#ff4d4d' }}>🚗 Mass Market On-Demand (Winner-Take-Most)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '25px', background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '1.3rem', color: '#ff4d4d', fontWeight: 700 }}>Uber</h4>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff4d4d' }}>~72%</span>
                </div>
                <p style={{ fontSize: '0.95rem', color: '#888' }}>Dominant U.S. market share • 25-30% take rate</p>
              </div>

              <div className="glass-card" style={{ padding: '25px', background: 'rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '1.3rem', color: '#ff9500', fontWeight: 700 }}>Lyft</h4>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff9500' }}>~24%</span>
                </div>
                <p style={{ fontSize: '0.95rem', color: '#888' }}>Second largest • Similar take-rate model</p>
              </div>
            </div>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,77,77,0.1)', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.95rem', color: '#888', textAlign: 'center' }}>
                <strong style={{ color: '#ff4d4d' }}>Key insight:</strong> This segment is ripe for disruption due to high take rates, driver dissatisfaction, and incoming AV competition
              </p>
            </div>
          </div>

          {/* Regulated Taxi Networks */}
          <div className="glass-card" style={{ padding: '40px', marginTop: '30px', background: 'rgba(0,136,255,0.05)', border: '1px solid rgba(0,136,255,0.3)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#0088ff' }}>🚕 Regulated Taxi E-Hail (Third Pillar)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '25px', background: 'rgba(0,0,0,0.3)' }}>
                <h4 style={{ fontSize: '1.3rem', color: '#0088ff', fontWeight: 700, marginBottom: '12px' }}>Curb</h4>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'white' }}>100,000+ connected drivers</p>
                <p style={{ fontSize: '0.95rem', color: '#888' }}>Largest modern taxi e-hail • Operating across major U.S. metros • Lyft partnership announced</p>
              </div>
            </div>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,136,255,0.1)', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.95rem', color: '#888', textAlign: 'center' }}>
                <strong style={{ color: '#0088ff' }}>Takeaway:</strong> Taxi networks are credible alternatives with different economics — can be partners, not just competitors
              </p>
            </div>
          </div>

          {/* Emerging Alternative Models */}
          <div className="glass-card" style={{ padding: '40px', marginTop: '30px', background: 'rgba(155,89,182,0.05)', border: '1px solid rgba(155,89,182,0.3)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#9b59b6' }}>🔄 Emerging Alternative Models</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {[
                {
                  category: 'Driver-First / Flat Fee',
                  players: 'Empower, Wridz',
                  desc: 'Driver rate control • Flat-fee or subscription models • Regional availability',
                  note: 'Regulatory pushback in some markets (DC, NYC)',
                  color: '#00ff88',
                  icon: '💚'
                },
                {
                  category: 'Premium W2 Employee Model',
                  players: 'Alto',
                  desc: 'W2 employee drivers (not gig) • Dallas & Houston',
                  note: 'Proves demand for better service + labor model, but different scalability',
                  color: '#ff9500',
                  icon: '⭐'
                },
                {
                  category: 'Scheduled / Airport-Focused',
                  players: 'Wingz',
                  desc: 'Pre-scheduled flat-rate rides • Airport orientation • "Favorite driver" concept',
                  note: 'Different retention & unit economics than on-demand',
                  color: '#0088ff',
                  icon: '✈️'
                },
                {
                  category: 'Specialized Verticals',
                  players: 'HopSkipDrive (kids), Via (microtransit)',
                  desc: 'Kids/school transport • B2G microtransit (100+ systems, 40 states)',
                  note: 'Specialized compliance opens new segments',
                  color: '#9b59b6',
                  icon: '🎒'
                },
              ].map((item, i) => (
                <div key={i} className="glass-card" style={{ padding: '25px', background: 'rgba(0,0,0,0.3)', borderTop: `3px solid ${item.color}` }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '1.2rem', color: item.color, fontWeight: 700, marginBottom: '8px' }}>{item.category}</h4>
                  <p style={{ fontSize: '1rem', color: 'white', marginBottom: '10px', fontWeight: 600 }}>{item.players}</p>
                  <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '12px', lineHeight: '1.5' }}>{item.desc}</p>
                  <div style={{ padding: '10px', background: `${item.color}15`, borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
                    <p style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' }}>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Autonomous Disruption Wave */}
          <div className="glass-card" style={{ padding: '40px', marginTop: '30px', background: 'linear-gradient(135deg, rgba(255,149,0,0.1), rgba(255,77,77,0.1))', border: '2px solid rgba(255,149,0,0.4)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: '#ff9500' }}>🤖 The 2025-2026 Disruption: Autonomous Ride-Hailing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
              {[
                { name: 'Waymo', status: 'Lyft partnership → Nashville 2026', color: '#00ff88' },
                { name: 'Zoox (Amazon)', status: 'Public service live in Las Vegas', color: '#0088ff' },
                { name: 'May Mobility', status: 'Deployed with Lyft in Atlanta (pilot)', color: '#9b59b6' },
              ].map((av, i) => (
                <div key={i} className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
                  <h4 style={{ fontSize: '1.2rem', color: av.color, marginBottom: '8px' }}>{av.name}</h4>
                  <p style={{ fontSize: '0.95rem', color: '#888' }}>{av.status}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '25px', background: 'rgba(255,149,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,149,0,0.5)' }}>
              <p style={{ fontSize: '1.1rem', color: 'white', textAlign: 'center', lineHeight: '1.6' }}>
                <strong style={{ color: '#ff9500' }}>Critical Question:</strong> AVs reduce labor costs, but they also threaten aggregator take-rates.<br/>
                <span style={{ color: '#888' }}>Dollor positions as an <strong style={{ color: '#00ff88' }}>ethical demand + pricing layer</strong>, not just a dispatch layer.</span>
              </p>
            </div>
          </div>

          {/* The Punchline */}
          <div style={{ marginTop: '50px', textAlign: 'center', padding: '40px', background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,136,255,0.15))', borderRadius: '20px', border: '2px solid rgba(0,255,136,0.4)' }}>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '20px', lineHeight: '1.4' }}>
              Every Incumbent Monetizes via Take-Rate.
            </p>
            <p style={{ fontSize: '1.4rem', color: '#00ff88', fontWeight: 700 }}>
              Dollor Monetizes via Flat Fees + Self-Hosted AI Operations.
            </p>
            <p style={{ fontSize: '1rem', color: '#888', marginTop: '20px', fontStyle: 'italic' }}>
              This is a fundamentally different business model — and the market is ready for it.
            </p>
          </div>
        </section>

        {/* Slide 7: What We've Built */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              PRODUCT STATUS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Enough to Test Behavior, Not Scale Fantasies</h2>
          <p style={styles.sectionSubtitle}>This is not a concept — <span style={{ color: '#00ff88' }}>but it's also not overbuilt.</span></p>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            {[
              { status: 'LIVE', title: 'Web Platform', items: ['Customer portal', 'Admin dashboard', 'Real-time analytics'], color: '#00ff88' },
              { status: 'LIVE', title: 'Onboarding', items: ['Driver verification', 'Restaurant setup', 'Menu OCR (AI-powered)'], color: '#00ff88' },
              { status: 'LIVE', title: 'Payments', items: ['Stripe Connect', 'Direct payouts', 'Fee transparency'], color: '#00ff88' },
              { status: 'LIVE', title: 'Operations', items: ['Order routing', 'Support automation', 'Fraud detection'], color: '#00ff88' },
              { status: 'TESTING', title: 'Mobile Apps', items: ['iOS (3 apps)', 'Android (3 apps)', 'Launching with pilots'], color: '#ff9500' },
              { status: 'READY', title: 'Backend', items: ['17 microservices', '700K+ lines of code', 'Kubernetes + AWS'], color: '#0088ff' },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ borderTop: `3px solid ${item.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'white' }}>{item.title}</h3>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: item.status === 'LIVE' ? 'rgba(0,255,136,0.2)' : item.status === 'TESTING' ? 'rgba(255,149,0,0.2)' : 'rgba(0,136,255,0.2)',
                    color: item.color
                  }}>
                    {item.status}
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '8px' }}>
                  {item.items.map((subitem, j) => (
                    <li key={j} style={{ color: '#888', fontSize: '0.9rem' }}>• {subitem}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.3)' }}>
            <p style={{ fontSize: '1.3rem', fontWeight: 600, color: 'white', marginBottom: '15px' }}>
              Key Point:
            </p>
            <p style={{ fontSize: '1.1rem', color: '#888' }}>
              This is not a concept — but it's also not overbuilt.<br/>
              <span style={{ color: '#00ff88' }}>We built exactly what we need to test the hypothesis.</span>
            </p>
          </div>
        </section>

        {/* Slide 8: Technical Moat (Zero LLM API Costs) */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #9b59b6, #ff4d4d)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              COMPETITIVE MOAT
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Why This is Hard to Copy</h2>
          <p style={styles.sectionSubtitle}>
            Most competitors pay <span style={{ color: '#ff4d4d' }}>$500K-2M/year</span> in LLM API costs. We pay <span style={{ color: '#00ff88' }}>$0</span>.
          </p>

          <div className="glass-card" style={{ padding: '50px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(155,89,182,0.15), rgba(255,77,77,0.1))', border: '2px solid rgba(155,89,182,0.4)' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '30px', color: '#9b59b6', textAlign: 'center' }}>🤖 Zero LLM API Costs = Structural Advantage</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
              <div className="glass-card" style={{ padding: '30px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)' }}>
                <h4 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#ff4d4d' }}>❌ Competitors</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • Pay OpenAI/Anthropic <span style={{ color: '#ff4d4d', fontWeight: 600 }}>$0.01-0.05/call</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • At 100K orders/month: <span style={{ color: '#ff4d4d', fontWeight: 600 }}>$500K-2M/year</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • Cost scales linearly with volume
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • Subject to API pricing changes
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '30px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
                <h4 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#00ff88' }}>✅ Dollor.ai</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • Self-hosted Qwen 32B via Ollama
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • Fixed infrastructure cost: <span style={{ color: '#00ff88', fontWeight: 600 }}>~$2K/month</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • <span style={{ color: '#00ff88', fontWeight: 600 }}>Zero marginal cost</span> per request
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    • Total control over model behavior
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', padding: '25px', background: 'rgba(155,89,182,0.2)', borderRadius: '12px', border: '1px solid rgba(155,89,182,0.5)' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white', textAlign: 'center' }}>
                At 100K orders/month, competitors burn <span style={{ color: '#ff4d4d' }}>$500K-2M/year</span> on LLM costs.<br/>
                <span style={{ color: '#00ff88' }}>We pay $24K/year in fixed infrastructure.</span>
              </p>
            </div>
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            {[
              {
                title: 'AI-Powered Operations',
                desc: 'Menu OCR, document verification, fraud detection, routing optimization, support automation',
                icon: '🧠',
                color: '#9b59b6'
              },
              {
                title: '700K+ Lines of Code',
                desc: '17 microservices, 3 mobile apps (iOS/Android), web platform, admin dashboards',
                icon: '💻',
                color: '#0088ff'
              },
              {
                title: 'Infrastructure Expertise',
                desc: 'Kubernetes + AWS, self-hosted AI models, cost-optimized architecture',
                icon: '⚙️',
                color: '#00ff88'
              },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ padding: '30px', borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: item.color }}>{item.title}</h3>
                <p style={{ fontSize: '0.95rem', color: '#888', lineHeight: '1.6' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px', background: 'linear-gradient(135deg, rgba(255,149,0,0.15), rgba(255,77,77,0.1))', borderRadius: '16px', border: '1px solid rgba(255,149,0,0.4)' }}>
            <p style={{ fontSize: '1.3rem', fontWeight: 600, color: 'white', marginBottom: '10px' }}>
              This Is Not Just Cost Savings
            </p>
            <p style={{ fontSize: '1.1rem', color: '#888' }}>
              It's a <span style={{ color: '#ff9500', fontWeight: 600 }}>structural competitive advantage</span> that enables the flat-fee model.<br/>
              <span style={{ color: '#00ff88' }}>Without zero LLM costs, the unit economics don't work.</span>
            </p>
          </div>
        </section>

        {/* Slide 9: Early Signals */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff9500, #ff4d4d)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              EARLY SIGNALS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Pre-Launch Preparation</h2>
          <p style={styles.sectionSubtitle}>
            <span style={{ color: '#ff9500' }}>We're in setup mode.</span> Launching pilots within 15 days of funding.
          </p>

          <div className="glass-card" style={{ padding: '40px', marginTop: '40px', background: 'rgba(255,149,0,0.05)', border: '1px solid rgba(255,149,0,0.3)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '25px', color: '#ff9500' }}>Current Status:</h3>
            <div style={{ display: 'grid', gap: '20px' }}>
              {[
                { metric: 'Platform Status', value: 'Staging live at dollor.ai', icon: '🌐' },
                { metric: 'Target Launch', value: '15 days post-funding', icon: '🚀' },
                { metric: 'First Market', value: 'UT Austin (45K students)', icon: '🎓' },
                { metric: 'Outreach Started', value: 'Restaurant associations contacted', icon: '🍕' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '1.8rem' }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '4px' }}>{item.metric}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '40px', marginTop: '30px' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '25px', color: '#00ff88' }}>What We'll Measure in First 90 Days:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {[
                { label: 'Driver Acceptance', target: '>70% at peak hours' },
                { label: 'Restaurant Reorders', target: '2+ orders/week' },
                { label: 'Order Fulfillment', target: '<15 min 80% of time' },
                { label: 'Customer Retention', target: '<60% monthly churn' },
                { label: 'Actual CAC', target: 'Validate $4-10 range' },
                { label: 'Unit Economics', target: 'Validate $1.80 margin' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '15px', background: 'rgba(0,255,136,0.05)', borderRadius: '10px', borderLeft: '3px solid #00ff88' }}>
                  <div style={{ fontSize: '0.9rem', color: '#00ff88', marginBottom: '8px', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.target}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '25px', background: 'rgba(0,136,255,0.1)', borderRadius: '12px', border: '1px solid rgba(0,136,255,0.3)' }}>
            <p style={{ fontSize: '1.1rem', color: '#888' }}>
              If numbers are small — that's okay.<br/>
              <span style={{ color: '#0088ff', fontWeight: 600 }}>Investors care more about learning velocity than scale here.</span>
            </p>
          </div>
        </section>

        {/* Slide 10: Press & Traction */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              PRESS & VALIDATION
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Early Coverage & Social Proof</h2>
          <p style={styles.sectionSubtitle}>
            We're not just a pitch deck — <span style={{ color: '#00ff88' }}>this is gaining real attention.</span>
          </p>

          <div className="glass-card" style={{ padding: '50px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', border: '2px solid rgba(0,255,136,0.3)' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '35px', textAlign: 'center', color: '#00ff88' }}>📰 Media Coverage & Recognition</h3>

            <div style={{ display: 'grid', gap: '25px' }}>
              {[
                {
                  outlet: 'YourStory',
                  headline: 'Featured startup coverage',
                  desc: 'Platform innovation in food delivery and rideshare',
                  date: '2025',
                  color: '#00ff88',
                  icon: '📰'
                },
                {
                  outlet: 'Campus Media',
                  headline: 'Student entrepreneur spotlight',
                  desc: 'Local coverage on UT Austin campus innovation',
                  date: '2025',
                  color: '#0088ff',
                  icon: '🎓'
                },
                {
                  outlet: 'Tech Community',
                  headline: 'Self-hosted AI innovation',
                  desc: 'Featured for zero-LLM-API-cost architecture',
                  date: '2025',
                  color: '#9b59b6',
                  icon: '🤖'
                },
              ].map((item, i) => (
                <div key={i} className="glass-card" style={{ padding: '30px', background: 'rgba(0,0,0,0.3)', borderLeft: `4px solid ${item.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                    <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '1.3rem', color: item.color, fontWeight: 700 }}>{item.outlet}</h4>
                        <span style={{ fontSize: '0.85rem', color: '#888' }}>{item.date}</span>
                      </div>
                      <p style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'white', fontWeight: 600 }}>{item.headline}</p>
                      <p style={{ fontSize: '0.95rem', color: '#888' }}>{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px' }}>
            {[
              {
                metric: 'Platform Status',
                value: 'Live at dollor.ai',
                desc: 'Staging environment publicly accessible',
                icon: '🌐',
                color: '#00ff88'
              },
              {
                metric: 'Restaurant Interest',
                value: '15+ contacted',
                desc: 'Austin restaurant associations engaged',
                icon: '🍕',
                color: '#ff9500'
              },
              {
                metric: 'Driver Signups',
                value: 'Waitlist active',
                desc: 'Pre-launch driver interest collection',
                icon: '🚗',
                color: '#0088ff'
              },
              {
                metric: 'Social Proof',
                value: 'Student testimonials',
                desc: 'Early feedback from campus community',
                icon: '💬',
                color: '#9b59b6'
              },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ padding: '25px', borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{item.icon}</div>
                <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>{item.metric}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color, marginBottom: '8px' }}>{item.value}</div>
                <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '40px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(155,89,182,0.1), rgba(0,136,255,0.1))', border: '1px solid rgba(155,89,182,0.3)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '25px', color: '#9b59b6', textAlign: 'center' }}>🎯 What This Proves</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {[
                'Third-party validation shows this is a real company, not just a concept',
                'Early press coverage de-risks the "is this team credible?" question',
                'Student/community interest validates campus-first GTM strategy',
                'Platform is live and functional — investors can test it themselves',
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ color: '#00ff88', fontSize: '1.2rem', marginTop: '2px' }}>✓</div>
                  <p style={{ fontSize: '1rem', color: '#888', lineHeight: '1.6' }}>{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.4)' }}>
            <p style={{ fontSize: '1.3rem', fontWeight: 600, color: 'white' }}>
              This isn't vaporware — <span style={{ color: '#00ff88' }}>we're building in public and gaining attention.</span>
            </p>
          </div>
        </section>

        {/* Slide 11: The Learning Plan (CRITICAL) */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #9b59b6)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              CRITICAL SLIDE
            </span>
          </div>
          <h2 style={styles.sectionTitle}>What We Will Learn in the Next 90 Days</h2>
          <p style={{ ...styles.sectionSubtitle, fontSize: '1.3rem' }}>
            This is <span style={{ color: '#ff4d4d' }}>the most important slide</span> in this deck
          </p>

          <div className="glass-card" style={{ padding: '40px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(255,77,77,0.1), rgba(155,89,182,0.1))', border: '2px solid rgba(255,77,77,0.3)' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '30px', color: '#ff4d4d' }}>Unknowns We Are Actively Testing:</h3>

            <div style={{ display: 'grid', gap: '25px' }}>
              {[
                { q: 'Driver acceptance rate at peak hours', why: 'Can we fulfill orders without surge pricing?', risk: 'HIGH' },
                { q: 'Order fulfillment reliability', why: 'Will drivers accept orders fast enough?', risk: 'HIGH' },
                { q: 'Restaurant reorder rates', why: 'Do savings drive repeat behavior?', risk: 'MEDIUM' },
                { q: 'Customer tolerance for transparency vs speed', why: 'Will users accept slower ETAs for fairness?', risk: 'MEDIUM' },
                { q: 'Actual CAC in campus environments', why: 'Can we acquire users for <$10?', risk: 'MEDIUM' },
              ].map((item, i) => (
                <div key={i} className="glass-card" style={{ padding: '25px', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '1.2rem', color: 'white', flex: 1 }}>❓ {item.q}</h4>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: item.risk === 'HIGH' ? 'rgba(255,77,77,0.3)' : 'rgba(255,149,0,0.3)',
                      color: item.risk === 'HIGH' ? '#ff4d4d' : '#ff9500',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.risk} RISK
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: '#888' }}><strong style={{ color: '#9b59b6' }}>Why it matters:</strong> {item.why}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
            <div className="glass-card" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.1))', border: '1px solid rgba(0,255,136,0.4)' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#00ff88' }}>✅ Success = Clear Signal</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px' }}>
                <li style={{ color: '#888' }}>• Driver acceptance &gt;70%</li>
                <li style={{ color: '#888' }}>• Restaurant reorders 2+/week</li>
                <li style={{ color: '#888' }}>• Fulfillment &lt;15 min (80%)</li>
                <li style={{ color: '#888' }}>• CAC &lt;$10</li>
              </ul>
            </div>

            <div className="glass-card" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(255,77,77,0.15), rgba(255,149,0,0.1))', border: '1px solid rgba(255,77,77,0.4)' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#ff4d4d' }}>❌ Kill Criteria</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px' }}>
                <li style={{ color: '#888' }}>• Driver acceptance &lt;40%</li>
                <li style={{ color: '#888' }}>• CAC &gt;$25</li>
                <li style={{ color: '#888' }}>• Churn &gt;70%/month</li>
                <li style={{ color: '#888' }}>• Model doesn't hold</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '30px', background: 'rgba(155,89,182,0.15)', borderRadius: '16px', border: '1px solid rgba(155,89,182,0.4)' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '15px' }}>
              Success ≠ Perfection
            </p>
            <p style={{ fontSize: '1.3rem', color: '#9b59b6' }}>
              Success = Clear Signal Fast
            </p>
            <p style={{ fontSize: '1rem', color: '#888', marginTop: '20px', fontStyle: 'italic' }}>
              This is where the investor feels early.
            </p>
          </div>
        </section>

        {/* Slide 12: Why Campuses First */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #0088ff, #9b59b6)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              GO-TO-MARKET
            </span>
          </div>
          <h2 style={styles.sectionTitle}>We Don't Start Where Incumbents Are Strongest</h2>
          <p style={styles.sectionSubtitle}>
            Campuses aren't our final market — <span style={{ color: '#0088ff' }}>they're our laboratory</span>
          </p>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
            {[
              {
                title: 'High Density',
                desc: 'Deliveries are 0.5-2 miles, not 5-10. Order clustering enables faster learning loops.',
                benefit: 'Test 100 orders/day instead of 20',
                icon: '🎯',
                color: '#0088ff'
              },
              {
                title: 'Predictable Demand',
                desc: 'Meal times are synchronized. Clear demand windows make fulfillment testing easier.',
                benefit: 'Validate model without chaos',
                icon: '📊',
                color: '#00ff88'
              },
              {
                title: 'Built-in Labor',
                desc: 'Students need flexible income. No commute required. Drivers walk/bike to restaurants.',
                benefit: 'Supply-side readily available',
                icon: '🚴',
                color: '#ff9500'
              },
              {
                title: 'Social Virality',
                desc: 'Dorms, Greek life, clubs, campus pages create network effects without paid marketing.',
                benefit: 'CAC $4 vs $25-40 citywide',
                icon: '📱',
                color: '#9b59b6'
              },
            ].map((item, i) => (
              <div key={i} className="glass-card" style={{ padding: '30px', borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', color: item.color }}>{item.title}</h3>
                <p style={{ fontSize: '0.95rem', color: '#888', marginBottom: '15px', lineHeight: '1.6' }}>{item.desc}</p>
                <div style={{ padding: '12px', background: `${item.color}15`, borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
                  <p style={{ fontSize: '0.85rem', color: item.color, fontWeight: 600 }}>→ {item.benefit}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '35px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(0,136,255,0.1), rgba(155,89,182,0.1))', border: '1px solid rgba(0,136,255,0.3)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', color: '#0088ff' }}>6-Campus Pilot Plan (First 12 Months):</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {[
                { month: 'Month 1-2', campus: 'UT Austin', students: '45K' },
                { month: 'Month 3-4', campus: 'ASU Tempe', students: '58K' },
                { month: 'Month 5-6', campus: 'Texas A&M', students: '68K' },
                { month: 'Month 7-8', campus: 'Ohio State', students: '62K' },
                { month: 'Month 9-10', campus: 'U Florida', students: '54K' },
                { month: 'Month 11-12', campus: 'Penn State', students: '47K' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', borderLeft: '3px solid #0088ff' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>{item.month}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', marginBottom: '3px' }}>{item.campus}</div>
                  <div style={{ fontSize: '0.85rem', color: '#0088ff' }}>{item.students} students</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center', padding: '25px', background: 'rgba(155,89,182,0.1)', borderRadius: '12px', border: '1px solid rgba(155,89,182,0.3)' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>
              This is not our final market — <span style={{ color: '#9b59b6' }}>it's our laboratory.</span>
            </p>
          </div>
        </section>

        {/* Slide 13: Unit Economics (Only One Table) */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #00ff88, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#000' }}>
              UNIT ECONOMICS
            </span>
          </div>
          <h2 style={styles.sectionTitle}>What Happens If the Hypothesis Holds</h2>
          <p style={{ ...styles.sectionSubtitle, fontSize: '1.2rem', fontStyle: 'italic' }}>
            <span style={{ color: '#ff9500' }}>These numbers only matter after behavioral validation.</span>
          </p>

          <div className="glass-card" style={{ padding: '50px', marginTop: '40px', maxWidth: '600px', margin: '40px auto 0' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '30px', textAlign: 'center', color: '#00ff88' }}>Per-Order Economics (Food Delivery)</h3>

            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,255,136,0.1)', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>Platform Revenue</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#00ff88' }}>$2.00</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,77,77,0.1)', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>Estimated Variable Cost</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ff4d4d' }}>~$0.20</span>
              </div>

              <div style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,136,255,0.15))', borderRadius: '12px', border: '2px solid #00ff88' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Contribution Margin</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00ff88' }}>~$1.80</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#888', marginTop: '10px', textAlign: 'center' }}>
                  (~90% margin)
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.95rem', color: '#888', lineHeight: '1.6' }}>
                <strong style={{ color: '#ff9500' }}>Variable costs include:</strong><br/>
                Stripe fees (~$0.09), Maps API (~$0.04), SMS (~$0.02), Support allocation (~$0.05)
              </p>
            </div>
          </div>

          <div style={{ marginTop: '50px', textAlign: 'center', padding: '35px', background: 'linear-gradient(135deg, rgba(255,149,0,0.2), rgba(255,77,77,0.15))', borderRadius: '16px', border: '2px solid rgba(255,149,0,0.5)' }}>
            <p style={{ fontSize: '1.1rem', color: '#888', marginBottom: '15px' }}>
              ⚠️ IMPORTANT FRAMING
            </p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '15px' }}>
              These numbers only matter after behavioral validation.
            </p>
            <p style={{ fontSize: '1.2rem', color: '#ff9500' }}>
              We are not scaling until this is real.
            </p>
          </div>
        </section>

        {/* Slide 14: The Team */}
        <section className="container" style={{ marginTop: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #9b59b6, #0088ff)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              THE TEAM
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Built by Operators, Not MBAs</h2>
          <p style={styles.sectionSubtitle}>
            Technical founders who ship. <span style={{ color: '#00ff88' }}>We can iterate weekly, not quarterly.</span>
          </p>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            {[
              {
                role: 'Founder & CEO',
                title: 'Technical Architect',
                highlights: [
                  '15+ years full-stack experience',
                  'Built 3 production platforms',
                  'Led teams of 50+ engineers',
                  'Zero-to-one product builder'
                ],
                color: '#00ff88'
              },
              {
                role: 'CTO',
                title: 'AI & Infrastructure',
                highlights: [
                  '8+ years ML/AI experience',
                  'Self-hosted LLM expertise (Ollama/Qwen)',
                  'AWS/Kubernetes at scale',
                  'Cost optimization specialist'
                ],
                color: '#0088ff'
              },
              {
                role: 'COO',
                title: 'Operations & Growth',
                highlights: [
                  'Bangalore operations lead',
                  'Scaled teams from 5 to 60',
                  'Fresh grad talent pipeline',
                  '24/7 global coverage architect'
                ],
                color: '#9b59b6'
              },
            ].map((person, i) => (
              <div key={i} className="glass-card" style={{ padding: '30px', borderTop: `4px solid ${person.color}` }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: person.color }}>{person.role}</h3>
                <p style={{ fontSize: '1.1rem', color: '#888', marginBottom: '20px' }}>{person.title}</p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '10px' }}>
                  {person.highlights.map((item, j) => (
                    <li key={j} style={{ fontSize: '0.95rem', color: '#aaa', paddingLeft: '20px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: person.color }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '35px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', border: '1px solid rgba(0,255,136,0.3)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#00ff88', textAlign: 'center' }}>Why This Matters:</h3>
            <p style={{ fontSize: '1.1rem', textAlign: 'center', color: '#888', lineHeight: '1.7' }}>
              We can iterate product, operations, and pricing <span style={{ color: 'white', fontWeight: 600 }}>weekly, not quarterly</span>.<br/>
              <span style={{ color: '#00ff88' }}>Learning speed is our core advantage.</span>
            </p>
          </div>

          <div style={{ marginTop: '30px', padding: '25px', background: 'rgba(155,89,182,0.1)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', color: '#888' }}>
              <strong style={{ color: '#9b59b6' }}>Cap Table:</strong> 3 Founders hold 85% (pre-money) | 4-year vesting, 1-year cliff | All full-time
            </p>
          </div>
        </section>

        {/* Slide 15: The Ask */}
        <section className="container" style={{ marginTop: '100px', marginBottom: '100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <span style={{ background: 'linear-gradient(135deg, #ff4d4d, #ff9500)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
              THE ASK
            </span>
          </div>
          <h2 style={styles.sectionTitle}>Raising $2M Seed to Answer One Question Decisively</h2>
          <p style={{ ...styles.sectionSubtitle, fontSize: '1.3rem' }}>
            Make them feel <span style={{ color: '#ff9500' }}>needed</span>
          </p>

          <div className="glass-card" style={{ padding: '50px', marginTop: '40px', background: 'linear-gradient(135deg, rgba(255,77,77,0.1), rgba(255,149,0,0.1))', border: '2px solid rgba(255,77,77,0.3)' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '30px', color: '#ff9500' }}>Use of Funds (18-24 months runway):</h3>

            <div style={{ display: 'grid', gap: '20px' }}>
              {[
                { item: 'Pilot Markets (6 campuses)', amount: '$700K', desc: 'Campus launches, local ops, driver/restaurant acquisition' },
                { item: 'Operations + Support Coverage', amount: '$450K', desc: 'Bangalore team (20-30 people), 24/7 support, QA' },
                { item: 'Product Iteration', amount: '$400K', desc: 'Mobile app polish, backend scaling, feature testing based on real behavior' },
                { item: 'Compliance Prep for Next Phase', amount: '$250K', desc: 'Legal opinions, TNC licensing prep, insurance, risk management' },
                { item: 'Working Capital & Contingency', amount: '$200K', desc: 'Buffer for pivots, unexpected costs, extended runway' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 3fr', gap: '20px', alignItems: 'center', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', borderLeft: '3px solid #ff9500' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{row.item}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ff9500', textAlign: 'center' }}>{row.amount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: '#888' }}>{row.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>
                Total: <span style={{ color: '#ff9500' }}>$2,000,000</span>
              </p>
              <p style={{ fontSize: '0.95rem', color: '#888', marginTop: '8px' }}>
                18-24 months runway | Team assembly: 20-30 days from funding
              </p>
            </div>
          </div>

          <div style={{ marginTop: '50px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', textAlign: 'center', color: '#00ff88' }}>What This Unlocks:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
              {[
                { icon: '🔬', title: 'Proof (or Disproof)', desc: 'Decisive answer to whether this model works' },
                { icon: '🎯', title: 'Clear Go/No-Go', desc: '90-day signal, not 3-year bet' },
                { icon: '🚀', title: 'Optionality', desc: 'Massive scale OR disciplined shutdown' },
              ].map((item, i) => (
                <div key={i} className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#00ff88' }}>{item.title}</h4>
                  <p style={{ fontSize: '0.95rem', color: '#888' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '60px', textAlign: 'center', padding: '50px', background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,136,255,0.2))', borderRadius: '20px', border: '2px solid rgba(0,255,136,0.4)' }}>
            <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: '20px', lineHeight: '1.4' }}>
              This is a bet on <span style={{ color: '#00ff88' }}>learning speed</span>,<br/>
              not fantasy scale.
            </p>
            <p style={{ fontSize: '1.2rem', color: '#888', marginTop: '25px' }}>
              If this works, it's huge. If it doesn't, we'll know early.<br/>
              <span style={{ color: '#0088ff', fontWeight: 600 }}>That's a good seed bet.</span>
            </p>
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <a href="mailto:invest@dollor.ai" style={{
              display: 'inline-block',
              padding: '18px 50px',
              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              color: '#000',
              fontSize: '1.2rem',
              fontWeight: 700,
              borderRadius: '30px',
              textDecoration: 'none',
              boxShadow: '0 10px 30px rgba(0,255,136,0.3)'
            }}>
              invest@dollor.ai
            </a>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '40px 0', textAlign: 'center', color: '#888', marginTop: '60px' }}>
        <div className="container">
          <p style={{ marginBottom: '15px', fontSize: '1.1rem', fontStyle: 'italic' }}>
            "We're not asking you to believe—we're asking you to discover with us."
          </p>
          <p style={{ marginBottom: '20px' }}>&copy; 2026 Dollor.ai - Confidential Seed Investor Deck</p>
          <div style={{ fontSize: '0.75rem', color: '#555', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            <p style={{ fontWeight: 600, marginBottom: '10px' }}>FORWARD-LOOKING STATEMENTS DISCLAIMER</p>
            <p>
              This presentation contains forward-looking statements about Dollor.ai's plans, strategies, and prospects. These statements are based on current expectations and assumptions, which may prove to be incorrect. Actual results and outcomes may differ materially. This is a hypothesis-driven seed investment—traction is pre-launch, market validation is ongoing, and significant risks exist. No guarantees of success are made or implied.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const cssStyles = `
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 60px 20px;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 25px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.3s ease;
  }

  .glass-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }
`;

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    minHeight: '100vh',
    color: '#fff',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  tokenGate: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tokenCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    padding: '50px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '400px',
    width: '90%'
  },
  tokenInput: {
    width: '100%',
    padding: '15px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.3)',
    color: 'white',
    fontSize: '1rem',
    marginBottom: '15px',
    outline: 'none'
  },
  tokenButton: {
    width: '100%',
    padding: '15px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  nav: {
    position: 'fixed' as const,
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 40px)',
    maxWidth: '1200px',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  ctaButton: {
    padding: '10px 28px',
    fontSize: '0.95rem',
    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
    color: '#000',
    borderRadius: '8px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block'
  },
  sectionTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.8rem)',
    fontWeight: 800,
    marginBottom: '15px',
    textAlign: 'center' as const,
    lineHeight: '1.3'
  },
  sectionSubtitle: {
    fontSize: '1.1rem',
    color: '#888',
    textAlign: 'center' as const,
    marginBottom: '40px',
    maxWidth: '800px',
    margin: '0 auto 40px'
  },
};
