import React from 'react';
import { Typography, Breadcrumb, Table } from 'antd';
import { HomeOutlined, DollarOutlined, RollbackOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const RefundPolicy: React.FC = () => {
  const refundTimelineColumns = [
    { title: 'Scenario', dataIndex: 'scenario', key: 'scenario' },
    { title: 'Refund Amount', dataIndex: 'amount', key: 'amount' },
    { title: 'Processing Time', dataIndex: 'time', key: 'time' },
  ];

  const refundTimelineData = [
    {
      key: '1',
      scenario: 'Order cancelled before restaurant confirmation',
      amount: 'Full refund (100%)',
      time: '1-3 business days',
    },
    {
      key: '2',
      scenario: 'Order cancelled after restaurant starts preparing',
      amount: 'Partial refund (food cost only)',
      time: '3-5 business days',
    },
    {
      key: '3',
      scenario: 'Missing items from order',
      amount: 'Refund for missing items',
      time: '1-3 business days',
    },
    {
      key: '4',
      scenario: 'Wrong items delivered',
      amount: 'Full refund or replacement',
      time: '1-3 business days',
    },
    {
      key: '5',
      scenario: 'Quality issues (food safety concern)',
      amount: 'Full refund',
      time: '3-5 business days',
    },
    {
      key: '6',
      scenario: 'Ride cancelled before driver assigned',
      amount: 'Full refund (100%)',
      time: '1-3 business days',
    },
    {
      key: '7',
      scenario: 'Ride cancelled after driver assigned',
      amount: 'Cancellation fee may apply',
      time: '1-3 business days',
    },
    {
      key: '8',
      scenario: 'Driver no-show',
      amount: 'Full refund (100%)',
      time: '1-3 business days',
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
              <RollbackOutlined /> Refund Policy
            </Breadcrumb.Item>
          </Breadcrumb>

          <Typography className="legal-typography">
            <Title level={1}>Refund Policy</Title>
            <Text type="secondary" className="effective-date">
              Last Updated: January 2026
            </Text>

            <div className="intro-box">
              <Paragraph>
                At Dollor.ai, we want you to be completely satisfied with your experience.
                As a <strong>peer-to-peer (P2P) matchmaking platform</strong>, we facilitate
                transactions between independent parties. This refund policy explains how
                refunds are handled for orders and rides facilitated through our platform.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>1. P2P Platform Refund Overview</Title>
              <Paragraph>
                <strong>Important:</strong> Dollor.ai is a technology platform that connects
                customers with independent restaurants and driver partners. When you place an
                order or book a ride, your transaction is with those independent service providers,
                not with Dollor.ai directly.
              </Paragraph>
              <Paragraph>
                However, to ensure a positive experience, Dollor.ai facilitates the refund process
                on behalf of our platform participants. Refund decisions consider the interests of
                all parties: customers, restaurants, and drivers.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>2. Food Delivery Refunds</Title>

              <Title level={3}>2.1 Full Refund Scenarios</Title>
              <Paragraph>
                You may be eligible for a full refund in the following situations:
              </Paragraph>
              <ul>
                <li><strong>Order never received:</strong> If your order is not delivered and cannot be located</li>
                <li><strong>Cancellation before preparation:</strong> If you cancel before the restaurant begins preparing your order</li>
                <li><strong>Restaurant cancellation:</strong> If the restaurant cancels your order for any reason</li>
                <li><strong>Food safety concern:</strong> If you receive food that poses a health risk (spoiled, contaminated, etc.)</li>
                <li><strong>Completely wrong order:</strong> If you receive an entirely different order than what you ordered</li>
              </ul>

              <Title level={3}>2.2 Partial Refund Scenarios</Title>
              <Paragraph>
                Partial refunds may be issued for:
              </Paragraph>
              <ul>
                <li><strong>Missing items:</strong> Refund for the specific items not received</li>
                <li><strong>Wrong items:</strong> Refund for incorrect items received</li>
                <li><strong>Quality issues:</strong> Partial refund if food quality does not meet reasonable expectations</li>
                <li><strong>Late cancellation:</strong> Refund minus preparation costs if cancelled after cooking begins</li>
              </ul>

              <Title level={3}>2.3 Non-Refundable Situations</Title>
              <Paragraph>
                Refunds may not be available for:
              </Paragraph>
              <ul>
                <li>Change of mind after order is prepared and dispatched</li>
                <li>Incorrect delivery address provided by customer</li>
                <li>Customer not available at delivery location (after reasonable attempts)</li>
                <li>Orders consumed before reporting an issue</li>
                <li>Subjective taste preferences (unless quality is objectively poor)</li>
                <li>Repeated refund requests indicating potential abuse</li>
              </ul>
            </div>

            <div className="section">
              <Title level={2}>3. Rideshare Refunds</Title>

              <Title level={3}>3.1 Full Refund Scenarios</Title>
              <ul>
                <li><strong>Driver no-show:</strong> If the driver fails to arrive at the pickup location</li>
                <li><strong>Cancellation before driver assigned:</strong> Full refund of any pre-charged amount</li>
                <li><strong>Safety incident:</strong> If the ride is terminated due to safety concerns caused by the driver</li>
                <li><strong>Technical error:</strong> If charged incorrectly due to app malfunction</li>
              </ul>

              <Title level={3}>3.2 Partial Refund / Fare Adjustment</Title>
              <ul>
                <li><strong>Route deviation:</strong> If driver takes a significantly longer route without justification</li>
                <li><strong>Early termination:</strong> If ride ends before destination due to driver issue</li>
                <li><strong>Excessive wait time:</strong> Fare adjustment if pickup is significantly delayed</li>
              </ul>

              <Title level={3}>3.3 Cancellation Fees</Title>
              <Paragraph>
                <strong>Rider Cancellation:</strong> A cancellation fee may apply if you cancel after a driver
                has been assigned and is en route to your location. This compensates the driver for their time and fuel.
              </Paragraph>
              <Paragraph>
                <strong>Driver Cancellation:</strong> If a driver cancels after accepting your ride, no fee is charged to you.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>4. Refund Timeline</Title>
              <Table
                columns={refundTimelineColumns}
                dataSource={refundTimelineData}
                pagination={false}
                className="data-table"
              />
              <Paragraph style={{ marginTop: '16px' }}>
                <strong>Note:</strong> Refund processing times depend on your payment method and financial institution.
                Credit card refunds may take 5-10 business days to appear on your statement.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>5. How to Request a Refund</Title>
              <div className="steps-container">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Report the Issue</h4>
                    <p>Open the Dollor.ai app and go to your order/ride history. Select the affected order and tap "Report Issue."</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Provide Details</h4>
                    <p>Describe the issue and upload photos if applicable (missing items, food quality, etc.).</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Review Process</h4>
                    <p>Our team will review your request within 24-48 hours and may contact you for additional information.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Resolution</h4>
                    <p>You'll receive notification of the decision via email and in-app. Approved refunds are processed immediately.</p>
                  </div>
                </div>
              </div>
              <Paragraph>
                <strong>Time Limit:</strong> Refund requests must be submitted within <strong>24 hours</strong> of
                order delivery or ride completion. Requests submitted after this window may not be eligible for refund.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>6. Platform Fees</Title>
              <Paragraph>
                Dollor.ai charges a small platform facilitation fee on each transaction:
              </Paragraph>
              <ul>
                <li><strong>Food Delivery:</strong> $1.00 flat fee per order</li>
                <li><strong>Rideshare:</strong> $1.00 - $3.00 tiered fee based on fare value</li>
              </ul>
              <Paragraph>
                <strong>Platform Fee Refunds:</strong> Platform fees are refunded when you receive a full refund
                for your order or ride. For partial refunds, the platform fee is typically not refunded as the
                service connection was successfully made.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>7. Refund Methods</Title>
              <Paragraph>
                Refunds are issued to your original payment method:
              </Paragraph>
              <ul>
                <li><strong>Credit/Debit Card:</strong> Refunded to the same card used for payment</li>
                <li><strong>Dollor.ai Credits:</strong> Added to your account balance instantly (for faster resolution)</li>
                <li><strong>Apple Pay / Google Pay:</strong> Refunded to the linked card</li>
              </ul>
              <Paragraph>
                In some cases, we may offer Dollor.ai credits instead of a cash refund, especially for goodwill
                gestures or when the issue is not clearly attributable to any party.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>8. Disputes and Appeals</Title>
              <Paragraph>
                If you disagree with a refund decision, you may appeal by:
              </Paragraph>
              <ul>
                <li>Contacting our support team at <strong>support@dollor.ai</strong></li>
                <li>Providing additional evidence or documentation</li>
                <li>Requesting a supervisor review</li>
              </ul>
              <Paragraph>
                Appeals are reviewed within 5 business days. Dollor.ai's decision on appeals is final.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>9. Fraud Prevention</Title>
              <Paragraph>
                To maintain a fair marketplace, we monitor for refund abuse. Accounts exhibiting
                patterns of excessive or fraudulent refund requests may be subject to:
              </Paragraph>
              <ul>
                <li>Reduced refund eligibility</li>
                <li>Account review and potential suspension</li>
                <li>Denial of future refund requests</li>
              </ul>
              <Paragraph>
                We reserve the right to refuse refunds if we detect fraudulent activity.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>10. Contact Us</Title>
              <Paragraph>
                For refund inquiries or assistance, please contact us:
              </Paragraph>
              <div className="contact-info">
                <p><strong>Dollor.ai Support Team</strong></p>
                <p>Email: support@dollor.ai</p>
                <p>In-App: Help &amp; Support &gt; Refund Request</p>
                <p>Response Time: Within 24 hours</p>
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
            <Link to="/refund">Refund Policy</Link>
            <Link to="/vendor/login">Restaurant Login</Link>
            <Link to="/driver/login">Driver Login</Link>
          </div>
          <p className="copyright">&copy; 2026 Dollor.ai. All rights reserved.</p>
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

        .steps-container {
          margin: 24px 0;
        }

        .step {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #ffd700;
        }

        .step-number {
          width: 36px;
          height: 36px;
          background: #1a1a2e;
          color: #ffd700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }

        .step-content h4 {
          margin: 0 0 8px 0;
          color: #1a1a2e;
          font-size: 16px;
        }

        .step-content p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
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

          .step {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default RefundPolicy;
