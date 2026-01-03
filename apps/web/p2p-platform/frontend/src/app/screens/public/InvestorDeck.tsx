import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Token-based access control
const VALID_TOKENS = ['invest2025', 'seed500k', 'dollor-ai'];

export default function InvestorDeck() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && VALID_TOKENS.includes(token)) {
      setIsAuthorized(true);
    }
  }, [searchParams]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (VALID_TOKENS.includes(tokenInput.toLowerCase().trim())) {
      navigate(`/investors?token=${tokenInput.toLowerCase().trim()}`);
      setIsAuthorized(true);
    } else {
      setError('Invalid access token. Please contact invest@dollor.ai');
    }
  };

  // Token gate
  if (!isAuthorized) {
    return (
      <div style={styles.tokenGate}>
        <div style={styles.tokenCard}>
          <img src="/logo-dollar-ai.svg" alt="Dollor.ai" style={{ height: '48px', marginBottom: '20px' }} />
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Investor Deck</h2>
          <p style={{ color: '#888', marginBottom: '30px' }}>Enter your access token to view</p>
          <form onSubmit={handleTokenSubmit}>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter access token"
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
              AI-Powered P2P<br/>Delivery & Rideshare
            </h1>
            <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', color: '#888', maxWidth: '800px', margin: '0 auto 40px', lineHeight: '1.6' }}>
              <span style={{ color: '#00ff88', fontWeight: 600 }}>We own everything.</span> Backend built. AI agents owned. Zero software costs. <br/>
              <span style={{ color: 'white', fontWeight: 600 }}>$1-3 Flat Fee. Zero API Costs Forever. 91% Margins.</span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', marginTop: '50px' }}>
              {[
                { value: '$300B', label: 'Market Size' },
                { value: '98%', label: 'Cost Reduction' },
                { value: '$0', label: 'LLM API Costs' },
                { value: '75x', label: 'Investor Return' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>{stat.value}</div>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Traction - What's Already Built */}
        <section className="container">
          <h2 style={styles.sectionTitle}>100% Built. Zero Software Costs.</h2>
          <p style={styles.sectionSubtitle}>Not a concept. Not a pitch. <span style={{ color: '#00ff88' }}>Complete platform ready to onboard.</span> No additional software needed.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {[
              { icon: '📱', title: 'iOS Apps', items: ['Customer App', 'Driver App', 'Restaurant App'], status: 'App Store Ready' },
              { icon: '🤖', title: 'Android Apps', items: ['Customer App', 'Driver App', 'Restaurant App'], status: 'Play Store Ready' },
              { icon: '🌐', title: 'Web Platform', items: ['Customer Portal', 'Admin Dashboard', 'Analytics'], status: 'Production' },
              { icon: '⚙️', title: 'Backend', items: ['18 Microservices', 'FastAPI + Python', 'PostgreSQL + Redis'], status: '100% Complete' },
              { icon: '🧠', title: 'AI Agents (Owned)', items: ['Qwen 2.5 Fine-tuned', 'Ollama Self-hosted', 'Zero API Costs'], status: 'We Own It' },
              { icon: '☁️', title: 'Infrastructure', items: ['AWS EKS', 'Kubernetes', 'CI/CD Pipeline'], status: 'Live' },
            ].map((item) => (
              <div key={item.title} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ fontSize: '2rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.7rem', padding: '4px 10px', background: 'rgba(0,255,136,0.2)', borderRadius: '12px', color: '#00ff88' }}>{item.status}</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{item.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, color: '#888', fontSize: '0.9rem' }}>
                  {item.items.map((i) => <li key={i} style={{ marginBottom: '5px' }}>✓ {i}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '25px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,136,255,0.1))', borderRadius: '16px', border: '1px solid rgba(0,255,136,0.3)' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 600 }}>Lines of Code: </span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00ff88' }}>150,000+</span>
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
            <h3 style={{ color: '#ff4d4d', marginBottom: '20px', fontSize: '1.2rem', textAlign: 'center' }}>📰 Real Headlines. Real Problems.</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {[
                { outlet: 'New York Times', headline: '"DoorDash and Uber Eats Are Hungry for Your Kitchen"', quote: 'Restaurants report losing money on every delivery order due to 30% commission fees.', year: '2024' },
                { outlet: 'Wall Street Journal', headline: '"Uber Drivers Say They\'re Earning Less Than Minimum Wage"', quote: 'After expenses, many gig workers earn $4-6/hour. The platform takes 40%+ of fares.', year: '2024' },
                { outlet: 'Bloomberg', headline: '"DoorDash Has Never Been Profitable"', quote: 'Despite $8B revenue, DoorDash lost $1.4B. Their unit economics don\'t work.', year: '2024' },
                { outlet: 'Reuters', headline: '"FTC Investigates DoorDash, Uber for Monopolistic Practices"', quote: 'Regulators probe anti-competitive behavior and predatory pricing against restaurants.', year: '2024' },
                { outlet: 'Washington Post', headline: '"Small Restaurants Say Delivery Apps Are Killing Them"', quote: '62% of restaurant owners say delivery app fees are unsustainable.', year: '2024' },
                { outlet: 'CNBC', headline: '"Uber, Lyft Drivers Strike Over Pay Cuts"', quote: 'Thousands of drivers protest as platforms reduce per-mile rates by 25%.', year: '2024' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: '3px solid #ff4d4d' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#ff4d4d', fontWeight: 600, fontSize: '0.85rem' }}>{item.outlet}</span>
                    <span style={{ color: '#666', fontSize: '0.75rem' }}>{item.year}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px', fontStyle: 'italic' }}>{item.headline}</div>
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>{item.quote}</div>
                </div>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ ...styles.tableHeader, textAlign: 'left' }}>Metric</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>DoorDash</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Uber Eats</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Grubhub</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Instacart</th>
                    <th style={{ ...styles.tableHeader, color: '#00ff88', fontSize: '1.1rem' }}>Dollor.ai</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Restaurant Fee', dd: '25-30%', ue: '15-30%', gh: '20-30%', ic: '15-25%', us: '$1 FLAT', usColor: '#00ff88' },
                    { metric: 'Driver Take Rate', dd: '60-70%', ue: '55-65%', gh: '60-70%', ic: '70-80%', us: '100%', usColor: '#00ff88' },
                    { metric: 'Customer Delivery Fee', dd: '$3-8', ue: '$3-10', gh: '$2-7', ic: '$4-10', us: '$1 FLAT', usColor: '#00ff88' },
                    { metric: 'Hidden Fees', dd: 'Yes (Service, Small Order)', ue: 'Yes (Service, Busy)', gh: 'Yes (Service)', ic: 'Yes (Service, Tip)', us: 'NONE', usColor: '#00ff88' },
                    { metric: 'Profitable?', dd: 'NO (-$1.4B)', ue: 'NO (-$2.1B)', gh: 'NO (-$400M)', ic: 'Barely', us: 'YES (Month 8)', usColor: '#00ff88' },
                    { metric: 'Driver Satisfaction', dd: '2.1/5 ⭐', ue: '1.9/5 ⭐', gh: '2.3/5 ⭐', ic: '2.8/5 ⭐', us: 'N/A (New)', usColor: '#888' },
                    { metric: 'FTC Investigation', dd: 'YES', ue: 'YES', gh: 'YES', ic: 'No', us: 'NO', usColor: '#00ff88' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ ...styles.tableCell, fontWeight: 600 }}>{row.metric}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.dd}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.ue}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.gh}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.85rem' }}>{row.ic}</td>
                      <td style={{ ...styles.tableCell, color: row.usColor, fontWeight: 700 }}>{row.us}</td>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ ...styles.tableHeader, textAlign: 'left' }}>Metric</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Uber</th>
                    <th style={{ ...styles.tableHeader, color: '#ff4d4d' }}>Lyft</th>
                    <th style={{ ...styles.tableHeader, color: '#00ff88', fontSize: '1.1rem' }}>Dollor.ai</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric: 'Platform Take Rate', uber: '25-40%', lyft: '20-35%', us: '$1-3 FLAT' },
                    { metric: 'Driver Earnings', uber: '60-75% of fare', lyft: '65-80% of fare', us: '97-99% of fare' },
                    { metric: 'Surge Pricing', uber: '2x-5x multiplier', lyft: '2x-4x multiplier', us: 'Driver sets price' },
                    { metric: 'Driver Flexibility', uber: 'Algorithm assigns rides', lyft: 'Algorithm assigns rides', us: 'Drivers choose rides' },
                    { metric: 'Booking Fees', uber: '$2-5 per ride', lyft: '$2-4 per ride', us: 'NONE' },
                    { metric: 'Annual Losses', uber: '-$9.1B (2022)', lyft: '-$1.6B (2022)', us: 'Profitable Month 8' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ ...styles.tableCell, fontWeight: 600 }}>{row.metric}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.9rem' }}>{row.uber}</td>
                      <td style={{ ...styles.tableCell, color: '#ff4d4d', fontSize: '0.9rem' }}>{row.lyft}</td>
                      <td style={{ ...styles.tableCell, color: '#00ff88', fontWeight: 700 }}>{row.us}</td>
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
                <div style={styles.feeRow}><span>Customer Fee</span><span style={{ color: '#00ff88', fontWeight: 700 }}>$1.00</span></div>
                <div style={styles.feeRow}><span>Restaurant Fee</span><span style={{ color: '#00ff88', fontWeight: 700 }}>$1.00</span></div>
                <div style={{ ...styles.feeRow, background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88' }}>
                  <span style={{ fontWeight: 600 }}>Revenue/Order</span>
                  <span style={{ color: '#00ff88', fontWeight: 700, fontSize: '1.2rem' }}>$2.00</span>
                </div>
              </div>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Drivers keep 100% of delivery fee + tips</p>
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
                    { label: 'Base Model', value: 'Qwen 2.5 (72B)', desc: 'State-of-the-art open source' },
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

        {/* 7. 18 Microservices with Training Coverage */}
        <section className="container">
          <h2 style={styles.sectionTitle}>18 Production Microservices</h2>
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
          <p style={styles.sectionSubtitle}>18+ months runway. Quality engineers + Fresh grad AI monitors. <span style={{ color: '#00ff88' }}>Zero software costs - it's all built.</span></p>

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
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0088ff' }}>Month 8</div>
            </div>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>$2M ÷ $85K/mo = <span style={{ color: '#00ff88', fontWeight: 600 }}>23+ months runway</span> → Break-even at Month 8 → Profitable and self-sustaining</p>
        </section>

        {/* 10. Competitive Moats */}
        <section className="container">
          <h2 style={styles.sectionTitle}>5 Unbreakable Moats</h2>
          <p style={styles.sectionSubtitle}>Why competitors can't copy us - even with infinite money.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {[
              { icon: '🧠', title: 'AI Fully Owned', desc: 'Qwen + Ollama = zero API costs forever. No OpenAI dependency. No per-request pricing. We own it completely.', color: '#9b59b6' },
              { icon: '🔧', title: 'Backend 100% Built', desc: 'No software to buy. No licenses. No SaaS fees. 150K+ lines of production code ready to scale.', color: '#00ff88' },
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
                  Customers pay <span style={{ color: '#0088ff', fontWeight: 600 }}>$1 flat</span> vs $5-8 fees → They share on social →
                  <span style={{ color: 'white' }}> "Why am I still paying $7 delivery fees?"</span> → Friends download app
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
                  { metric: 'Gross Margin', them: '11%', us: '52%' },
                  { metric: 'Profitable?', them: 'NO (-$1.4B/yr)', us: 'YES (Month 8)', noBorder: true },
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
                <h4 style={{ color: '#ff4d4d', marginBottom: '15px' }}>Cost Per Order (at 10K/day)</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>Payment Processing (2.9%)</span><span style={{ color: '#ff4d4d' }}>$0.87</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>AWS Infrastructure</span><span style={{ color: '#ff4d4d' }}>$0.02</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,77,77,0.1)', borderRadius: '8px' }}>
                    <span>AI/Support (Bangalore)</span><span style={{ color: '#ff4d4d' }}>$0.08</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,77,77,0.2)', borderRadius: '8px', border: '1px solid #ff4d4d' }}>
                    <span style={{ fontWeight: 600 }}>Total Cost/Order</span><span style={{ color: '#ff4d4d', fontWeight: 700, fontSize: '1.2rem' }}>$0.97</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '25px', textAlign: 'center', padding: '20px', background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,136,255,0.15))', borderRadius: '12px', border: '1px solid #00ff88' }}>
              <span style={{ fontSize: '1.2rem' }}>Contribution Margin Per Order: </span>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#00ff88' }}>$1.03</span>
              <span style={{ color: '#888', marginLeft: '10px' }}>(51.5% margin)</span>
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
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ff9500' }}>4 Days</div>
              <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '10px' }}>
                $4 CAC ÷ $1.03 margin/order<br/>
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
                  { risk: 'Can\'t get enough drivers', impact: 'Long wait times, bad experience', mitigation: '100% driver earnings is compelling. Campus-first = students need flexible income. $100 referral bonuses.' },
                  { risk: 'Restaurants won\'t switch', impact: 'No supply = no customers', mitigation: 'Free onboarding, no lock-in. Start with frustrated restaurants already vocal about DoorDash.' },
                  { risk: 'Tech doesn\'t scale', impact: 'Service outages at growth', mitigation: 'AWS auto-scaling, 18 microservices, Kubernetes. Built to handle 500K orders/day from day 1.' },
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
                  { category: 'Driver Take Rate', uber: '25-35% of fare', dollor: '10-15% of fare', advantage: 'Drivers earn more' },
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

        {/* 15. 5-Year Financial Projections */}
        <section className="container">
          <h2 style={styles.sectionTitle}>5-Year Financial Projections</h2>
          <p style={styles.sectionSubtitle}>From seed to $200M+ revenue. 91% margins at scale.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { year: 'Year 1', profit: '-$135K', margin: 'Investment Phase', negative: true },
              { year: 'Year 2', profit: '$2.36M', margin: '66% Margin' },
              { year: 'Year 3', profit: '$14.3M', margin: '80% Margin' },
              { year: 'Year 4', profit: '$60.8M', margin: '88% Margin' },
              { year: 'Year 5', profit: '$187M', margin: '91% Margin', highlight: true },
            ].map((row) => (
              <div key={row.year} style={styles.yearCard}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>{row.year}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: row.negative ? '#ff4d4d' : row.highlight ? '#00ff88' : 'white' }}>{row.profit}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '5px', color: '#888' }}>{row.margin}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>$500M+</div>
              <div style={{ color: '#888' }}>Exit Potential</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>150x</div>
              <div style={{ color: '#888' }}>Investor Return</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00ff88' }}>Month 8</div>
              <div style={{ color: '#888' }}>Break-even</div>
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
                { value: 'Month 8', label: 'Break-even' },
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

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="mailto:invest@dollor.ai" style={{ ...styles.ctaButton, padding: '15px 40px', fontSize: '1.1rem', textDecoration: 'none' }}>invest@dollor.ai</a>
              <a href="https://api.dollor.ai" target="_blank" rel="noopener noreferrer" style={{ ...styles.ctaButton, padding: '15px 40px', fontSize: '1.1rem', textDecoration: 'none', background: 'transparent', border: '2px solid #00ff88', color: '#00ff88' }}>View Live API</a>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '40px 0', textAlign: 'center', color: '#888' }}>
        <div className="container">
          <p style={{ marginBottom: '15px', fontSize: '1.1rem' }}>"We own our AI. We own our margins. We own the future."</p>
          <p>&copy; 2025 Dollor.ai - Confidential Investor Deck</p>
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
  @media (max-width: 768px) { .grid-3 { grid-template-columns: 1fr; } }
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
  tableHeader: { padding: '20px', color: '#888' },
  tableCell: { padding: '20px' },
  teamList: { listStyle: 'none', padding: 0, color: '#888', display: 'grid', gap: '8px' },
  costBadge: { marginTop: '15px', padding: '10px', borderRadius: '8px', textAlign: 'center' as const },
  scaleRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' },
  infraList: { listStyle: 'none', padding: 0, display: 'grid', gap: '10px', color: '#888' },
  yearCard: { background: '#1a1a2e', padding: '25px' },
};
