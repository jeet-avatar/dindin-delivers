import React from 'react';
import { Typography, Breadcrumb, Table } from 'antd';
import { HomeOutlined, DollarOutlined, SafetyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const PrivacyPolicy: React.FC = () => {
  const dataCollectionColumns = [
    { title: 'Data Type', dataIndex: 'type', key: 'type' },
    { title: 'Examples', dataIndex: 'examples', key: 'examples' },
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose' },
  ];

  const dataCollectionData = [
    {
      key: '1',
      type: 'Account Information',
      examples: 'Name, email, phone number, password',
      purpose: 'Account creation and authentication',
    },
    {
      key: '2',
      type: 'Payment Information',
      examples: 'Credit card number, billing address',
      purpose: 'Process transactions securely',
    },
    {
      key: '3',
      type: 'Location Data',
      examples: 'Delivery address, GPS coordinates',
      purpose: 'Facilitate accurate deliveries',
    },
    {
      key: '4',
      type: 'Order History',
      examples: 'Past orders, preferences, reviews',
      purpose: 'Personalization and customer service',
    },
    {
      key: '5',
      type: 'Device Information',
      examples: 'IP address, device type, browser',
      purpose: 'Security and service optimization',
    },
  ];

  return (
    <div className="legal-page">
      {/* Header */}
      <header className="legal-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.ai</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="legal-content">
        <div className="content-container">
          <Breadcrumb className="breadcrumb">
            <Breadcrumb.Item>
              <Link to="/"><HomeOutlined /> Home</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <SafetyOutlined /> Privacy Policy
            </Breadcrumb.Item>
          </Breadcrumb>

          <Typography className="legal-typography">
            <Title level={1}>Privacy Policy</Title>
            <Text type="secondary" className="effective-date">
              Last Updated: December 2025
            </Text>

            <div className="intro-box">
              <Paragraph>
                At Dollor.ai, your privacy is our priority. This Privacy Policy explains
                how we collect, use, protect, and share your personal information when
                you use our peer-to-peer (P2P) matchmaking platform. <strong>Dollor.ai is a technology platform
                that connects independent parties</strong>—customers, restaurants, and drivers—who transact
                with each other. We do not provide delivery or transportation services directly.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>1. Information We Collect</Title>
              <Paragraph>
                We collect information to provide, improve, and secure our services.
                The types of information we collect include:
              </Paragraph>

              <Table
                columns={dataCollectionColumns}
                dataSource={dataCollectionData}
                pagination={false}
                className="data-table"
              />

              <Title level={3}>1.1 Information You Provide</Title>
              <Paragraph>
                When you create an account, place orders, or contact us, you voluntarily
                provide information such as your name, email address, phone number, delivery
                addresses, and payment information.
              </Paragraph>

              <Title level={3}>1.2 Information Collected Automatically</Title>
              <Paragraph>
                When you use our platform, we automatically collect:
              </Paragraph>
              <ul>
                <li>Device identifiers and technical information</li>
                <li>Log data (access times, pages viewed, links clicked)</li>
                <li>Location data when you enable location services</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <Title level={3}>1.3 Information from Third Parties</Title>
              <Paragraph>
                We may receive information from payment processors, identity verification
                services, social media platforms (if you connect your accounts), and
                marketing partners.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>2. How We Use Your Information</Title>
              <Paragraph>
                As a P2P matchmaking platform, we use the information we collect to:
              </Paragraph>
              <div className="use-cases">
                <div className="use-case">
                  <strong>Facilitate P2P Connections</strong>
                  <p>Connect customers with restaurants and independent drivers, facilitate payments between parties</p>
                </div>
                <div className="use-case">
                  <strong>Improve Experience</strong>
                  <p>Personalize recommendations and optimize our platform</p>
                </div>
                <div className="use-case">
                  <strong>Communicate</strong>
                  <p>Send order updates, promotions, and important notices</p>
                </div>
                <div className="use-case">
                  <strong>Ensure Safety</strong>
                  <p>Prevent fraud, enforce policies, and protect users</p>
                </div>
                <div className="use-case">
                  <strong>Legal Compliance</strong>
                  <p>Meet regulatory requirements and respond to legal requests</p>
                </div>
                <div className="use-case">
                  <strong>Analytics</strong>
                  <p>Understand usage patterns and improve services</p>
                </div>
              </div>
            </div>

            <div className="section">
              <Title level={2}>3. Information Sharing</Title>
              <Paragraph>
                <strong>Important: As a P2P matchmaking platform, your transactions occur with independent third parties,
                not with Dollor.ai.</strong> We do not sell your personal information. We share your information as necessary
                to facilitate P2P transactions between users:
              </Paragraph>
              <ul>
                <li><strong>Restaurant Partners (Independent Businesses):</strong> When you place an order, your information
                (name, contact info, order details) is shared with the restaurant because you are transacting directly with them,
                not with Dollor.ai</li>
                <li><strong>Delivery Partners (Independent Contractors):</strong> When a delivery is arranged, your information
                (delivery address, order details) is shared with the driver because they are providing services directly to you and
                the restaurant, not to Dollor.ai</li>
                <li><strong>Payment Processors:</strong> To facilitate secure payments between you and service providers (we act
                as a marketplace facilitator processing payments on behalf of independent parties)</li>
                <li><strong>Service Providers:</strong> Who help us operate our P2P platform (hosting, analytics, support)</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
              </ul>
              <Paragraph>
                <strong>P2P Platform Disclosure:</strong> Because Dollor.ai is a matchmaking platform connecting independent parties,
                the restaurants and drivers you transact with are independent businesses—not our employees or agents. They have their
                own privacy practices and are responsible for how they handle your information in connection with the services they
                provide to you. All platform service providers are bound by contractual obligations to protect your information.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>4. Data Security</Title>
              <Paragraph>
                We implement robust security measures to protect your information:
              </Paragraph>
              <ul>
                <li><strong>Encryption:</strong> All data transmitted is encrypted using TLS/SSL</li>
                <li><strong>Payment Security:</strong> PCI-DSS compliant payment processing</li>
                <li><strong>Access Controls:</strong> Strict employee access policies</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and threat detection</li>
                <li><strong>Regular Audits:</strong> Periodic security assessments and updates</li>
              </ul>
              <Paragraph>
                While we take extensive precautions, no system is completely secure. We
                encourage you to use strong passwords and protect your account credentials.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>5. Your Rights and Choices</Title>
              <Paragraph>
                You have the following rights regarding your personal information:
              </Paragraph>

              <div className="rights-grid">
                <div className="right-item">
                  <h4>Access</h4>
                  <p>Request a copy of your personal data</p>
                </div>
                <div className="right-item">
                  <h4>Correction</h4>
                  <p>Update inaccurate or incomplete information</p>
                </div>
                <div className="right-item">
                  <h4>Deletion</h4>
                  <p>Request deletion of your data (subject to legal requirements)</p>
                </div>
                <div className="right-item">
                  <h4>Portability</h4>
                  <p>Receive your data in a portable format</p>
                </div>
                <div className="right-item">
                  <h4>Opt-Out</h4>
                  <p>Unsubscribe from marketing communications</p>
                </div>
                <div className="right-item">
                  <h4>Restrict</h4>
                  <p>Limit how we process your data</p>
                </div>
              </div>

              <Paragraph>
                To exercise these rights, contact us at privacy@dollor.ai or through your
                account settings. We will respond within 30 days.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>6. Cookies and Tracking</Title>
              <Paragraph>
                We use cookies and similar technologies to:
              </Paragraph>
              <ul>
                <li>Remember your preferences and login status</li>
                <li>Analyze platform usage and performance</li>
                <li>Personalize content and advertisements</li>
                <li>Prevent fraud and enhance security</li>
              </ul>
              <Paragraph>
                You can manage cookie preferences through your browser settings. Note that
                disabling certain cookies may affect platform functionality.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>7. Data Retention</Title>
              <Paragraph>
                We retain your information for as long as necessary to:
              </Paragraph>
              <ul>
                <li>Provide our services and maintain your account</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Support business operations (analytics, auditing)</li>
              </ul>
              <Paragraph>
                When you delete your account, we will delete or anonymize your personal
                data within 90 days, except where retention is required by law.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>8. Children's Privacy</Title>
              <Paragraph>
                Our Services are not intended for children under 18 years of age. We do
                not knowingly collect personal information from children. If we learn
                that we have collected information from a child, we will delete it promptly.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>9. International Data Transfers</Title>
              <Paragraph>
                Your information may be transferred to and processed in countries other
                than your country of residence. We ensure appropriate safeguards are in
                place, including standard contractual clauses and compliance with
                applicable data protection laws.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>10. California Privacy Rights (CCPA)</Title>
              <Paragraph>
                California residents have additional rights under the California Consumer
                Privacy Act (CCPA):
              </Paragraph>
              <ul>
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>
              <Paragraph>
                <strong>We do not sell personal information.</strong> To make a request,
                contact us at privacy@dollor.ai.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>11. Changes to This Policy</Title>
              <Paragraph>
                We may update this Privacy Policy periodically. We will notify you of
                material changes via email or prominent notice on our platform. Your
                continued use of our Services after changes constitutes acceptance of
                the updated policy.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>12. Contact Us</Title>
              <Paragraph>
                If you have questions, concerns, or requests regarding this Privacy Policy
                or our data practices, please contact us:
              </Paragraph>
              <div className="contact-info">
                <p><strong>Dollor.ai Privacy Team</strong></p>
                <p>Email: privacy@dollor.ai</p>
                <p>Address: San Francisco, CA</p>
                <p>Response Time: Within 30 days</p>
              </div>
            </div>
          </Typography>
        </div>
      </div>

      {/* Footer */}
      <footer className="legal-footer">
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
        .legal-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }

        .legal-header {
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

        .legal-content {
          flex: 1;
          padding: 48px;
        }

        .content-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          padding: 48px;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }

        .breadcrumb {
          margin-bottom: 32px;
        }

        .breadcrumb a {
          color: #1a1a2e;
        }

        .legal-typography h1 {
          color: #1a1a2e;
          margin-bottom: 8px;
        }

        .effective-date {
          display: block;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .intro-box {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 40px;
        }

        .intro-box p {
          margin: 0;
          color: #1a1a2e;
          font-size: 16px;
          font-weight: 500;
        }

        .section {
          margin-bottom: 40px;
        }

        .section h2 {
          color: #1a1a2e;
          font-size: 24px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #ffd700;
        }

        .section h3 {
          color: #334155;
          font-size: 18px;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        .section ul {
          padding-left: 24px;
          margin-bottom: 16px;
        }

        .section li {
          margin-bottom: 8px;
          line-height: 1.6;
        }

        .section p {
          line-height: 1.8;
          color: #475569;
        }

        .data-table {
          margin: 24px 0;
        }

        .data-table .ant-table-thead > tr > th {
          background: #1a1a2e;
          color: white;
        }

        .use-cases {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin: 24px 0;
        }

        .use-case {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #ffd700;
        }

        .use-case strong {
          color: #1a1a2e;
          display: block;
          margin-bottom: 8px;
        }

        .use-case p {
          margin: 0;
          font-size: 14px;
        }

        .rights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
          margin: 24px 0;
        }

        .right-item {
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .right-item h4 {
          color: #1a1a2e;
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .right-item p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        .contact-info {
          background: #f1f5f9;
          padding: 24px;
          border-radius: 8px;
          margin-top: 16px;
        }

        .contact-info p {
          margin: 4px 0;
        }

        .legal-footer {
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
          .legal-header {
            padding: 16px 24px;
          }

          .legal-content {
            padding: 24px;
          }

          .content-container {
            padding: 24px;
          }

          .use-cases {
            grid-template-columns: 1fr;
          }

          .rights-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .footer-links {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default PrivacyPolicy;
