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
              Last Updated: December 2025
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
                <strong>IMPORTANT: Dollor.ai is a PEER-TO-PEER (P2P) MATCHMAKING PLATFORM.</strong> We connect independent businesses
                and service providers with customers seeking services. We do not provide delivery, transportation, or food services directly.
                All transactions facilitated through our platform occur between independent parties, not between you and Dollor.ai.
              </Paragraph>
              <Paragraph>
                These Terms apply to all users of the Services, including but not limited to:
              </Paragraph>
              <ul>
                <li><strong>Customers/Riders</strong> - individuals who order food or request rides through our P2P platform</li>
                <li><strong>Restaurant Partners</strong> - independent businesses that list their food offerings for customer orders</li>
                <li><strong>Driver Partners</strong> - independent business operators who choose to accept delivery and ride requests</li>
              </ul>
            </div>

            <div className="section">
              <Title level={2}>2. Description of Services - Peer-to-Peer Matchmaking Platform</Title>
              <Paragraph>
                <strong>Dollor.ai operates as a PEER-TO-PEER (P2P) MATCHMAKING PLATFORM</strong> - a technology platform
                that connects independent parties who wish to transact with each other. We facilitate
                peer-to-peer connections between:
              </Paragraph>
              <ul>
                <li><strong>Customers ↔ Restaurants ↔ Delivery Partners</strong> - Customers place orders with restaurants; restaurants and customers connect with independent delivery partners who bid to fulfill deliveries</li>
                <li><strong>Riders ↔ Driver Partners</strong> - Riders request transportation; independent driver partners bid to provide rides</li>
              </ul>
              <Paragraph>
                <strong>CRITICAL DISTINCTION - Peer-to-Peer Model:</strong>
              </Paragraph>
              <ul>
                <li><strong>Transactions occur BETWEEN USERS, not with Dollor.ai</strong> - When you order food, you're transacting with the restaurant and a driver partner (not with Dollor.ai). When you request a ride, you're transacting with an independent driver (not with Dollor.ai).</li>
                <li><strong>Driver Partners set their own prices</strong> - Drivers bid on delivery/ride requests and set their own prices. We do not control pricing.</li>
                <li><strong>No algorithmic dispatch</strong> - We do not assign orders or rides. Drivers independently choose which requests to accept.</li>
                <li><strong>True independent businesses</strong> - All drivers and restaurants are independent business operators, not our employees or agents.</li>
              </ul>
              <Paragraph>
                <strong>What We Are and Are Not:</strong>
              </Paragraph>
              <ul>
                <li>✓ We ARE a peer-to-peer technology platform connecting independent parties</li>
                <li>✓ We ARE a marketplace facilitator and software-as-a-service provider</li>
                <li>✗ We ARE NOT a delivery company, transportation company, or food service provider</li>
                <li>✗ We ARE NOT the employer, agent, or franchisor of any driver or restaurant partner</li>
                <li>✗ We DO NOT prepare, handle, or transport food ourselves</li>
                <li>✗ We DO NOT own or operate any delivery vehicles</li>
                <li>✗ We DO NOT control when, where, how, or at what price driver partners work</li>
                <li>✗ We DO NOT guarantee service availability or quality (services are provided by independent third parties)</li>
              </ul>
              <Paragraph>
                <strong>Independent Business Relationships:</strong> Restaurants are independent businesses solely responsible for food quality, safety,
                and compliance with all applicable health regulations. Driver partners are independent business operators who make their own decisions about which requests to accept, their pricing, routes,
                schedules, and methods of service delivery. Dollor.ai merely facilitates connections between these independent parties through our P2P technology platform.
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
              <Title level={2}>4. Orders, Rides, and Payments</Title>
              <Title level={3}>4.1 Order/Ride Placement - Peer-to-Peer Transactions</Title>
              <Paragraph>
                When you place an order or request a ride through Dollor.ai, you are requesting
                to be matched with an independent service provider through our P2P platform. <strong>The transaction occurs
                between you and the independent service provider, not with Dollor.ai.</strong> For food orders, the restaurant
                (an independent business) may accept or decline based on availability. Driver partners (independent contractors)
                then bid on the delivery request and independently choose whether to accept. For rides, driver partners independently
                bid and choose whether to accept ride requests at prices they set.
              </Paragraph>
              <Title level={3}>4.2 Pricing - P2P Platform Facilitation Fees</Title>
              <Paragraph>
                <strong>As a P2P matchmaking platform, Dollor.ai charges simple platform facilitation fees for connecting independent parties.
                We do NOT take commissions from drivers or set service prices—drivers set their own prices through our bidding system:</strong>
              </Paragraph>

              <Title level={4}>Food Delivery - Flat $1 Fees (No Tiered Pricing)</Title>
              <ul>
                <li><strong>Customer Fee:</strong> $1.00 flat per order (regardless of order value)</li>
                <li><strong>Restaurant Fee:</strong> $1.00 flat per restaurant in order</li>
                <li><strong>Multi-Restaurant Orders:</strong> $1.00 customer fee total, $1.00 per restaurant</li>
                <li><strong>Driver Fee:</strong> $0.00 - NO COMMISSION - drivers keep 100% of delivery fees</li>
                <li><strong>Pickup Orders:</strong> $1.00 per restaurant + $1.00 per customer</li>
                <li><strong>Tips:</strong> NO FEE - 100% of tips go directly to drivers</li>
              </ul>

              <Title level={4}>Rideshare - Tiered Pricing (Based on Fare Value)</Title>
              <ul>
                <li><strong>Fares up to $35:</strong> $1.00 rider fee + $1.00 driver fee</li>
                <li><strong>Fares $35.01 - $70:</strong> $2.00 rider fee + $2.00 driver fee</li>
                <li><strong>Fares above $70:</strong> $3.00 rider fee + $3.00 driver fee</li>
                <li><strong>Tips:</strong> NO FEE - 100% of tips go directly to drivers</li>
              </ul>

              <Paragraph>
                Menu prices are set by restaurant partners and may differ from in-store prices.
                Ride fares are calculated based on distance, time, and market conditions.
                Drivers receive the full fare amount minus only the platform access fee shown above.
              </Paragraph>
              <Title level={3}>4.3 Payment Processing - Marketplace Facilitator Role</Title>
              <Paragraph>
                Payment is processed through secure third-party payment processors (Stripe).
                By providing payment information, you authorize us to charge your payment
                method for orders and rides placed. All transactions are in USD unless otherwise stated.
              </Paragraph>
              <Paragraph>
                <strong>IMPORTANT - P2P Payment Flow:</strong> As a marketplace facilitator, Dollor.ai collects payments on behalf of
                the independent service providers and passes through the funds (minus our small platform facilitation fee) to restaurants
                and driver partners. <strong>You are paying the restaurant and driver partner for their services, not Dollor.ai.</strong> We merely
                facilitate the payment transaction between independent parties through our P2P platform.
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
              <Title level={2}>6. Driver Partner Terms - Independent Business Operators on P2P Platform</Title>
              <Paragraph>
                If you are a driver partner providing delivery or rideshare services through our P2P marketplace, you acknowledge
                and agree to the following:
              </Paragraph>
              <Paragraph>
                <strong>CRITICAL: You are operating an independent business and transacting directly with customers and restaurants.
                You are NOT working for Dollor.ai. You are using our P2P technology platform to connect with customers seeking your services.</strong>
              </Paragraph>
              <Title level={3}>6.1 Independent Business Operator - NOT an Employee</Title>
              <ul>
                <li>You are an <strong>INDEPENDENT BUSINESS OPERATOR</strong> and <strong>INDEPENDENT CONTRACTOR</strong>, not an employee, agent, or representative of Dollor.ai</li>
                <li><strong>No employment, agency, partnership, or joint venture relationship exists between you and Dollor.ai</strong></li>
                <li>You are providing services to customers and restaurants directly (not to Dollor.ai) through our P2P platform</li>
                <li>Dollor.ai does not control, direct, or supervise when, where, how, or at what price you work</li>
                <li>You are free to accept or decline any delivery or ride request at your sole discretion</li>
                <li><strong>You set your own prices</strong> - You bid on orders and set your own delivery/ride fees; we do not control pricing</li>
                <li>You may work for any competing platforms simultaneously without restriction</li>
                <li>You set your own schedule, work hours, and service areas</li>
                <li>You determine your own methods of performing services</li>
              </ul>
              <Title level={3}>6.2 Your Responsibilities</Title>
              <ul>
                <li>You provide and maintain your own vehicle and equipment</li>
                <li>You are responsible for all vehicle operating costs (fuel, maintenance, repairs)</li>
                <li>You must maintain valid driver's license and vehicle registration</li>
                <li>You must maintain adequate auto insurance as required by law</li>
                <li>You choose your own routes (platform suggestions are optional)</li>
                <li>You are responsible for your own taxes, including self-employment tax</li>
                <li>You must comply with all applicable traffic laws and regulations</li>
              </ul>
              <Title level={3}>6.3 Platform Fees</Title>
              <Paragraph>
                <strong>For Food Delivery:</strong> Dollor.ai charges NO commission on deliveries.
                You keep 100% of the delivery fee and 100% of customer tips.
              </Paragraph>
              <Paragraph>
                <strong>For Rideshare:</strong> Platform access fees are tiered based on fare value:
              </Paragraph>
              <ul>
                <li>Fares up to $35: $1.00 platform fee</li>
                <li>Fares $35.01 - $70: $2.00 platform fee</li>
                <li>Fares above $70: $3.00 platform fee</li>
              </ul>
              <Paragraph>
                You keep 100% of customer tips regardless of fare amount.
              </Paragraph>
            </div>

            <div className="section verification-section">
              <Title level={2}>7. Document Verification & Compliance</Title>
              <Paragraph>
                To ensure platform safety and regulatory compliance, Dollor.ai requires
                verification of certain documents from Restaurant Partners and Delivery Partners.
              </Paragraph>

              <Title level={3}>7.1 Third-Party Verification</Title>
              <Paragraph>
                By registering as a Restaurant Partner or Delivery Partner, you consent to
                document verification through our authorized third-party verification partners.
                These partners may include identity verification services such as Persona, Onfido,
                or similar providers.
              </Paragraph>

              <Title level={3}>7.2 Required Documents - Restaurant Partners</Title>
              <Paragraph>
                Restaurant Partners must provide and verify the following documents:
              </Paragraph>
              <ul>
                <li><strong>Food Service License</strong> - Valid license from local health authority</li>
                <li><strong>Health Department Permit</strong> - Current health inspection certificate</li>
                <li><strong>Business License</strong> - Valid business operating license or W-9 form</li>
                <li><strong>Liability Insurance</strong> - Certificate of general liability insurance (minimum $1,000,000 coverage)</li>
              </ul>

              <Title level={3}>7.3 Required Documents - Delivery Partners</Title>
              <Paragraph>
                Delivery Partners must provide and verify the following documents:
              </Paragraph>
              <ul>
                <li><strong>Government-Issued ID</strong> - Valid driver's license or state ID</li>
                <li><strong>Vehicle Insurance</strong> - Current auto insurance policy</li>
                <li><strong>Profile Photo</strong> - Clear photo for customer identification</li>
                <li><strong>Background Check Consent</strong> - Authorization for background verification</li>
              </ul>

              <Title level={3}>7.4 Verification Process</Title>
              <Paragraph>
                The verification process includes:
              </Paragraph>
              <ul>
                <li>Document authenticity validation through automated and manual review</li>
                <li>Expiration date monitoring with renewal reminders</li>
                <li>Cross-reference with public databases where applicable</li>
                <li>Identity verification including liveness detection for photos</li>
              </ul>

              <Title level={3}>7.5 Verification Failures</Title>
              <Paragraph>
                If verification fails or documents are found to be fraudulent:
              </Paragraph>
              <ul>
                <li>Your account may be suspended pending review</li>
                <li>You will be notified and given opportunity to provide correct documents</li>
                <li>Repeated failures may result in permanent account termination</li>
                <li>Fraudulent documents may be reported to relevant authorities</li>
              </ul>

              <Title level={3}>7.6 Document Retention</Title>
              <Paragraph>
                Verified documents are stored securely and retained in accordance with our
                Privacy Policy and applicable regulations. You may request deletion of your
                documents upon account termination, subject to legal retention requirements.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>8. Rideshare Terms</Title>
              <Paragraph>
                For rideshare matchmaking services, the following additional terms apply:
              </Paragraph>
              <Title level={3}>8.1 Rider Responsibilities</Title>
              <ul>
                <li>Provide accurate pickup and dropoff locations</li>
                <li>Be ready at the pickup location when the driver arrives</li>
                <li>Treat drivers with respect; harassment will not be tolerated</li>
                <li>Wear seatbelts as required by law</li>
                <li>Do not transport illegal items or substances</li>
              </ul>
              <Title level={3}>8.2 Fare Calculation</Title>
              <Paragraph>
                Ride fares are calculated based on distance, estimated time, and current market
                conditions. Fares shown before ride confirmation are estimates and may vary
                based on actual route taken, traffic conditions, or route changes requested
                by the rider. A tiered matchmaking fee is added to each ride:
              </Paragraph>
              <ul>
                <li>Fares up to $35: $1.00 matchmaking fee</li>
                <li>Fares $35.01 - $70: $2.00 matchmaking fee</li>
                <li>Fares above $70: $3.00 matchmaking fee</li>
              </ul>
              <Title level={3}>8.3 P2P Platform Disclaimer</Title>
              <Paragraph>
                <strong>Dollor.ai is a peer-to-peer matchmaking technology platform only.</strong> We do not provide transportation,
                delivery, or food services. Driver partners are independent business operators who provide services
                directly to riders and customers through our P2P marketplace. Restaurants are independent businesses providing food directly to customers.
                <strong>All services are provided by independent third parties, not by Dollor.ai.</strong> Dollor.ai is not responsible for the actions, services,
                quality, safety, or conduct of any driver partner, restaurant, or customer. Your transaction is with the independent service provider, not with Dollor.ai.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>9. Cancellations and Refunds</Title>
              <Title level={3}>9.1 Food Order Cancellations</Title>
              <ul>
                <li><strong>Before restaurant confirmation:</strong> Full refund of all fees</li>
                <li><strong>After preparation begins:</strong> Partial or no refund may apply</li>
                <li><strong>Quality issues:</strong> Report within 24 hours for review</li>
                <li><strong>Missing items:</strong> Refund or credit for affected items</li>
              </ul>
              <Title level={3}>9.2 Ride Cancellations</Title>
              <ul>
                <li><strong>Before driver assigned:</strong> Full refund of matchmaking fee</li>
                <li><strong>After driver assigned:</strong> Cancellation fee may apply</li>
                <li><strong>Driver no-show:</strong> Full refund</li>
                <li><strong>Rider no-show:</strong> Cancellation fee charged</li>
              </ul>
              <Paragraph>
                Dollor.ai reserves the right to make final decisions on refund requests.
                Abuse of cancellation or refund policies may result in account suspension.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>10. Prohibited Conduct</Title>
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
              <Title level={2}>11. Intellectual Property</Title>
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
              <Title level={2}>12. Limitation of Liability - P2P Platform Disclaimer</Title>
              <Paragraph>
                <strong>IMPORTANT: As a peer-to-peer marketplace platform, services are provided by independent third parties, not by Dollor.ai.
                We connect independent parties but do not provide, control, or guarantee any services, food quality, transportation safety, or conduct of users.</strong>
              </Paragraph>
              <Paragraph>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DOLLOR.AI SHALL NOT BE LIABLE FOR
                ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, OR ANY DAMAGES
                ARISING FROM SERVICES PROVIDED BY INDEPENDENT THIRD PARTIES (DRIVERS, RESTAURANTS, ETC.) THROUGH OUR P2P PLATFORM.
              </Paragraph>
              <Paragraph>
                Our total liability for any claims arising from the Services shall not
                exceed the amount you paid to Dollor.ai in platform facilitation fees in the twelve months preceding
                the claim. This limitation reflects our role as a technology platform facilitator, not a service provider.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>13. Indemnification</Title>
              <Paragraph>
                You agree to indemnify and hold harmless Dollor.ai, its officers, directors,
                employees, and agents from any claims, damages, losses, or expenses arising
                from your use of the Services or violation of these Terms.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>14. Dispute Resolution</Title>
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
              <Title level={2}>15. Modifications</Title>
              <Paragraph>
                Dollor.ai reserves the right to modify these Terms at any time. We will
                notify users of material changes via email or platform notification.
                Continued use of the Services after changes constitutes acceptance of
                the modified Terms.
              </Paragraph>
            </div>

            <div className="section">
              <Title level={2}>16. Contact Information</Title>
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
