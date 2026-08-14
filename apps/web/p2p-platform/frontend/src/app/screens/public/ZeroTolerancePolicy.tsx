import React from 'react';
import { Typography, Breadcrumb, Table } from 'antd';
import { HomeOutlined, DollarOutlined, SafetyOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const ZeroTolerancePolicy: React.FC = () => {
  const reportColumns = [
    { title: 'Channel', dataIndex: 'channel', key: 'channel' },
    { title: 'How to Report', dataIndex: 'how', key: 'how' },
  ];

  const reportData = [
    {
      key: '1',
      channel: 'In the Dollor app',
      how: 'Open the active-trip screen or your trip receipt and tap "Report a Safety Issue". Reports are accepted from riders, passengers, and members of the public.',
    },
    {
      key: '2',
      channel: 'Phone',
      how: 'Call Dollor.ai Support: +1-800-365-5671 (24/7)',
    },
    {
      key: '3',
      channel: 'Email',
      how: 'support@dollor.ai — include the trip date, time, and driver name if known',
    },
    {
      key: '4',
      channel: 'CPUC (independent)',
      how: 'California Public Utilities Commission: 1-800-894-9444 or CIU_intake@cpuc.ca.gov',
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
              <SafetyOutlined /> Zero Tolerance Policy
            </Breadcrumb.Item>
          </Breadcrumb>

          <Typography className="legal-typography">
            <Title level={1}>Zero Tolerance Intoxicating Substance Policy</Title>
            <Text type="secondary" className="effective-date">
              Zietra Technologies Inc. (Dollor.ai) &bull; Pursuant to CPUC General Order 157-E, Part 11.04
            </Text>

            <div className="intro-box">
              <Paragraph>
                Dollor.ai maintains a <Text strong>zero-tolerance policy</Text> for the use of
                intoxicating substances &mdash; drugs or alcohol &mdash; by any driver while providing
                transportation services on, or logged in to, the Dollor.ai platform. There is no
                permissible level of impairment. A driver who violates this policy is immediately
                suspended, and permanently removed from the platform if the complaint is substantiated.
              </Paragraph>
            </div>

            <Title level={2}>1. The Policy</Title>
            <Paragraph>
              A driver may not provide any trip while under the influence of alcohol, illegal drugs,
              or any substance (including prescription or over-the-counter medication) that impairs
              the ability to drive safely. Drivers may not consume alcohol within 8 hours before, or
              at any time during, a platform session, and may not transport open containers of
              alcohol in the driver compartment.
            </Paragraph>

            <Title level={2}>2. How to Report a Suspected Violation</Title>
            <Paragraph>
              If you reasonably suspect that your driver was under the influence of drugs or alcohol
              during the course of a ride, report it through any of the following channels:
            </Paragraph>
            <Table
              columns={reportColumns}
              dataSource={reportData}
              pagination={false}
              bordered
              size="middle"
            />
            <Paragraph style={{ marginTop: 16 }}>
              <PhoneOutlined /> <Text strong>Dollor.ai Support: +1-800-365-5671</Text>
              <br />
              <MailOutlined /> <Text strong>support@dollor.ai</Text>
            </Paragraph>
            <Paragraph>
              You may also complain directly to the California Public Utilities Commission:
              <br />
              <PhoneOutlined /> <Text strong>CPUC: 1-800-894-9444</Text>
              <br />
              <MailOutlined /> <Text strong>CIU_intake@cpuc.ca.gov</Text>
            </Paragraph>

            <Title level={2}>3. What Happens When You Report</Title>
            <Paragraph>
              <ol>
                <li>
                  <Text strong>Immediate suspension:</Text> upon receipt of a zero-tolerance
                  complaint, the reported driver&rsquo;s account is automatically and immediately
                  suspended. The driver cannot go online or receive any trip request while the
                  complaint is investigated.
                </li>
                <li>
                  <Text strong>Reference number:</Text> every report receives a unique reference
                  number so you can follow up on the outcome.
                </li>
                <li>
                  <Text strong>Investigation:</Text> our safety team begins an investigation within
                  48 hours, including reporter follow-up, a driver statement, and trip data review.
                </li>
                <li>
                  <Text strong>Resolution:</Text> substantiated complaints result in permanent
                  removal from the platform; incidents involving criminal conduct are referred to
                  law enforcement. All complaints and outcomes are permanently retained and reported
                  to the CPUC as required.
                </li>
              </ol>
            </Paragraph>

            <Title level={2}>4. Contact</Title>
            <Paragraph>
              Zietra Technologies Inc. (Dollor.ai)
              <br />
              Support: +1-800-365-5671 &bull; support@dollor.ai
              <br />
              California Public Utilities Commission: 1-800-894-9444 &bull; CIU_intake@cpuc.ca.gov
            </Paragraph>
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default ZeroTolerancePolicy;
