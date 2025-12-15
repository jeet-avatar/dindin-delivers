import React from 'react';
import { Typography, Breadcrumb } from 'antd';
import { HomeOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const TermsOfService: React.FC = () => {
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
              <FileTextOutlined /> Terms of Service
            </Breadcrumb.Item>
          </Breadcrumb>

          <Typography className="legal-typography">
            <Title level={1}>Terms of Service</Title>
            <Text type="secondary" className="effective-date">
              Last Updated: December 2024
            </Text>

            <div className="section">
              <Title level={2}>1. Acceptance of Terms</Title>
              <Paragraph>
                Welcome to Dollor.ai. By accessing or using our platform, mobile applications,
                or any services provided by Dollor.ai ("Services"), you agree to be bound by
                these Terms of Service ("Terms"). If you do not agree to these Terms, please
                do not use our Services.
              </Paragraph>
              <Paragraph>
                These Terms apply to all users of the Services, including but not limited to:
              </Paragraph>
              <ul>
                <li><strong>Customers</strong> - individuals who order food through our platform</li>
                <li><strong>Restaurant Partners</strong> - businesses that list their offerings on our platform</li>
                <li><strong>Delivery Partners</strong> - independent contractors who fulfill deliveries</li>
              </ul>
            </div>

            <div className="section">
              <Title level={2}>2. Description of Services</Title>
              <Paragraph>
                Dollor.ai operates a technology platform that connects customers with local
                restaurants and independent delivery partners. We facilitate food ordering,
                payment processing, and delivery logistics through our web and mobile applications.
              </Paragraph>
              <Paragraph>
                <strong>Important:</strong> Dollor.ai is a technology platform and does not
                itself provide food preparation or delivery services. Restaurants are
                independent businesses responsible for food quality and safety. Delivery
                partners are independent contractors, not employees of Dollor.ai.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>3. Account Registration</Title>
              <Paragraph>
                To use certain features of our Services, you must create an account. You agree to:
              </Paragraph>
              <ul>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information as needed</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
              <Paragraph>
                You must be at least 18 years old to create an account and use our Services.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>4. Orders and Payments</Title>
              <Title level={3}>4.1 Order Placement</Title>
              <Paragraph>
                When you place an order through Dollor.ai, you are making an offer to purchase
                from the restaurant partner. The restaurant may accept or decline your order
                based on availability and other factors.
              </Paragraph>
              <Title level={3}>4.2 Pricing</Title>
              <Paragraph>
                All prices displayed on our platform are set by restaurant partners and may
                differ from in-store prices. Prices are subject to change without notice.
                You will be charged the price shown at the time of order confirmation.
              </Paragraph>
              <Title level={3}>4.3 Payment Processing</Title>
              <Paragraph>
                Payment is processed through secure third-party payment processors. By
                providing payment information, you authorize us to charge your payment
                method for orders placed. All transactions are in USD unless otherwise stated.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>5. Restaurant Partner Terms</Title>
              <Paragraph>
                If you are a restaurant partner, you additionally agree to:
              </Paragraph>
              <ul>
                <li>Maintain all required licenses and permits for food service</li>
                <li>Ensure accurate menu information and pricing</li>
                <li>Prepare orders in a timely manner meeting quality standards</li>
                <li>Comply with all applicable food safety regulations</li>
                <li>Maintain adequate insurance coverage</li>
                <li>Pay applicable platform fees as outlined in your partner agreement</li>
              </ul>
            </div>

            <div className="section">
              <Title level={2}>6. Delivery Partner Terms</Title>
              <Paragraph>
                If you are a delivery partner, you acknowledge that:
              </Paragraph>
              <ul>
                <li>You are an independent contractor, not an employee</li>
                <li>You are responsible for your own equipment and vehicle</li>
                <li>You must maintain valid licenses and insurance</li>
                <li>You control when and how much you work</li>
                <li>You are responsible for your own taxes and expenses</li>
                <li>You must handle food safely during transport</li>
              </ul>
            </div>

            <div className="section">
              <Title level={2}>7. Cancellations and Refunds</Title>
              <Paragraph>
                Cancellation and refund policies vary based on circumstances:
              </Paragraph>
              <ul>
                <li><strong>Before restaurant confirmation:</strong> Full refund available</li>
                <li><strong>After preparation begins:</strong> Partial or no refund may apply</li>
                <li><strong>Quality issues:</strong> Report within 24 hours for review</li>
                <li><strong>Missing items:</strong> Refund or credit for affected items</li>
              </ul>
              <Paragraph>
                Dollor.ai reserves the right to make final decisions on refund requests.
                Abuse of refund policies may result in account suspension.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>8. Prohibited Conduct</Title>
              <Paragraph>
                You agree not to:
              </Paragraph>
              <ul>
                <li>Use the Services for any unlawful purpose</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the Services</li>
                <li>Attempt to gain unauthorized access to any systems</li>
                <li>Collect user data without consent</li>
                <li>Post false, misleading, or defamatory content</li>
                <li>Engage in fraudulent transactions or chargebacks</li>
                <li>Harass or threaten other users, partners, or staff</li>
              </ul>
            </div>

            <div className="section">
              <Title level={2}>9. Intellectual Property</Title>
              <Paragraph>
                All content on the Dollor.ai platform, including but not limited to logos,
                designs, text, graphics, software, and interfaces, is owned by or licensed
                to Dollor.ai and is protected by intellectual property laws.
              </Paragraph>
              <Paragraph>
                You may not copy, modify, distribute, or create derivative works from our
                content without express written permission.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>10. Limitation of Liability</Title>
              <Paragraph>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOLLOR.AI SHALL NOT BE LIABLE FOR
                ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL.
              </Paragraph>
              <Paragraph>
                Our total liability for any claims arising from the Services shall not
                exceed the amount you paid to Dollor.ai in the twelve months preceding
                the claim.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>11. Indemnification</Title>
              <Paragraph>
                You agree to indemnify and hold harmless Dollor.ai, its officers, directors,
                employees, and agents from any claims, damages, losses, or expenses arising
                from your use of the Services or violation of these Terms.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>12. Dispute Resolution</Title>
              <Paragraph>
                Any disputes arising from these Terms or the Services shall be resolved
                through binding arbitration in accordance with the American Arbitration
                Association rules. You waive your right to participate in class action
                lawsuits.
              </Paragraph>
              <Paragraph>
                These Terms shall be governed by the laws of the State of California,
                without regard to conflict of law provisions.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>13. Modifications</Title>
              <Paragraph>
                Dollor.ai reserves the right to modify these Terms at any time. We will
                notify users of material changes via email or platform notification.
                Continued use of the Services after changes constitutes acceptance of
                the modified Terms.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>14. Contact Information</Title>
              <Paragraph>
                For questions about these Terms, please contact us at:
              </Paragraph>
              <div className="contact-info">
                <p><strong>Dollor.ai Legal Team</strong></p>
                <p>Email: legal@dollor.ai</p>
                <p>Address: San Francisco, CA</p>
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
          <p className="copyright">&copy; 2024 Dollor.ai. All rights reserved.</p>
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
          margin-bottom: 40px;
          font-size: 14px;
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

          .footer-links {
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default TermsOfService;
