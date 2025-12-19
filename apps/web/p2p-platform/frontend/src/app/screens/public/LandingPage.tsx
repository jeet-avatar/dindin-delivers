import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Row, Col, Drawer } from 'antd';
import {
  ShopOutlined,
  CarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  WalletOutlined,
  StarFilled,
  ArrowRightOutlined,
  MenuOutlined,
  CloseOutlined,
  UserOutlined
} from '@ant-design/icons';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="main-nav">
        <div className="nav-container">
          <div className="logo">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.ai</span>
          </div>
          <div className="nav-links">
            <Link to="/restaurant/apply">For Restaurants</Link>
            <Link to="/driver/apply">For Drivers</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div className="nav-actions">
            <Button type="primary" className="customer-btn" onClick={() => navigate('/customer/login')}>
              <UserOutlined /> Book a Ride
            </Button>
            <Button ghost onClick={() => navigate('/vendor/login')}>Restaurant</Button>
            <Button ghost onClick={() => navigate('/driver/login')}>Driver</Button>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <MenuOutlined />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <Drawer
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        className="mobile-drawer"
        closeIcon={<CloseOutlined style={{ color: 'white', fontSize: 20 }} />}
        styles={{
          header: { background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.1)' },
          body: { background: '#1a1a2e', padding: 0 }
        }}
      >
        <div className="mobile-menu">
          <div className="mobile-menu-links">
            <Link to="/restaurant/apply" onClick={() => setMobileMenuOpen(false)}>
              <ShopOutlined /> For Restaurants
            </Link>
            <Link to="/driver/apply" onClick={() => setMobileMenuOpen(false)}>
              <CarOutlined /> For Drivers
            </Link>
            <Link to="/terms" onClick={() => setMobileMenuOpen(false)}>Terms</Link>
            <Link to="/privacy" onClick={() => setMobileMenuOpen(false)}>Privacy</Link>
          </div>
          <div className="mobile-menu-actions">
            <Button block size="large" type="primary" className="mobile-btn-customer" onClick={() => { navigate('/customer/login'); setMobileMenuOpen(false); }}>
              <UserOutlined /> Book a Ride
            </Button>
            <Button block size="large" className="mobile-btn" onClick={() => { navigate('/vendor/login'); setMobileMenuOpen(false); }}>
              Restaurant Login
            </Button>
            <Button block size="large" className="mobile-btn" onClick={() => { navigate('/driver/login'); setMobileMenuOpen(false); }}>
              Driver Login
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <ThunderboltOutlined /> AI-Powered Delivery & Rideshare Platform
          </div>
          <h1 className="hero-title">
            Rides & Delivery
            <span className="highlight"> Just $1 Fee</span>
          </h1>
          <p className="hero-subtitle">
            The world's first $1 matchmaking platform. Book rides, order food,
            or become a partner. Transparent pricing, no hidden fees.
          </p>
          <div className="hero-cta">
            <Button
              type="primary"
              size="large"
              className="cta-customer"
              onClick={() => navigate('/customer/login')}
            >
              <UserOutlined /> Book a Ride <ArrowRightOutlined />
            </Button>
            <Button
              size="large"
              className="cta-secondary"
              onClick={() => navigate('/ride')}
            >
              Quick Estimate
            </Button>
          </div>
          <div className="hero-partner-links">
            <span>Are you a business?</span>
            <Button type="link" onClick={() => navigate('/restaurant/apply')}>Partner Restaurant</Button>
            <Button type="link" onClick={() => navigate('/driver/apply')}>Become a Driver</Button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">5,000+</span>
              <span className="stat-label">Restaurant Partners</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">10,000+</span>
              <span className="stat-label">Active Drivers</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-value">$50M+</span>
              <span className="stat-label">Partner Revenue</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <div className="section-header">
            <h2>Why Choose Dollor.ai?</h2>
            <p>Built for growth. Designed for success.</p>
          </div>
          <Row gutter={[32, 32]}>
            <Col xs={24} sm={12} lg={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <DollarOutlined />
                </div>
                <h3>Zero Commission*</h3>
                <p>Keep more of what you earn with our transparent pricing model</p>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <ThunderboltOutlined />
                </div>
                <h3>AI Menu Import</h3>
                <p>Import your entire menu from your website in seconds with AI</p>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <WalletOutlined />
                </div>
                <h3>Instant Payouts</h3>
                <p>Get paid daily with instant cash-out to your bank account</p>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="feature-card">
                <div className="feature-icon">
                  <LineChartOutlined />
                </div>
                <h3>Smart Analytics</h3>
                <p>AI-powered insights to optimize your menu and maximize revenue</p>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Restaurant Section */}
      <section className="partner-section restaurant-section">
        <div className="partner-container">
          <Row gutter={[64, 48]} align="middle">
            <Col xs={24} lg={12}>
              <div className="partner-content">
                <div className="partner-badge">
                  <ShopOutlined /> For Restaurants
                </div>
                <h2>Grow Your Restaurant Business</h2>
                <p className="partner-desc">
                  Join thousands of restaurants using Dollor.ai to expand their reach,
                  increase orders, and maximize revenue without the hefty commission fees.
                </p>
                <ul className="partner-benefits">
                  <li><CheckCircleOutlined /> One-click AI menu import from your website</li>
                  <li><CheckCircleOutlined /> Real-time order management dashboard</li>
                  <li><CheckCircleOutlined /> Dedicated partner success manager</li>
                  <li><CheckCircleOutlined /> Marketing tools to boost visibility</li>
                  <li><CheckCircleOutlined /> Weekly payouts directly to your bank</li>
                </ul>
                <Button
                  type="primary"
                  size="large"
                  className="partner-cta restaurant-cta"
                  onClick={() => navigate('/restaurant/apply')}
                >
                  Apply as Restaurant Partner <ArrowRightOutlined />
                </Button>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="partner-visual restaurant-visual">
                <div className="visual-card">
                  <ShopOutlined className="visual-icon" />
                  <div className="visual-stats">
                    <div className="visual-stat">
                      <span className="value">+45%</span>
                      <span className="label">Avg. Revenue Increase</span>
                    </div>
                    <div className="visual-stat">
                      <span className="value">24hrs</span>
                      <span className="label">Go Live Time</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Driver Section */}
      <section className="partner-section driver-section">
        <div className="partner-container">
          <Row gutter={[64, 48]} align="middle">
            <Col xs={24} lg={12} className="driver-visual-col">
              <div className="partner-visual driver-visual">
                <div className="visual-card">
                  <CarOutlined className="visual-icon" />
                  <div className="visual-stats">
                    <div className="visual-stat">
                      <span className="value">$25/hr</span>
                      <span className="label">Avg. Earnings</span>
                    </div>
                    <div className="visual-stat">
                      <span className="value">100%</span>
                      <span className="label">Tips Kept</span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="partner-content">
                <div className="partner-badge driver-badge">
                  <CarOutlined /> For Drivers
                </div>
                <h2>Drive Your Own Success</h2>
                <p className="partner-desc">
                  Be your own boss. Set your own schedule. Earn competitive pay with
                  instant payouts and keep 100% of your tips.
                </p>
                <ul className="partner-benefits">
                  <li><CheckCircleOutlined /> Flexible hours - work when you want</li>
                  <li><CheckCircleOutlined /> Keep 100% of your tips</li>
                  <li><CheckCircleOutlined /> Daily instant payouts available</li>
                  <li><CheckCircleOutlined /> AI-optimized routes for more deliveries</li>
                  <li><CheckCircleOutlined /> Insurance coverage while delivering</li>
                </ul>
                <Button
                  type="primary"
                  size="large"
                  className="partner-cta driver-cta"
                  onClick={() => navigate('/driver/apply')}
                >
                  Apply as Delivery Partner <ArrowRightOutlined />
                </Button>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="how-container">
          <div className="section-header light">
            <h2>Get Started in Minutes</h2>
            <p>Simple onboarding. Quick approval. Fast results.</p>
          </div>
          <Row gutter={[48, 48]}>
            <Col xs={24} md={8}>
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Apply Online</h3>
                <p>Fill out our simple application form with your basic information</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Quick Verification</h3>
                <p>We verify your details and set up your account within 24-48 hours</p>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Start Earning</h3>
                <p>Go live and start receiving orders or accepting deliveries</p>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="testimonials-container">
          <div className="section-header">
            <h2>Trusted by Thousands</h2>
            <p>See what our partners say about Dollor.ai</p>
          </div>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <div className="testimonial-card">
                <div className="stars">
                  <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                </div>
                <p>"Since joining Dollor.ai, our delivery orders have increased by 60%. The AI menu import saved us hours of work!"</p>
                <div className="testimonial-author">
                  <strong>Maria's Kitchen</strong>
                  <span>Restaurant Partner</span>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="testimonial-card">
                <div className="stars">
                  <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                </div>
                <p>"I love the flexibility. I work when I want and the instant payouts mean I never have to wait for my money."</p>
                <div className="testimonial-author">
                  <strong>James T.</strong>
                  <span>Delivery Partner</span>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="testimonial-card">
                <div className="stars">
                  <StarFilled /><StarFilled /><StarFilled /><StarFilled /><StarFilled />
                </div>
                <p>"The analytics dashboard helps us understand our customers better. We've optimized our menu and increased profits."</p>
                <div className="testimonial-author">
                  <strong>Golden Dragon</strong>
                  <span>Restaurant Partner</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta">
        <div className="cta-container">
          <h2>Ready to Transform Your Business?</h2>
          <p>Join the Dollor.ai network today and start growing</p>
          <div className="cta-buttons">
            <Button
              type="primary"
              size="large"
              className="cta-btn-light"
              onClick={() => navigate('/restaurant/apply')}
            >
              <ShopOutlined /> Partner Your Restaurant
            </Button>
            <Button
              size="large"
              className="cta-btn-outline"
              onClick={() => navigate('/driver/apply')}
            >
              <CarOutlined /> Become a Driver
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo">
                <DollarOutlined className="logo-icon" />
                <span className="logo-text">Dollor.ai</span>
              </div>
              <p>Empowering local businesses with AI-powered delivery solutions.</p>
            </div>
            <div className="footer-links-group">
              <h4>Partners</h4>
              <Link to="/restaurant/apply">Restaurant Application</Link>
              <Link to="/driver/apply">Driver Application</Link>
              <Link to="/vendor/login">Restaurant Login</Link>
              <Link to="/driver/login">Driver Login</Link>
            </div>
            <div className="footer-links-group">
              <h4>Company</h4>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <a href="mailto:support@dollor.ai">Contact Us</a>
            </div>
            <div className="footer-links-group">
              <h4>Support</h4>
              <a href="mailto:partners@dollor.ai">Partner Support</a>
              <a href="mailto:drivers@dollor.ai">Driver Support</a>
              <a href="mailto:help@dollor.ai">General Help</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Dollor.ai. All rights reserved. Empowering Local Businesses.</p>
          </div>
        </div>
      </footer>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-page {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

        /* Navigation */
        .main-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(26, 26, 46, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          font-size: 28px;
          color: #ffd700;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .nav-links {
          display: flex;
          gap: 32px;
        }

        .nav-links a {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
        }

        .nav-links a:hover {
          color: #ffd700;
        }

        .nav-actions {
          display: flex;
          gap: 12px;
        }

        .nav-actions .ant-btn-background-ghost {
          border-color: rgba(255,255,255,0.3);
          color: white;
        }

        .nav-actions .ant-btn-background-ghost:hover {
          border-color: #ffd700;
          color: #ffd700;
        }

        .customer-btn {
          background: linear-gradient(135deg, #06C167 0%, #4ADE80 100%) !important;
          border: none !important;
          color: white !important;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .customer-btn:hover {
          background: linear-gradient(135deg, #4ADE80 0%, #06C167 100%) !important;
          box-shadow: 0 4px 12px rgba(6,193,103,0.4);
        }

        /* Hero Section */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 120px 48px 80px;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 80%, rgba(255,215,0,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(76,201,240,0.1) 0%, transparent 50%);
        }

        .hero-content {
          position: relative;
          text-align: center;
          max-width: 900px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,215,0,0.15);
          color: #ffd700;
          padding: 10px 24px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 32px;
          border: 1px solid rgba(255,215,0,0.3);
        }

        .hero-title {
          font-size: 64px;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          margin-bottom: 24px;
        }

        .hero-title .highlight {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 20px;
          color: rgba(255,255,255,0.8);
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-cta {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-bottom: 64px;
        }

        .cta-customer {
          height: 56px;
          padding: 0 40px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #06C167 0%, #4ADE80 100%) !important;
          border: none !important;
          color: white !important;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .cta-customer:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(6,193,103,0.4);
        }

        .cta-primary {
          height: 56px;
          padding: 0 40px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #ffd700 0%, #f0c000 100%) !important;
          border: none !important;
          color: #1a1a2e !important;
          border-radius: 12px;
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255,215,0,0.4);
        }

        .hero-partner-links {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .hero-partner-links span {
          color: rgba(255,255,255,0.6);
          font-size: 14px;
        }

        .hero-partner-links .ant-btn-link {
          color: #ffd700 !important;
          font-weight: 500;
          padding: 0 8px;
        }

        .hero-partner-links .ant-btn-link:hover {
          color: #ffed4a !important;
        }

        .cta-secondary {
          height: 56px;
          padding: 0 40px;
          font-size: 16px;
          font-weight: 600;
          background: transparent;
          border: 2px solid rgba(255,255,255,0.3) !important;
          color: white !important;
          border-radius: 12px;
        }

        .cta-secondary:hover {
          border-color: #ffd700 !important;
          color: #ffd700 !important;
        }

        .hero-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 36px;
          font-weight: 800;
          color: #ffd700;
        }

        .stat-label {
          font-size: 14px;
          color: rgba(255,255,255,0.6);
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,0.2);
        }

        /* Features Section */
        .features {
          padding: 100px 48px;
          background: #f8fafc;
        }

        .features-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 64px;
        }

        .section-header h2 {
          font-size: 40px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        .section-header p {
          font-size: 18px;
          color: #64748b;
        }

        .section-header.light h2 {
          color: white;
        }

        .section-header.light p {
          color: rgba(255,255,255,0.7);
        }

        .feature-card {
          background: white;
          padding: 40px 32px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          transition: all 0.3s;
          height: 100%;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
        }

        .feature-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .feature-icon .anticon {
          font-size: 32px;
          color: #1a1a2e;
        }

        .feature-card h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 12px;
        }

        .feature-card p {
          color: #64748b;
          line-height: 1.6;
        }

        /* Partner Sections */
        .partner-section {
          padding: 100px 48px;
        }

        .restaurant-section {
          background: white;
        }

        .driver-section {
          background: #f8fafc;
        }

        .partner-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .partner-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          color: #1a1a2e;
          padding: 8px 20px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .driver-badge {
          background: linear-gradient(135deg, #4cc9f0 0%, #7209b7 100%);
          color: white;
        }

        .partner-content h2 {
          font-size: 40px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 20px;
        }

        .partner-desc {
          font-size: 18px;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .partner-benefits {
          list-style: none;
          padding: 0;
          margin-bottom: 40px;
        }

        .partner-benefits li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 16px;
          color: #334155;
          margin-bottom: 16px;
        }

        .partner-benefits .anticon {
          color: #10b981;
          font-size: 18px;
        }

        .partner-cta {
          height: 56px;
          padding: 0 40px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          border: none;
        }

        .restaurant-cta {
          background: linear-gradient(135deg, #ffd700 0%, #f0c000 100%) !important;
          color: #1a1a2e !important;
        }

        .driver-cta {
          background: linear-gradient(135deg, #4cc9f0 0%, #3a86ff 100%) !important;
          color: white !important;
        }

        .partner-visual {
          display: flex;
          justify-content: center;
        }

        .visual-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 24px;
          padding: 48px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }

        .visual-icon {
          font-size: 80px;
          color: #ffd700;
          margin-bottom: 32px;
        }

        .visual-stats {
          display: flex;
          gap: 40px;
        }

        .visual-stat .value {
          display: block;
          font-size: 32px;
          font-weight: 800;
          color: #ffd700;
        }

        .visual-stat .label {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
        }

        /* How It Works */
        .how-it-works {
          padding: 100px 48px;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
        }

        .how-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .step-card {
          text-align: center;
          padding: 40px 24px;
        }

        .step-number {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 800;
          color: #1a1a2e;
          margin: 0 auto 24px;
        }

        .step-card h3 {
          font-size: 22px;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
        }

        .step-card p {
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
        }

        /* Testimonials */
        .testimonials {
          padding: 100px 48px;
          background: white;
        }

        .testimonials-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .testimonial-card {
          background: #f8fafc;
          padding: 40px;
          border-radius: 20px;
          height: 100%;
        }

        .stars {
          margin-bottom: 20px;
        }

        .stars .anticon {
          color: #ffd700;
          font-size: 18px;
          margin-right: 4px;
        }

        .testimonial-card p {
          font-size: 16px;
          color: #475569;
          line-height: 1.7;
          margin-bottom: 24px;
          font-style: italic;
        }

        .testimonial-author strong {
          display: block;
          color: #1a1a2e;
          font-size: 16px;
        }

        .testimonial-author span {
          color: #64748b;
          font-size: 14px;
        }

        /* Final CTA */
        .final-cta {
          padding: 100px 48px;
          background: linear-gradient(135deg, #ffd700 0%, #f0c000 100%);
          text-align: center;
        }

        .cta-container {
          max-width: 700px;
          margin: 0 auto;
        }

        .final-cta h2 {
          font-size: 40px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        .final-cta p {
          font-size: 18px;
          color: rgba(26,26,46,0.7);
          margin-bottom: 40px;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .cta-btn-light {
          height: 56px;
          padding: 0 40px;
          font-size: 16px;
          font-weight: 600;
          background: #1a1a2e !important;
          border: none !important;
          color: white !important;
          border-radius: 12px;
        }

        .cta-btn-outline {
          height: 56px;
          padding: 0 40px;
          font-size: 16px;
          font-weight: 600;
          background: transparent !important;
          border: 2px solid #1a1a2e !important;
          color: #1a1a2e !important;
          border-radius: 12px;
        }

        /* Footer */
        .main-footer {
          background: #1a1a2e;
          padding: 80px 48px 40px;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .footer-top {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 48px;
        }

        .footer-brand p {
          color: rgba(255,255,255,0.6);
          margin-top: 16px;
          line-height: 1.6;
        }

        .footer-links-group h4 {
          color: white;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .footer-links-group a {
          display: block;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.3s;
        }

        .footer-links-group a:hover {
          color: #ffd700;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 32px;
          text-align: center;
        }

        .footer-bottom p {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
          font-size: 20px;
          cursor: pointer;
        }

        .mobile-menu-btn:hover {
          border-color: #ffd700;
          color: #ffd700;
        }

        /* Mobile Menu Drawer */
        .mobile-menu {
          padding: 24px;
        }

        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 32px;
        }

        .mobile-menu-links a {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.3s;
        }

        .mobile-menu-links a:hover {
          background: rgba(255,215,0,0.1);
          color: #ffd700;
        }

        .mobile-menu-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-btn {
          background: transparent !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
          color: white !important;
          height: 48px;
          border-radius: 12px;
        }

        .mobile-btn:hover {
          border-color: #ffd700 !important;
          color: #ffd700 !important;
        }

        .mobile-btn-primary {
          background: #ffd700 !important;
          border: none !important;
          color: #1a1a2e !important;
          height: 48px;
          border-radius: 12px;
          font-weight: 600;
        }

        .mobile-btn-customer {
          background: linear-gradient(135deg, #06C167 0%, #4ADE80 100%) !important;
          border: none !important;
          color: white !important;
          height: 48px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* Responsive - Tablet */
        @media (max-width: 1024px) {
          .nav-links {
            display: none;
          }

          .mobile-menu-btn {
            display: flex;
          }

          .hero-title {
            font-size: 48px;
          }

          .footer-top {
            grid-template-columns: 1fr 1fr;
          }

          .visual-stats {
            flex-direction: column;
            gap: 20px;
          }
        }

        /* Responsive - Mobile */
        @media (max-width: 768px) {
          .nav-container {
            padding: 12px 16px;
          }

          .logo-icon {
            font-size: 24px;
          }

          .logo-text {
            font-size: 20px;
          }

          .nav-actions {
            display: none;
          }

          .hero {
            padding: 80px 16px 48px;
            min-height: auto;
          }

          .hero-badge {
            font-size: 12px;
            padding: 8px 16px;
            margin-bottom: 20px;
          }

          .hero-title {
            font-size: 28px;
            margin-bottom: 16px;
          }

          .hero-subtitle {
            font-size: 15px;
            margin-bottom: 28px;
          }

          .hero-cta {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 40px;
          }

          .cta-primary, .cta-secondary {
            width: 100%;
            height: 52px;
            padding: 0 24px;
          }

          .hero-stats {
            flex-direction: column;
            gap: 20px;
          }

          .stat-value {
            font-size: 28px;
          }

          .stat-label {
            font-size: 13px;
          }

          .stat-divider {
            display: none;
          }

          .features, .partner-section, .testimonials {
            padding: 48px 16px;
          }

          .how-it-works, .final-cta {
            padding: 48px 16px;
          }

          .section-header {
            margin-bottom: 40px;
          }

          .section-header h2 {
            font-size: 24px;
          }

          .section-header p {
            font-size: 15px;
          }

          .feature-card {
            padding: 28px 20px;
          }

          .feature-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
          }

          .feature-icon .anticon {
            font-size: 24px;
          }

          .feature-card h3 {
            font-size: 18px;
          }

          .partner-badge {
            font-size: 13px;
            padding: 6px 16px;
          }

          .partner-content h2 {
            font-size: 24px;
          }

          .partner-desc {
            font-size: 15px;
          }

          .partner-benefits li {
            font-size: 14px;
          }

          .partner-cta {
            width: 100%;
            height: 52px;
          }

          .visual-card {
            padding: 32px 24px;
          }

          .visual-icon {
            font-size: 56px;
            margin-bottom: 24px;
          }

          .visual-stats {
            flex-direction: row;
            gap: 24px;
          }

          .visual-stat .value {
            font-size: 24px;
          }

          .visual-stat .label {
            font-size: 12px;
          }

          .step-card {
            padding: 24px 16px;
          }

          .step-number {
            width: 52px;
            height: 52px;
            font-size: 22px;
          }

          .step-card h3 {
            font-size: 18px;
          }

          .testimonial-card {
            padding: 28px 20px;
          }

          .testimonial-card p {
            font-size: 15px;
          }

          .final-cta h2 {
            font-size: 24px;
          }

          .final-cta p {
            font-size: 15px;
          }

          .cta-buttons {
            flex-direction: column;
            gap: 12px;
          }

          .cta-btn-light, .cta-btn-outline {
            width: 100%;
            height: 52px;
          }

          .main-footer {
            padding: 48px 16px 32px;
          }

          .footer-top {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .footer-brand p {
            font-size: 14px;
          }

          .footer-links-group h4 {
            font-size: 15px;
            margin-bottom: 16px;
          }

          .footer-links-group a {
            font-size: 14px;
            margin-bottom: 10px;
          }

          .driver-visual-col {
            order: 2;
          }
        }

        /* Responsive - Small Mobile */
        @media (max-width: 375px) {
          .hero-title {
            font-size: 24px;
          }

          .hero-subtitle {
            font-size: 14px;
          }

          .section-header h2, .partner-content h2, .final-cta h2 {
            font-size: 22px;
          }

          .stat-value {
            font-size: 24px;
          }

          .visual-stats {
            flex-direction: column;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
