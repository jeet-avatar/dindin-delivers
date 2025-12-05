import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Row, Col, Steps, Space } from 'antd';
import {
  ShopOutlined,
  CarOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  MobileOutlined,
  SafetyOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Logo } from '../../components/brand/Logo';
import brand from '../../config/brand';

const { Title, Text, Paragraph } = Typography;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <Logo variant="full" size="md" theme="dark" />
        <Space>
          <Button type="default" ghost onClick={() => navigate('/vendor/login')}>
            Restaurant Login
          </Button>
          <Button type="default" ghost onClick={() => navigate('/driver/login')}>
            Driver Login
          </Button>
          <Button
            type="primary"
            onClick={() => navigate('/login')}
            style={{ background: brand.colors.primary, borderColor: brand.colors.primary }}
          >
            Business Portal
          </Button>
        </Space>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <Logo variant="icon" size="xl" />
        <Title className="hero-title">
          Partner with {brand.name}
        </Title>
        <Paragraph className="hero-subtitle">
          {brand.tagline}. {brand.description}.
        </Paragraph>
        <div className="hero-features">
          <div className="hero-feature">
            <ThunderboltOutlined />
            <span>AI-Powered Menu Import</span>
          </div>
          <div className="hero-feature">
            <DollarOutlined />
            <span>Instant Payouts</span>
          </div>
          <div className="hero-feature">
            <RocketOutlined />
            <span>Go Live in Minutes</span>
          </div>
        </div>
      </section>

      {/* Partner Cards */}
      <section className="partner-section">
        <Row gutter={[32, 32]}>
          {/* Restaurant Partner Card */}
          <Col xs={24} md={12}>
            <Card hoverable className="partner-card">
              <div className="partner-content">
                <div className="partner-icon restaurant-icon">
                  <ShopOutlined />
                </div>
                <Title level={2}>Restaurant Partners</Title>
                <Paragraph className="partner-description">
                  Expand your reach and increase revenue by joining our delivery network
                </Paragraph>

                {/* Benefits */}
                <div className="benefits-list">
                  <div className="benefit-item">
                    <CheckCircleOutlined className="benefit-icon" />
                    <Text>One-click AI menu import from your website</Text>
                  </div>
                  <div className="benefit-item">
                    <DollarOutlined className="benefit-icon" />
                    <Text>Only {brand.commission.restaurantPercent}% commission rate</Text>
                  </div>
                  <div className="benefit-item">
                    <MobileOutlined className="benefit-icon" />
                    <Text>Real-time order management dashboard</Text>
                  </div>
                  <div className="benefit-item">
                    <ClockCircleOutlined className="benefit-icon" />
                    <Text>Weekly payouts directly to your bank</Text>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="cta-buttons">
                  <Button
                    type="primary"
                    size="large"
                    block
                    className="primary-cta restaurant-cta"
                    onClick={() => navigate('/restaurant/apply')}
                  >
                    Apply as Restaurant Partner
                  </Button>
                  <Button type="link" onClick={() => navigate('/vendor/login')}>
                    Already a partner? Login here
                  </Button>
                </div>
              </div>
            </Card>
          </Col>

          {/* Driver Partner Card */}
          <Col xs={24} md={12}>
            <Card hoverable className="partner-card">
              <div className="partner-content">
                <div className="partner-icon driver-icon">
                  <CarOutlined />
                </div>
                <Title level={2}>Delivery Partners</Title>
                <Paragraph className="partner-description">
                  Be your own boss and earn money on your own schedule
                </Paragraph>

                {/* Benefits */}
                <div className="benefits-list">
                  <div className="benefit-item">
                    <CheckCircleOutlined className="benefit-icon" />
                    <Text>Flexible hours - work when you want</Text>
                  </div>
                  <div className="benefit-item">
                    <DollarOutlined className="benefit-icon" />
                    <Text>Keep 100% of your tips</Text>
                  </div>
                  <div className="benefit-item">
                    <RocketOutlined className="benefit-icon" />
                    <Text>Fast approval process</Text>
                  </div>
                  <div className="benefit-item">
                    <SafetyOutlined className="benefit-icon" />
                    <Text>Insurance coverage while delivering</Text>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="cta-buttons">
                  <Button
                    type="primary"
                    size="large"
                    block
                    className="primary-cta driver-cta"
                    onClick={() => navigate('/driver/apply')}
                  >
                    Apply as Delivery Partner
                  </Button>
                  <Button type="link" onClick={() => navigate('/driver/login')}>
                    Already a driver? Login here
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-inner">
          <Title level={2} className="section-title">
            How Onboarding Works
          </Title>

          <Row gutter={[48, 48]}>
            <Col xs={24} md={12}>
              <Title level={4} className="steps-title restaurant-steps">
                <ShopOutlined /> For Restaurants
              </Title>
              <Steps
                direction="vertical"
                current={-1}
                items={[
                  {
                    title: 'Submit Application',
                    description: 'Fill out your restaurant details and operating hours'
                  },
                  {
                    title: 'AI Menu Import',
                    description: 'We auto-import your entire menu from your website in seconds'
                  },
                  {
                    title: 'Review & Approve',
                    description: 'Review your menu items and pricing, make any adjustments'
                  },
                  {
                    title: 'Go Live',
                    description: 'Start receiving orders and grow your business!'
                  }
                ]}
              />
            </Col>
            <Col xs={24} md={12}>
              <Title level={4} className="steps-title driver-steps">
                <CarOutlined /> For Drivers
              </Title>
              <Steps
                direction="vertical"
                current={-1}
                items={[
                  {
                    title: 'Sign Up',
                    description: 'Create your account with basic information'
                  },
                  {
                    title: 'Upload Documents',
                    description: "Driver's license, insurance, and vehicle registration"
                  },
                  {
                    title: 'Background Check',
                    description: 'Quick verification process (usually 24-48 hours)'
                  },
                  {
                    title: 'Start Earning',
                    description: 'Go online and accept delivery requests!'
                  }
                ]}
              />
            </Col>
          </Row>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Logo variant="full" size="sm" theme="dark" />
        <Text className="footer-copyright">
          © 2024 {brand.name}. {brand.tagline}
        </Text>
        <div className="footer-links">
          <Button type="link">Privacy Policy</Button>
          <Button type="link">Terms of Service</Button>
          <Button type="link">Contact Us</Button>
        </div>
      </footer>

      <style>{`
        .landing-page {
          min-height: 100vh;
          background: ${brand.gradients.hero};
        }

        .landing-header {
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }

        .hero-section {
          text-align: center;
          padding: 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-title {
          color: white !important;
          font-size: 56px !important;
          margin: 24px 0 16px 0 !important;
          font-weight: 800 !important;
        }

        .hero-subtitle {
          color: rgba(255,255,255,0.9) !important;
          font-size: 20px !important;
          max-width: 700px;
          margin: 0 auto 32px !important;
        }

        .hero-features {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .hero-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: 16px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.15);
          border-radius: 50px;
          backdrop-filter: blur(10px);
        }

        .hero-feature .anticon {
          font-size: 20px;
          color: ${brand.colors.accent};
        }

        .partner-section {
          padding: 0 40px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .partner-card {
          border-radius: 20px !important;
          height: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2) !important;
          overflow: hidden;
        }

        .partner-content {
          text-align: center;
          padding: 24px 0;
        }

        .partner-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .partner-icon .anticon {
          font-size: 36px;
          color: white;
        }

        .restaurant-icon {
          background: linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.primaryDark} 100%);
        }

        .driver-icon {
          background: ${brand.gradients.secondary};
        }

        .partner-description {
          font-size: 16px !important;
          color: ${brand.colors.textLight} !important;
        }

        .benefits-list {
          text-align: left;
          margin: 32px 0;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .benefit-icon {
          color: ${brand.colors.success} !important;
          font-size: 20px !important;
        }

        .cta-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .primary-cta {
          height: 54px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          border: none !important;
          border-radius: 12px !important;
        }

        .restaurant-cta {
          background: ${brand.gradients.primary} !important;
        }

        .driver-cta {
          background: ${brand.gradients.secondary} !important;
        }

        .how-it-works {
          background: white;
          padding: 80px 40px;
        }

        .how-it-works-inner {
          max-width: 1000px;
          margin: 0 auto;
        }

        .section-title {
          text-align: center;
          margin-bottom: 48px !important;
          color: ${brand.colors.text} !important;
        }

        .steps-title {
          margin-bottom: 24px !important;
        }

        .restaurant-steps {
          color: ${brand.colors.primary} !important;
        }

        .driver-steps {
          color: ${brand.colors.secondary} !important;
        }

        .landing-footer {
          background: ${brand.gradients.dark};
          color: white;
          padding: 48px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .footer-copyright {
          color: rgba(255,255,255,0.7) !important;
        }

        .footer-links .ant-btn-link {
          color: rgba(255,255,255,0.7) !important;
        }

        @media (max-width: 768px) {
          .landing-header {
            flex-direction: column;
            gap: 16px;
            padding: 16px 20px;
          }

          .hero-title {
            font-size: 36px !important;
          }

          .hero-features {
            gap: 12px;
          }

          .hero-feature {
            font-size: 14px;
            padding: 8px 16px;
          }

          .partner-section {
            padding: 0 20px 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
