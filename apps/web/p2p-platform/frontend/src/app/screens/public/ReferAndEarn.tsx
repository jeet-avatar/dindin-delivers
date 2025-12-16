import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumb, Card, Row, Col, Button, Input, message, Steps, Statistic } from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  GiftOutlined,
  ShareAltOutlined,
  CopyOutlined,
  UserAddOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

const ReferAndEarn: React.FC = () => {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    pendingCredits: 0,
    earnedCredits: 0,
  });

  useEffect(() => {
    // Generate referral code (in production, fetch from API)
    const userId = localStorage.getItem('user_id') || Math.random().toString(36).substring(7);
    setReferralCode(`DOLLOR${userId.substring(0, 4).toUpperCase()}`);

    // Simulate stats (in production, fetch from API)
    setStats({
      totalReferrals: Math.floor(Math.random() * 10),
      pendingCredits: Math.random() * 25,
      earnedCredits: Math.random() * 50,
    });
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    message.success('Referral code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    const shareText = `Join me on Dollor.ai! Use my code ${referralCode} to get $5 off your first order. Download now: https://dollor.ai/app`;

    if (navigator.share) {
      navigator.share({
        title: 'Join Dollor.ai',
        text: shareText,
        url: 'https://dollor.ai/app',
      });
    } else {
      navigator.clipboard.writeText(shareText);
      message.success('Share link copied to clipboard!');
    }
  };

  return (
    <div className="refer-page">
      {/* Header */}
      <header className="refer-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.ai</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <GiftOutlined className="hero-icon" />
          <Title level={1}>Refer Friends, Earn Rewards</Title>
          <Paragraph>
            Share Dollor.ai with friends and both of you earn $5 in credits!
          </Paragraph>
        </div>
      </div>

      {/* Content */}
      <div className="refer-content">
        <div className="content-container">
          <Breadcrumb className="breadcrumb">
            <Breadcrumb.Item>
              <Link to="/"><HomeOutlined /> Home</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <GiftOutlined /> Refer & Earn
            </Breadcrumb.Item>
          </Breadcrumb>

          {/* Referral Code Card */}
          <Card className="code-card">
            <Title level={4}>Your Referral Code</Title>
            <div className="code-display">
              <Input
                value={referralCode}
                readOnly
                size="large"
                className="code-input"
                addonAfter={
                  <Button
                    type="text"
                    icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={copyToClipboard}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                }
              />
            </div>
            <div className="share-buttons">
              <Button
                type="primary"
                size="large"
                icon={<ShareAltOutlined />}
                onClick={shareReferral}
                className="share-btn"
              >
                Share with Friends
              </Button>
              <Button
                size="large"
                icon={<CopyOutlined />}
                onClick={copyToClipboard}
              >
                Copy Code
              </Button>
            </div>
          </Card>

          {/* Stats Cards */}
          <Row gutter={[24, 24]} className="stats-row">
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="Total Referrals"
                  value={stats.totalReferrals}
                  prefix={<UserAddOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="Pending Credits"
                  value={stats.pendingCredits}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="stat-card">
                <Statistic
                  title="Earned Credits"
                  value={stats.earnedCredits}
                  precision={2}
                  prefix="$"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* How It Works */}
          <Card className="how-it-works">
            <Title level={3}>How It Works</Title>
            <Steps direction="vertical" current={-1} className="steps">
              <Step
                title="Share Your Code"
                description="Send your unique referral code to friends and family"
                icon={<ShareAltOutlined />}
              />
              <Step
                title="Friend Signs Up"
                description="They create an account using your referral code"
                icon={<UserAddOutlined />}
              />
              <Step
                title="Friend Places Order"
                description="They place their first order on Dollor.ai"
                icon={<ShoppingOutlined />}
              />
              <Step
                title="Both Earn Credits"
                description="You both get $5 in credits to use on future orders!"
                icon={<TrophyOutlined />}
              />
            </Steps>
          </Card>

          {/* Rewards Tiers */}
          <Card className="rewards-card">
            <Title level={3}>Rewards Milestones</Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8}>
                <div className="reward-tier">
                  <div className="tier-badge bronze">5</div>
                  <Title level={4}>Bronze</Title>
                  <Text>5 successful referrals</Text>
                  <Paragraph className="reward-amount">$25 Bonus</Paragraph>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="reward-tier">
                  <div className="tier-badge silver">10</div>
                  <Title level={4}>Silver</Title>
                  <Text>10 successful referrals</Text>
                  <Paragraph className="reward-amount">$75 Bonus</Paragraph>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="reward-tier">
                  <div className="tier-badge gold">25</div>
                  <Title level={4}>Gold</Title>
                  <Text>25 successful referrals</Text>
                  <Paragraph className="reward-amount">$200 Bonus</Paragraph>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Terms */}
          <div className="terms-note">
            <Text type="secondary">
              Referral credits expire 90 days after issue. Friend must complete their first order
              within 30 days of signing up. Credits cannot be combined with other promotions.
              See full <Link to="/terms">Terms & Conditions</Link> for details.
            </Text>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="refer-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/help">Help & Support</Link>
          </div>
          <p className="copyright">&copy; 2025 Dollor.ai. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        .refer-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }

        .refer-header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 20px 48px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .logo-icon {
          font-size: 32px;
          color: #ffd700;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-section {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          padding: 60px 48px;
          text-align: center;
        }

        .hero-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .hero-icon {
          font-size: 64px;
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        .hero-content h1 {
          color: #1a1a2e;
          font-size: 36px;
          margin-bottom: 12px;
        }

        .hero-content p {
          color: #1a1a2e;
          font-size: 18px;
          opacity: 0.8;
        }

        .refer-content {
          flex: 1;
          padding: 48px;
        }

        .content-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .breadcrumb {
          margin-bottom: 32px;
        }

        .breadcrumb a {
          color: #1a1a2e;
        }

        .code-card {
          text-align: center;
          padding: 32px;
          margin-bottom: 32px;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }

        .code-display {
          max-width: 400px;
          margin: 24px auto;
        }

        .code-input {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 2px;
        }

        .code-input input {
          text-align: center;
          color: #ffd700 !important;
        }

        .share-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 24px;
        }

        .share-btn {
          background: #ffd700;
          border-color: #ffd700;
          color: #1a1a2e;
        }

        .share-btn:hover {
          background: #ffed4a;
          border-color: #ffed4a;
          color: #1a1a2e;
        }

        .stats-row {
          margin-bottom: 32px;
        }

        .stat-card {
          text-align: center;
          border-radius: 12px;
        }

        .stat-card .ant-statistic-title {
          color: #64748b;
        }

        .how-it-works {
          margin-bottom: 32px;
          border-radius: 16px;
        }

        .how-it-works h3 {
          margin-bottom: 24px;
          color: #1a1a2e;
        }

        .steps .ant-steps-item-icon {
          background: #ffd700;
          border-color: #ffd700;
        }

        .steps .ant-steps-item-icon .anticon {
          color: #1a1a2e;
        }

        .rewards-card {
          margin-bottom: 32px;
          border-radius: 16px;
        }

        .rewards-card h3 {
          margin-bottom: 24px;
          color: #1a1a2e;
          text-align: center;
        }

        .reward-tier {
          text-align: center;
          padding: 24px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .tier-badge {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          margin: 0 auto 16px;
          color: white;
        }

        .tier-badge.bronze {
          background: linear-gradient(135deg, #cd7f32, #b87333);
        }

        .tier-badge.silver {
          background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
        }

        .tier-badge.gold {
          background: linear-gradient(135deg, #ffd700, #ffed4a);
          color: #1a1a2e;
        }

        .reward-tier h4 {
          margin-bottom: 4px;
        }

        .reward-amount {
          color: #52c41a;
          font-size: 18px;
          font-weight: bold;
          margin-top: 12px;
        }

        .terms-note {
          text-align: center;
          padding: 24px;
          background: #f1f5f9;
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .refer-footer {
          background: #1a1a2e;
          padding: 32px 48px;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .footer-links a {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          transition: color 0.3s;
        }

        .footer-links a:hover {
          color: #ffd700;
        }

        .copyright {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .refer-header {
            padding: 16px 24px;
          }

          .hero-section {
            padding: 40px 24px;
          }

          .hero-content h1 {
            font-size: 28px;
          }

          .refer-content {
            padding: 24px;
          }

          .share-buttons {
            flex-direction: column;
          }

          .share-buttons button {
            width: 100%;
          }

          .footer-links {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ReferAndEarn;
