import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Button, List, Avatar, Tag, Progress, Typography } from 'antd';
import {
  DollarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  StarOutlined,
  ArrowUpOutlined,
  RightOutlined,
  CheckCircleOutlined,
  PhoneOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const DriverDashboard: React.FC = () => {
  const [activeDelivery] = useState({
    id: 'DEL-2024-001',
    restaurant: 'Pasta Paradise',
    customer: 'John Smith',
    address: '123 Main Street, Apt 4B',
    items: 3,
    total: 42.50,
    distance: '2.3 mi',
    estimatedTime: '15 min',
    status: 'picked_up'
  });

  const pendingDeliveries = [
    {
      id: 'DEL-2024-002',
      restaurant: 'Burger Bliss',
      address: '456 Oak Avenue',
      distance: '1.8 mi',
      payout: 8.50,
      eta: '20 min'
    },
    {
      id: 'DEL-2024-003',
      restaurant: 'Sushi Supreme',
      address: '789 Pine Road',
      distance: '3.2 mi',
      payout: 12.00,
      eta: '25 min'
    }
  ];

  const todayStats = {
    deliveries: 12,
    earnings: 156.80,
    hoursOnline: 4.5,
    acceptanceRate: 92
  };

  return (
    <div className="driver-dashboard">
      {/* Welcome Header */}
      <div className="welcome-section">
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b' }}>Good Afternoon, Driver!</Title>
          <Text type="secondary">Here's your delivery activity for today</Text>
        </div>
        <Button type="primary" size="large" icon={<CarOutlined />} className="start-delivery-btn">
          Start New Delivery
        </Button>
      </div>

      {/* Today's Stats */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card green">
            <Statistic
              title="Today's Earnings"
              value={todayStats.earnings}
              precision={2}
              prefix="$"
              suffix={<ArrowUpOutlined style={{ color: '#10B981', fontSize: 14 }} />}
              valueStyle={{ color: '#10B981', fontWeight: 700 }}
            />
            <div className="stat-footer">
              <Text type="secondary">+$23.50 from last hour</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card purple">
            <Statistic
              title="Deliveries"
              value={todayStats.deliveries}
              prefix={<CarOutlined style={{ marginRight: 8 }} />}
              valueStyle={{ color: '#6366F1', fontWeight: 700 }}
            />
            <div className="stat-footer">
              <Text type="secondary">3 more than yesterday</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card blue">
            <Statistic
              title="Hours Online"
              value={todayStats.hoursOnline}
              precision={1}
              suffix="hrs"
              prefix={<ClockCircleOutlined style={{ marginRight: 8 }} />}
              valueStyle={{ color: '#3B82F6', fontWeight: 700 }}
            />
            <div className="stat-footer">
              <Text type="secondary">Target: 8 hours</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card orange">
            <Statistic
              title="Acceptance Rate"
              value={todayStats.acceptanceRate}
              suffix="%"
              prefix={<StarOutlined style={{ marginRight: 8 }} />}
              valueStyle={{ color: '#F59E0B', fontWeight: 700 }}
            />
            <div className="stat-footer">
              <Text type="secondary">Great job!</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        {/* Active Delivery */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div className="card-header">
                <span><CarOutlined /> Active Delivery</span>
                <Tag color="blue">In Progress</Tag>
              </div>
            }
            className="active-delivery-card"
          >
            {activeDelivery ? (
              <div className="active-delivery">
                <div className="delivery-progress">
                  <div className="progress-step completed">
                    <CheckCircleOutlined />
                    <span>Accepted</span>
                  </div>
                  <div className="progress-line completed"></div>
                  <div className="progress-step completed">
                    <CheckCircleOutlined />
                    <span>Picked Up</span>
                  </div>
                  <div className="progress-line"></div>
                  <div className="progress-step">
                    <div className="step-circle">3</div>
                    <span>Delivered</span>
                  </div>
                </div>

                <div className="delivery-details">
                  <div className="detail-row">
                    <div className="detail-item">
                      <Text type="secondary">Restaurant</Text>
                      <Text strong>{activeDelivery.restaurant}</Text>
                    </div>
                    <div className="detail-item">
                      <Text type="secondary">Customer</Text>
                      <Text strong>{activeDelivery.customer}</Text>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item full">
                      <Text type="secondary"><EnvironmentOutlined /> Delivery Address</Text>
                      <Text strong>{activeDelivery.address}</Text>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <Text type="secondary">Items</Text>
                      <Text strong>{activeDelivery.items} items</Text>
                    </div>
                    <div className="detail-item">
                      <Text type="secondary">Distance</Text>
                      <Text strong>{activeDelivery.distance}</Text>
                    </div>
                    <div className="detail-item">
                      <Text type="secondary">ETA</Text>
                      <Text strong>{activeDelivery.estimatedTime}</Text>
                    </div>
                  </div>
                </div>

                <div className="delivery-actions">
                  <Button icon={<PhoneOutlined />} className="contact-btn">Contact Customer</Button>
                  <Button type="primary" icon={<CheckCircleOutlined />} className="complete-btn">
                    Mark as Delivered
                  </Button>
                </div>
              </div>
            ) : (
              <div className="no-delivery">
                <CarOutlined style={{ fontSize: 48, color: '#94a3b8' }} />
                <Text type="secondary">No active delivery</Text>
                <Button type="primary">Find Deliveries</Button>
              </div>
            )}
          </Card>
        </Col>

        {/* Available Deliveries */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div className="card-header">
                <span><EnvironmentOutlined /> Available Nearby</span>
                <Button type="link">View All <RightOutlined /></Button>
              </div>
            }
            className="pending-deliveries-card"
          >
            <List
              dataSource={pendingDeliveries}
              renderItem={(item) => (
                <List.Item className="delivery-item">
                  <div className="delivery-info">
                    <Avatar style={{ background: '#10B981' }}>{item.restaurant[0]}</Avatar>
                    <div className="delivery-text">
                      <Text strong>{item.restaurant}</Text>
                      <Text type="secondary" className="delivery-address">{item.address}</Text>
                      <div className="delivery-meta">
                        <Tag color="blue">{item.distance}</Tag>
                        <Tag color="orange">{item.eta}</Tag>
                      </div>
                    </div>
                  </div>
                  <div className="delivery-payout">
                    <Text type="secondary">Payout</Text>
                    <Text strong style={{ color: '#10B981', fontSize: 18 }}>${item.payout.toFixed(2)}</Text>
                    <Button type="primary" size="small">Accept</Button>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Weekly Progress */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <Card title={<span><StarOutlined /> Weekly Progress</span>} className="weekly-card">
            <Row gutter={[40, 20]}>
              <Col xs={24} md={8}>
                <div className="progress-item">
                  <div className="progress-header">
                    <Text>Deliveries Goal</Text>
                    <Text strong>45 / 50</Text>
                  </div>
                  <Progress percent={90} strokeColor="#10B981" />
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="progress-item">
                  <div className="progress-header">
                    <Text>Earnings Goal</Text>
                    <Text strong>$680 / $800</Text>
                  </div>
                  <Progress percent={85} strokeColor="#6366F1" />
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="progress-item">
                  <div className="progress-header">
                    <Text>Hours Goal</Text>
                    <Text strong>32 / 40 hrs</Text>
                  </div>
                  <Progress percent={80} strokeColor="#F59E0B" />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <style>{`
        .driver-dashboard {
          padding: 0;
        }
        .welcome-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .start-delivery-btn {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          height: 44px;
          padding: 0 24px;
          border-radius: 10px;
        }
        .stat-card {
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .stat-card .ant-card-body {
          padding: 20px;
        }
        .stat-footer {
          margin-top: 8px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .active-delivery-card {
          border-radius: 16px;
        }
        .delivery-progress {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          margin-bottom: 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
        }
        .progress-step.completed {
          color: #10B981;
        }
        .progress-step .anticon {
          font-size: 24px;
        }
        .step-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
        }
        .progress-line {
          flex: 1;
          height: 3px;
          background: #e2e8f0;
          margin: 0 10px;
        }
        .progress-line.completed {
          background: #10B981;
        }
        .delivery-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .detail-row {
          display: flex;
          gap: 24px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .detail-item.full {
          flex: 3;
        }
        .delivery-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
        }
        .contact-btn {
          flex: 1;
          height: 44px;
          border-radius: 10px;
        }
        .complete-btn {
          flex: 2;
          height: 44px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
        }
        .no-delivery {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px;
        }
        .pending-deliveries-card {
          border-radius: 16px;
        }
        .delivery-item {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
        }
        .delivery-info {
          display: flex;
          gap: 12px;
        }
        .delivery-text {
          display: flex;
          flex-direction: column;
        }
        .delivery-address {
          font-size: 12px;
        }
        .delivery-meta {
          margin-top: 8px;
        }
        .delivery-payout {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .weekly-card {
          border-radius: 16px;
        }
        .progress-item {
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
};

export default DriverDashboard;
