import React from 'react';
import { Card, Typography, Tag, List, Divider, Button } from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const PaymentSettings: React.FC = () => {
  const navigate = useNavigate();

  const recentPayouts = [
    { date: 'Mar 8, 2026', amount: 1250.00, status: 'Completed' },
    { date: 'Mar 1, 2026', amount: 980.50, status: 'Completed' },
    { date: 'Feb 22, 2026', amount: 1420.00, status: 'Completed' },
  ];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        Back
      </Button>

      <Title level={3}>Payment Settings</Title>

      {/* Bank Account Card */}
      <Card style={{ borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BankOutlined style={{ fontSize: 24, color: '#D97706' }} />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 18 }}>Wells Fargo</Text>
            <br />
            <Text type="secondary">Business Checking</Text>
          </div>
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Verified
          </Tag>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Account Number</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 15 }}>xxxx xxxx 4891</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Routing Number</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 15 }}>xxxx xxxx 2710</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Account Type</Text>
            <Text>Business Checking</Text>
          </div>
        </div>
      </Card>

      {/* Payout Schedule Card */}
      <Card style={{ borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <CalendarOutlined style={{ fontSize: 18, color: '#3B82F6' }} />
          <Text strong style={{ fontSize: 16 }}>Payout Schedule</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text type="secondary">Frequency</Text>
          <Text strong>Weekly</Text>
        </div>
      </Card>

      {/* Recent Payouts Card */}
      <Card style={{ borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <DollarOutlined style={{ fontSize: 18, color: '#10B981' }} />
          <Text strong style={{ fontSize: 16 }}>Recent Payouts</Text>
        </div>
        <List
          dataSource={recentPayouts}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div>
                  <Text>{item.date}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <CheckCircleOutlined style={{ color: '#10B981', marginRight: 4 }} />
                    {item.status}
                  </Text>
                </div>
                <Text strong style={{ fontSize: 16 }}>
                  ${item.amount.toFixed(2)}
                </Text>
              </div>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default PaymentSettings;
