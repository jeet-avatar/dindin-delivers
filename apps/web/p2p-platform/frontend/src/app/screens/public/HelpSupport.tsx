import React, { useState } from 'react';
import { Typography, Breadcrumb, Input, Collapse, Card, Row, Col, Button, Space } from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
  ShoppingCartOutlined,
  CreditCardOutlined,
  CarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const HelpSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    { key: 'All', label: 'All Topics', icon: <QuestionCircleOutlined /> },
    { key: 'Orders', label: 'Orders', icon: <ShoppingCartOutlined /> },
    { key: 'Payments', label: 'Payments', icon: <CreditCardOutlined /> },
    { key: 'Delivery', label: 'Delivery', icon: <CarOutlined /> },
    { key: 'Account', label: 'Account', icon: <UserOutlined /> },
  ];

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I track my order?',
      answer: 'You can track your order by going to the Orders section in your account. Once your order is picked up, you\'ll see real-time tracking showing your driver\'s location and estimated arrival time. You\'ll also receive push notifications for order status updates.',
      category: 'Orders',
    },
    {
      id: '2',
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit/debit cards (Visa, Mastercard, American Express, Discover), Apple Pay, Google Pay, and ACH bank transfers. ACH payments receive a discount on platform fees. All payments are processed securely through Stripe.',
      category: 'Payments',
    },
    {
      id: '3',
      question: 'How do I cancel my order?',
      answer: 'Orders can be cancelled within 2 minutes of placing them or before the restaurant starts preparing your food. Go to Orders → Select your active order → Tap Cancel Order. Full refunds are issued for eligible cancellations within 5-7 business days.',
      category: 'Orders',
    },
    {
      id: '4',
      question: 'How do I update my delivery address?',
      answer: 'Go to Profile → Manage Addresses to add, edit, or delete saved addresses. You can also add a new address during checkout. Make sure to include apartment/unit numbers and any special delivery instructions.',
      category: 'Account',
    },
    {
      id: '5',
      question: 'What are platform fees?',
      answer: 'Dollor.ai charges transparent, low platform fees:\n\n• Food Delivery: $1 flat fee per order\n• Rideshare: Tiered fees ($1 for fares under $15, $2 for $15-$30, $3 for $30+)\n\n100% of tips go directly to drivers. We believe in fair, transparent pricing.',
      category: 'Payments',
    },
    {
      id: '6',
      question: 'How do I contact my driver?',
      answer: 'Once your order is picked up, you can call or message your driver through the order tracking screen. Your real phone number is masked for privacy - we use a relay system to protect both parties.',
      category: 'Delivery',
    },
    {
      id: '7',
      question: 'What if my order is wrong or missing items?',
      answer: 'Contact support immediately through the app or website. Tap Help → Report Issue on your order. We\'ll work with the restaurant to resolve the issue and provide appropriate compensation, whether that\'s a refund or credit.',
      category: 'Orders',
    },
    {
      id: '8',
      question: 'How do I delete my account?',
      answer: 'Go to Profile → Settings → Delete Account. This permanently removes all your data including order history, saved addresses, and payment methods. Per Apple/Google app store requirements, you can delete your account at any time.',
      category: 'Account',
    },
    {
      id: '9',
      question: 'Are drivers employees of Dollor.ai?',
      answer: 'No, all drivers are independent contractors. Dollor.ai is a matchmaking platform that connects customers with independent drivers. We facilitate the connection and payment processing, but drivers operate their own businesses.',
      category: 'Delivery',
    },
    {
      id: '10',
      question: 'How do refunds work?',
      answer: 'Refunds are processed to your original payment method within 5-7 business days. For credit/debit cards, this may take an additional 1-3 days to appear on your statement depending on your bank. ACH refunds may take up to 10 business days.',
      category: 'Payments',
    },
  ];

  const filteredFAQs = faqItems.filter((faq) => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="help-page">
      {/* Header */}
      <header className="help-header">
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
          <Title level={1}>How can we help you?</Title>
          <Paragraph>Search our help center or browse categories below</Paragraph>
          <Search
            placeholder="Search for help..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            className="hero-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="help-content">
        <div className="content-container">
          <Breadcrumb className="breadcrumb">
            <Breadcrumb.Item>
              <Link to="/"><HomeOutlined /> Home</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <QuestionCircleOutlined /> Help & Support
            </Breadcrumb.Item>
          </Breadcrumb>

          {/* Contact Options */}
          <div className="contact-section">
            <Title level={3}>Need Immediate Help?</Title>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8}>
                <Card className="contact-card" hoverable>
                  <MessageOutlined className="contact-icon" />
                  <Title level={4}>Live Chat</Title>
                  <Text type="secondary">Average response: 2 min</Text>
                  <Button type="primary" block className="contact-btn" onClick={() => window.open('mailto:support@dollor.ai?subject=Live%20Chat%20Request', '_blank')}>
                    Start Chat
                  </Button>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="contact-card" hoverable>
                  <MailOutlined className="contact-icon" />
                  <Title level={4}>Email Support</Title>
                  <Text type="secondary">support@dollor.ai</Text>
                  <Button block className="contact-btn" onClick={() => window.open('mailto:support@dollor.ai', '_blank')}>
                    Send Email
                  </Button>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="contact-card" hoverable>
                  <PhoneOutlined className="contact-icon" />
                  <Title level={4}>Phone Support</Title>
                  <Text type="secondary">9 AM - 9 PM EST</Text>
                  <Button block className="contact-btn" onClick={() => window.location.href = 'tel:+14156966429'}>
                    Call Us
                  </Button>
                </Card>
              </Col>
            </Row>
          </div>

          {/* Category Filter */}
          <div className="category-filter">
            <Title level={3}>Browse by Category</Title>
            <Space wrap>
              {categories.map((cat) => (
                <Button
                  key={cat.key}
                  type={selectedCategory === cat.key ? 'primary' : 'default'}
                  icon={cat.icon}
                  onClick={() => setSelectedCategory(cat.key)}
                  className="category-btn"
                >
                  {cat.label}
                </Button>
              ))}
            </Space>
          </div>

          {/* FAQ Section */}
          <div className="faq-section">
            <Title level={3}>Frequently Asked Questions</Title>
            {filteredFAQs.length > 0 ? (
              <Collapse className="faq-collapse" bordered={false}>
                {filteredFAQs.map((faq) => (
                  <Panel
                    header={
                      <div className="faq-header">
                        <span>{faq.question}</span>
                        <span className="faq-category">{faq.category}</span>
                      </div>
                    }
                    key={faq.id}
                  >
                    <p className="faq-answer">{faq.answer}</p>
                  </Panel>
                ))}
              </Collapse>
            ) : (
              <div className="no-results">
                <QuestionCircleOutlined />
                <Text>No results found for "{searchQuery}"</Text>
                <Button type="link" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              </div>
            )}
          </div>

          {/* Still Need Help */}
          <div className="still-need-help">
            <Card className="help-card">
              <QuestionCircleOutlined className="help-icon" />
              <Title level={3}>Still need help?</Title>
              <Paragraph>
                Our support team is available 24/7 to assist you with any questions or issues.
              </Paragraph>
              <Button type="primary" size="large" icon={<MessageOutlined />} onClick={() => window.open('mailto:support@dollor.ai', '_blank')}>
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="help-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/vendor/login">Restaurant Login</Link>
            <Link to="/driver/login">Driver Login</Link>
          </div>
          <p className="copyright">&copy; 2025 Dollor.ai. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        .help-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }

        .help-header {
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
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 60px 48px;
          text-align: center;
        }

        .hero-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .hero-content h1 {
          color: white;
          font-size: 36px;
          margin-bottom: 12px;
        }

        .hero-content p {
          color: rgba(255,255,255,0.8);
          font-size: 18px;
          margin-bottom: 24px;
        }

        .hero-search {
          max-width: 500px;
        }

        .hero-search .ant-input {
          height: 48px;
          font-size: 16px;
        }

        .hero-search .ant-btn {
          height: 48px;
          background: #ffd700;
          border-color: #ffd700;
        }

        .help-content {
          flex: 1;
          padding: 48px;
        }

        .content-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .breadcrumb {
          margin-bottom: 32px;
        }

        .breadcrumb a {
          color: #1a1a2e;
        }

        .contact-section {
          margin-bottom: 48px;
        }

        .contact-section h3 {
          margin-bottom: 24px;
          color: #1a1a2e;
        }

        .contact-card {
          text-align: center;
          padding: 24px;
          border-radius: 12px;
        }

        .contact-card:hover {
          border-color: #ffd700;
        }

        .contact-icon {
          font-size: 36px;
          color: #ffd700;
          margin-bottom: 16px;
        }

        .contact-card h4 {
          margin-bottom: 4px;
        }

        .contact-btn {
          margin-top: 16px;
        }

        .category-filter {
          margin-bottom: 32px;
        }

        .category-filter h3 {
          margin-bottom: 16px;
          color: #1a1a2e;
        }

        .category-btn {
          border-radius: 20px;
        }

        .faq-section {
          margin-bottom: 48px;
        }

        .faq-section h3 {
          margin-bottom: 24px;
          color: #1a1a2e;
        }

        .faq-collapse {
          background: white;
          border-radius: 12px;
        }

        .faq-collapse .ant-collapse-item {
          border-bottom: 1px solid #f0f0f0;
        }

        .faq-collapse .ant-collapse-header {
          font-weight: 500;
          font-size: 16px;
          padding: 20px 24px !important;
        }

        .faq-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          gap: 16px;
        }

        .faq-category {
          font-size: 12px;
          color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
          padding: 4px 12px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .faq-answer {
          color: #64748b;
          line-height: 1.8;
          white-space: pre-line;
        }

        .no-results {
          text-align: center;
          padding: 48px;
          background: white;
          border-radius: 12px;
        }

        .no-results .anticon {
          font-size: 48px;
          color: #d1d5db;
          margin-bottom: 16px;
        }

        .still-need-help {
          margin-bottom: 32px;
        }

        .help-card {
          text-align: center;
          padding: 48px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          border: none;
          border-radius: 16px;
        }

        .help-icon {
          font-size: 48px;
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        .help-card h3 {
          color: #1a1a2e;
        }

        .help-card p {
          color: #1a1a2e;
          opacity: 0.8;
          max-width: 400px;
          margin: 0 auto 24px;
        }

        .help-footer {
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
          .help-header {
            padding: 16px 24px;
          }

          .hero-section {
            padding: 40px 24px;
          }

          .hero-content h1 {
            font-size: 28px;
          }

          .help-content {
            padding: 24px;
          }

          .faq-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .footer-links {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default HelpSupport;
