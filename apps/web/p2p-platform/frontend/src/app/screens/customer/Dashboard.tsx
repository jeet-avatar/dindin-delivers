import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Statistic, List, Avatar, Tag, Divider, Spin, message } from 'antd';
import {
  CarOutlined,
  HistoryOutlined,
  StarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  RightOutlined,
  GiftOutlined,
  SafetyOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text, Paragraph } = Typography;

interface RecentRide {
  id: string;
  pickup: string;
  dropoff: string;
  date: string;
  fare: number;
  driver_name: string;
  driver_rating: number;
  status: string;
}

interface QuickDestination {
  icon: string;
  label: string;
  address: string;
}

interface DashboardData {
  customer_name: string;
  customer_id: number;
  stats: {
    total_rides: number;
    total_spent: number;
    saved_amount: number;
  };
  recent_rides: RecentRide[];
  quick_destinations: QuickDestination[];
  loyalty: {
    points: number;
    tier: string;
  };
}

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState<string>('');
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalSpent: 0,
    savedAmount: 0
  });
  const [quickDestinations, setQuickDestinations] = useState<QuickDestination[]>([
    { icon: '🏠', label: 'Home', address: 'Set home address' },
    { icon: '💼', label: 'Work', address: 'Set work address' },
    { icon: '✈️', label: 'Airport', address: 'Nearest airport' },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('access_token');

      if (!token) {
        // Not logged in, use cached name or redirect
        const name = localStorage.getItem('customer_name') || 'there';
        setCustomerName(name);
        setLoading(false);
        return;
      }

      const response = await axios.get<DashboardData>(`${API_URL}/api/customer/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;

      setCustomerName(data.customer_name || 'there');
      setStats({
        totalRides: data.stats.total_rides,
        totalSpent: data.stats.total_spent,
        savedAmount: data.stats.saved_amount
      });
      setRecentRides(data.recent_rides);

      if (data.quick_destinations && data.quick_destinations.length > 0) {
        setQuickDestinations(data.quick_destinations);
      }

      // Cache the name for quick loading
      localStorage.setItem('customer_name', data.customer_name);

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);

      // Fallback to cached/default data
      const name = localStorage.getItem('customer_name') || 'there';
      setCustomerName(name);

      if (error.response?.status === 401) {
        message.warning('Session expired. Please log in again.');
        // Optionally redirect to login
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {/* Welcome Header */}
      <div className="welcome-section">
        <Title level={2}>Welcome back, {customerName}!</Title>
        <Text type="secondary">Where would you like to go today?</Text>
      </div>

      {/* Quick Book Section */}
      <Card className="quick-book-section" bordered={false}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={16}>
            <div className="book-ride-content">
              <CarOutlined className="book-icon" />
              <div className="book-text">
                <Title level={4} style={{ margin: 0, color: 'white' }}>Book a Ride</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Only $1 platform fee · Drivers keep 100% of fare
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/customer/ride')}
              style={{
                width: '100%',
                height: 48,
                background: 'white',
                color: DollorTheme.Brand.greenDark,
                fontWeight: 600,
                border: 'none'
              }}
            >
              Book Now <RightOutlined />
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Quick Destinations */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {quickDestinations.map((dest, index) => (
          <Col xs={8} key={index}>
            <Card
              className="destination-card"
              hoverable
              onClick={() => navigate('/customer/ride')}
            >
              <div className="destination-content">
                <span className="destination-icon">{dest.icon}</span>
                <Text strong>{dest.label}</Text>
                <Text type="secondary" className="destination-address">{dest.address}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Rides"
              value={stats.totalRides}
              prefix={<CarOutlined />}
              valueStyle={{ color: DollorTheme.Brand.green }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Spent"
              value={stats.totalSpent}
              prefix="$"
              precision={2}
              valueStyle={{ color: DollorTheme.Brand.purple }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="stat-card savings-card">
            <Statistic
              title="You've Saved"
              value={stats.savedAmount}
              prefix="$"
              precision={2}
              valueStyle={{ color: DollorTheme.Brand.greenDark }}
              suffix={<Tag color="green">vs. others</Tag>}
            />
          </Card>
        </Col>
      </Row>

      {/* Platform Benefits */}
      <Card className="benefits-card" style={{ marginTop: 24 }}>
        <Title level={5}>
          <DollarOutlined /> Why $ai Ride?
        </Title>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <div className="benefit-item">
              <DollarOutlined className="benefit-icon" />
              <div>
                <Text strong>Only $1 Fee</Text>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                  Flat platform fee, no surge pricing games
                </Paragraph>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="benefit-item">
              <SafetyOutlined className="benefit-icon" />
              <div>
                <Text strong>100% to Drivers</Text>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                  Drivers keep all fare + 100% of tips
                </Paragraph>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="benefit-item">
              <StarOutlined className="benefit-icon" />
              <div>
                <Text strong>Better Service</Text>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                  Happy drivers provide better rides
                </Paragraph>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Recent Rides */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryOutlined />
            <span>Recent Rides</span>
          </div>
        }
        extra={<Button type="link" onClick={() => navigate('/customer/history')}>View All</Button>}
        style={{ marginTop: 24 }}
      >
        {recentRides.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={recentRides}
            renderItem={(ride) => (
              <List.Item
                extra={
                  <div style={{ textAlign: 'right' }}>
                    <Text strong style={{ fontSize: 16 }}>${ride.fare.toFixed(2)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{ride.date}</Text>
                  </div>
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ background: DollorTheme.Brand.green }}>
                      <CarOutlined />
                    </Avatar>
                  }
                  title={
                    <div>
                      <EnvironmentOutlined style={{ color: DollorTheme.Brand.green }} /> {ride.pickup}
                      <br />
                      <EnvironmentOutlined style={{ color: DollorTheme.Status.error }} /> {ride.dropoff}
                    </div>
                  }
                  description={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text type="secondary">{ride.driver_name}</Text>
                      <Tag color="gold"><StarOutlined /> {ride.driver_rating}</Tag>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <CarOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              No rides yet. Book your first ride!
            </Paragraph>
            <Button type="primary" onClick={() => navigate('/customer/ride')}>
              Book a Ride
            </Button>
          </div>
        )}
      </Card>

      {/* Promo Banner */}
      <Card className="promo-banner" style={{ marginTop: 24 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <GiftOutlined style={{ fontSize: 32, color: '#fbbf24' }} />
          </Col>
          <Col flex="auto">
            <Text strong>Invite Friends, Earn $5!</Text>
            <br />
            <Text type="secondary">Share your referral code and earn credits</Text>
          </Col>
          <Col>
            <Button type="primary" ghost>Share Code</Button>
          </Col>
        </Row>
      </Card>

      <style>{`
        .customer-dashboard {
          max-width: 1200px;
        }
        .welcome-section {
          margin-bottom: 24px;
        }
        .quick-book-section {
          background: linear-gradient(135deg, ${DollorTheme.Brand.green} 0%, ${DollorTheme.Brand.greenDark} 100%);
          border-radius: 16px;
        }
        .book-ride-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .book-icon {
          font-size: 40px;
          color: white;
        }
        .destination-card {
          text-align: center;
          border-radius: 12px;
        }
        .destination-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .destination-icon {
          font-size: 28px;
        }
        .destination-address {
          font-size: 11px;
        }
        .stat-card {
          border-radius: 12px;
        }
        .savings-card {
          background: linear-gradient(135deg, ${DollorTheme.Status.successBg} 0%, ${DollorTheme.Status.successBg} 100%);
        }
        .benefits-card {
          background: linear-gradient(135deg, ${DollorTheme.Status.successBg} 0%, ${DollorTheme.Status.successBg} 100%);
          border-radius: 16px;
        }
        .benefit-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .benefit-icon {
          font-size: 24px;
          color: ${DollorTheme.Brand.green};
          margin-top: 2px;
        }
        .promo-banner {
          background: linear-gradient(135deg, ${DollorTheme.Status.warningBg} 0%, ${DollorTheme.Brand.goldLight} 100%);
          border-radius: 16px;
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
