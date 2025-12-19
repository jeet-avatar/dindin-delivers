import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, DatePicker, Button, Divider, Typography, Spin } from 'antd';
import {
  DollarOutlined,
  CarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  TeamOutlined,
  SyncOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface RevenueData {
  food_delivery: {
    total_orders: number;
    customer_fees: number;  // $1 per order
    restaurant_fees: number;  // $1 per order
    total_revenue: number;
  };
  rideshare: {
    total_rides: number;
    customer_fees: number;  // Tiered
    driver_fees: number;  // Tiered
    total_revenue: number;
    by_tier: {
      short: { count: number; revenue: number };  // 0-10 mi
      medium: { count: number; revenue: number };  // 10-20 mi
      long: { count: number; revenue: number };  // 20+ mi
    };
  };
  total_platform_revenue: number;
}

const PlatformRevenue: React.FC = () => {
  const API_URL = getApiUrl();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<any>([
    moment().subtract(30, 'days'),
    moment()
  ]);

  // Mock data - in production this would come from API
  const [revenueData, setRevenueData] = useState<RevenueData>({
    food_delivery: {
      total_orders: 1250,
      customer_fees: 1250,  // $1 × 1250
      restaurant_fees: 1250,  // $1 × 1250
      total_revenue: 2500
    },
    rideshare: {
      total_rides: 850,
      customer_fees: 1350,  // Mixed tiers
      driver_fees: 1350,  // Same as customer
      total_revenue: 2700,
      by_tier: {
        short: { count: 500, revenue: 1000 },  // 500 rides × $1 × 2 sides
        medium: { count: 250, revenue: 1000 },  // 250 rides × $2 × 2 sides
        long: { count: 100, revenue: 600 }  // 100 rides × $3 × 2 sides
      }
    },
    total_platform_revenue: 5200
  });

  const tierData = [
    {
      key: 'short',
      tier: '0-10 miles',
      fee: '$1',
      rides: revenueData.rideshare.by_tier.short.count,
      revenue: revenueData.rideshare.by_tier.short.revenue
    },
    {
      key: 'medium',
      tier: '10-20 miles',
      fee: '$2',
      rides: revenueData.rideshare.by_tier.medium.count,
      revenue: revenueData.rideshare.by_tier.medium.revenue
    },
    {
      key: 'long',
      tier: '20+ miles',
      fee: '$3',
      rides: revenueData.rideshare.by_tier.long.count,
      revenue: revenueData.rideshare.by_tier.long.revenue
    }
  ];

  const tierColumns = [
    {
      title: 'Distance Tier',
      dataIndex: 'tier',
      key: 'tier',
      render: (text: string, record: any) => (
        <Tag color={record.key === 'short' ? 'green' : record.key === 'medium' ? 'blue' : 'purple'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Platform Fee',
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: string) => <Text strong>{fee} per side</Text>
    },
    {
      title: 'Total Rides',
      dataIndex: 'rides',
      key: 'rides',
      align: 'center' as const
    },
    {
      title: 'Platform Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right' as const,
      render: (amount: number) => <Text strong style={{ color: '#52c41a' }}>${amount.toFixed(2)}</Text>
    }
  ];

  const refreshData = async () => {
    setLoading(true);
    try {
      // In production, call API endpoint
      // const response = await axios.get(`${API_URL}/api/accounting/platform-revenue`, {
      //   params: { start: dateRange[0].toISOString(), end: dateRange[1].toISOString() }
      // });
      // setRevenueData(response.data);

      // For now, use mock data with some randomization
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRevenueData(prev => ({
        ...prev,
        total_platform_revenue: prev.food_delivery.total_revenue + prev.rideshare.total_revenue
      }));
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-revenue-container">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Platform Revenue</Title>
          <Text type="secondary">Track revenue from platform fees (Food Delivery + Rideshare)</Text>
        </div>
        <div className="header-actions">
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ marginRight: 16 }}
          />
          <Button type="primary" icon={<SyncOutlined spin={loading} />} onClick={refreshData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card className="revenue-card total">
            <Statistic
              title="Total Platform Revenue"
              value={revenueData.total_platform_revenue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 32 }}
            />
            <div className="card-footer">
              <Text type="secondary">Combined from all services</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="revenue-card food">
            <Statistic
              title="Food Delivery Revenue"
              value={revenueData.food_delivery.total_revenue}
              precision={2}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="card-footer">
              <Text type="secondary">{revenueData.food_delivery.total_orders} orders × $2 ($1 customer + $1 restaurant)</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="revenue-card ride">
            <Statistic
              title="Rideshare Revenue"
              value={revenueData.rideshare.total_revenue}
              precision={2}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="card-footer">
              <Text type="secondary">{revenueData.rideshare.total_rides} rides (tiered pricing)</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Detailed Breakdown */}
      <Row gutter={[24, 24]}>
        {/* Food Delivery Breakdown */}
        <Col xs={24} lg={12}>
          <Card title={<span><ShoppingOutlined /> Food Delivery Breakdown</span>} className="breakdown-card">
            <div className="fee-structure">
              <div className="fee-row">
                <div className="fee-label">
                  <Tag color="blue">Customer Fee</Tag>
                  <Text>$1 per order (flat)</Text>
                </div>
                <Text strong style={{ color: '#1890ff' }}>
                  ${revenueData.food_delivery.customer_fees.toFixed(2)}
                </Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="fee-row">
                <div className="fee-label">
                  <Tag color="orange">Restaurant Fee</Tag>
                  <Text>$1 per order (flat)</Text>
                </div>
                <Text strong style={{ color: '#fa8c16' }}>
                  ${revenueData.food_delivery.restaurant_fees.toFixed(2)}
                </Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="fee-row total">
                <Text strong>Total Food Delivery Revenue</Text>
                <Text strong style={{ color: '#52c41a', fontSize: 18 }}>
                  ${revenueData.food_delivery.total_revenue.toFixed(2)}
                </Text>
              </div>
            </div>

            <div className="info-box" style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Food delivery uses a flat $1+$1 model: $1 from customer + $1 from restaurant = $2 platform revenue per order
              </Text>
            </div>
          </Card>
        </Col>

        {/* Rideshare Tiered Breakdown */}
        <Col xs={24} lg={12}>
          <Card title={<span><CarOutlined /> Rideshare Tiered Breakdown</span>} className="breakdown-card">
            <Table
              columns={tierColumns}
              dataSource={tierData}
              pagination={false}
              size="small"
            />

            <Divider style={{ margin: '16px 0' }} />

            <div className="fee-row total">
              <Text strong>Total Rideshare Revenue</Text>
              <Text strong style={{ color: '#52c41a', fontSize: 18 }}>
                ${revenueData.rideshare.total_revenue.toFixed(2)}
              </Text>
            </div>

            <div className="info-box" style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Rideshare uses tiered pricing: Both customer and driver pay the same tier-based fee.
                Platform earns 2× the tier fee per ride.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Pricing Reference */}
      <Card title="Pricing Reference" style={{ marginTop: 24 }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <div className="pricing-section">
              <Title level={5}><ShoppingOutlined /> Food Delivery</Title>
              <ul>
                <li><strong>Customer:</strong> $1 matchmaking fee per order</li>
                <li><strong>Restaurant:</strong> $1 platform fee per order</li>
                <li><strong>Driver:</strong> $0 (no platform fee, keeps 100% of delivery + tips)</li>
                <li><strong>Platform Revenue:</strong> $2 per order</li>
              </ul>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="pricing-section">
              <Title level={5}><CarOutlined /> Rideshare (Tiered by Distance)</Title>
              <ul>
                <li><strong>0-10 miles:</strong> $1 from customer + $1 from driver = $2</li>
                <li><strong>10-20 miles:</strong> $2 from customer + $2 from driver = $4</li>
                <li><strong>20+ miles:</strong> $3 from customer + $3 from driver = $6</li>
                <li><strong>Tips:</strong> 100% go to driver</li>
              </ul>
            </div>
          </Col>
        </Row>
      </Card>

      <style>{`
        .platform-revenue-container {
          padding: 24px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .header-actions {
          display: flex;
          align-items: center;
        }
        .revenue-card {
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .revenue-card.total {
          background: linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.1) 100%);
          border: 1px solid rgba(82, 196, 26, 0.2);
        }
        .revenue-card.food {
          background: linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.1) 100%);
          border: 1px solid rgba(24, 144, 255, 0.2);
        }
        .revenue-card.ride {
          background: linear-gradient(135deg, rgba(114, 46, 209, 0.05) 0%, rgba(114, 46, 209, 0.1) 100%);
          border: 1px solid rgba(114, 46, 209, 0.2);
        }
        .card-footer {
          margin-top: 8px;
        }
        .breakdown-card {
          border-radius: 16px;
          height: 100%;
        }
        .fee-structure {
          padding: 8px 0;
        }
        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }
        .fee-row.total {
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
          margin-top: 8px;
        }
        .fee-label {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .info-box {
          padding: 12px;
          background: #f6ffed;
          border-radius: 8px;
          border: 1px solid #b7eb8f;
        }
        .pricing-section {
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
        }
        .pricing-section ul {
          margin: 0;
          padding-left: 20px;
        }
        .pricing-section li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
};

export default PlatformRevenue;
