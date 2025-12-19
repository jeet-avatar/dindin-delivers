import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, List, Avatar, Tag, Progress, Typography, Spin, message } from 'antd';
import {
  DollarOutlined,
  CarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  StarOutlined,
  ArrowUpOutlined,
  RightOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Title, Text } = Typography;

interface ActiveDelivery {
  id: string;
  restaurant: string;
  customer: string;
  address: string;
  items: number;
  total: number;
  distance: string;
  estimated_time: string;
  status: string;
}

interface PendingDelivery {
  id: string;
  restaurant: string;
  address: string;
  distance: string;
  payout: number;
  eta: string;
}

interface TodayStats {
  deliveries: number;
  earnings: number;
  hours_online: number;
  acceptance_rate: number;
}

interface WeeklyStats {
  deliveries: { current: number; goal: number };
  earnings: { current: number; goal: number };
  hours: { current: number; goal: number };
}

interface DashboardData {
  driver_name: string;
  driver_id: string;
  is_online: boolean;
  rating: number;
  active_delivery: ActiveDelivery | null;
  pending_deliveries: PendingDelivery[];
  today_stats: TodayStats;
  weekly_stats: WeeklyStats;
}

const DriverDashboard: React.FC = () => {
  const API_URL = getApiUrl();
  const [loading, setLoading] = useState(true);
  const [driverName, setDriverName] = useState('Driver');
  const [isOnline, setIsOnline] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(null);
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    deliveries: 0,
    earnings: 0,
    hours_online: 0,
    acceptance_rate: 0
  });
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    deliveries: { current: 0, goal: 50 },
    earnings: { current: 0, goal: 800 },
    hours: { current: 0, goal: 40 }
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('driver_token') || localStorage.getItem('access_token');

      if (!token) {
        // Not logged in, use default data
        setLoading(false);
        return;
      }

      const response = await axios.get<DashboardData>(`${API_URL}/api/driver/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;

      setDriverName(data.driver_name || 'Driver');
      setIsOnline(data.is_online);
      setActiveDelivery(data.active_delivery);
      setPendingDeliveries(data.pending_deliveries);
      setTodayStats({
        deliveries: data.today_stats.deliveries,
        earnings: data.today_stats.earnings,
        hours_online: data.today_stats.hours_online,
        acceptance_rate: data.today_stats.acceptance_rate
      });
      setWeeklyStats(data.weekly_stats);

      // Cache the name
      localStorage.setItem('driver_name', data.driver_name);

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);

      // Fallback to cached data
      const name = localStorage.getItem('driver_name') || 'Driver';
      setDriverName(name);

      if (error.response?.status === 401) {
        message.warning('Session expired. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Welcome Header */}
      <div className="welcome-section">
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e293b' }}>Good {getTimeOfDay()}, {driverName}!</Title>
          <Text type="secondary">
            {isOnline ? "You're online and ready to deliver" : "Here's your delivery activity for today"}
          </Text>
        </div>
        <Button type="primary" size="large" icon={<CarOutlined />} className="start-delivery-btn">
          {isOnline ? 'Go Offline' : 'Go Online'}
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
              suffix={todayStats.earnings > 0 ? <ArrowUpOutlined style={{ color: '#10B981', fontSize: 14 }} /> : null}
              valueStyle={{ color: '#10B981', fontWeight: 700 }}
            />
            <div className="stat-footer">
              <Text type="secondary">Fare + 100% tips</Text>
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
              <Text type="secondary">Today's completed</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card blue">
            <Statistic
              title="Hours Online"
              value={todayStats.hours_online}
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
              value={todayStats.acceptance_rate}
              suffix="%"
              prefix={<StarOutlined style={{ marginRight: 8 }} />}
              valueStyle={{ color: '#F59E0B', fontWeight: 700 }}
            />
            <div className="stat-footer">
              <Text type="secondary">{todayStats.acceptance_rate >= 90 ? 'Great job!' : 'Keep it up!'}</Text>
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
                      <Text strong>{activeDelivery?.restaurant}</Text>
                    </div>
                    <div className="detail-item">
                      <Text type="secondary">Customer</Text>
                      <Text strong>{activeDelivery?.customer}</Text>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item full">
                      <Text type="secondary"><EnvironmentOutlined /> Delivery Address</Text>
                      <Text strong>{activeDelivery?.address}</Text>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <Text type="secondary">Items</Text>
                      <Text strong>{activeDelivery?.items} items</Text>
                    </div>
                    <div className="detail-item">
                      <Text type="secondary">Distance</Text>
                      <Text strong>{activeDelivery?.distance}</Text>
                    </div>
                    <div className="detail-item">
                      <Text type="secondary">ETA</Text>
                      <Text strong>{activeDelivery?.estimated_time}</Text>
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

      {/* Platform Fee Info */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <Card className="fee-info-card">
            <div className="fee-info-content">
              <div className="fee-info-header">
                <DollarOutlined style={{ fontSize: 24, color: '#10B981' }} />
                <div>
                  <Text strong style={{ fontSize: 16 }}>Tiered Platform Fees</Text>
                  <Text type="secondary" style={{ display: 'block' }}>Platform fee deducted based on trip distance</Text>
                </div>
              </div>
              <div className="fee-tiers">
                <div className="fee-tier">
                  <Tag color="green">0-10 mi</Tag>
                  <Text strong>$1</Text>
                </div>
                <div className="fee-tier">
                  <Tag color="blue">10-20 mi</Tag>
                  <Text strong>$2</Text>
                </div>
                <div className="fee-tier">
                  <Tag color="purple">20+ mi</Tag>
                  <Text strong>$3</Text>
                </div>
              </div>
              <Text type="secondary" style={{ marginTop: 8, display: 'block', fontSize: 12 }}>
                You receive: Ride fare - platform fee + 100% of tips
              </Text>
            </div>
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
                    <Text strong>{weeklyStats.deliveries.current} / {weeklyStats.deliveries.goal}</Text>
                  </div>
                  <Progress
                    percent={Math.round((weeklyStats.deliveries.current / weeklyStats.deliveries.goal) * 100)}
                    strokeColor="#10B981"
                  />
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="progress-item">
                  <div className="progress-header">
                    <Text>Earnings Goal</Text>
                    <Text strong>${weeklyStats.earnings.current} / ${weeklyStats.earnings.goal}</Text>
                  </div>
                  <Progress
                    percent={Math.round((weeklyStats.earnings.current / weeklyStats.earnings.goal) * 100)}
                    strokeColor="#6366F1"
                  />
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="progress-item">
                  <div className="progress-header">
                    <Text>Hours Goal</Text>
                    <Text strong>{weeklyStats.hours.current} / {weeklyStats.hours.goal} hrs</Text>
                  </div>
                  <Progress
                    percent={Math.round((weeklyStats.hours.current / weeklyStats.hours.goal) * 100)}
                    strokeColor="#F59E0B"
                  />
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
        .fee-info-card {
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .fee-info-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fee-info-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .fee-tiers {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .fee-tier {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
};

export default DriverDashboard;
