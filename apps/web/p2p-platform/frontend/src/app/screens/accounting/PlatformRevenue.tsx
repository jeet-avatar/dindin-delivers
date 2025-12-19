import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Select, Button, Divider, Typography, Spin, message } from 'antd';
import {
  DollarOutlined,
  CarOutlined,
  ShoppingOutlined,
  SyncOutlined
} from '@ant-design/icons';
import api, { getApiUrl } from '../../api/api';
import moment from 'moment';

const { Title, Text } = Typography;

interface RevenueData {
  food_delivery: {
    total_orders: number;
    customer_fees: number;
    restaurant_fees: number;
    total_revenue: number;
  };
  rideshare: {
    total_rides: number;
    customer_fees: number;
    driver_fees: number;
    total_revenue: number;
    by_tier: {
      short: { count: number; revenue: number };
      medium: { count: number; revenue: number };
      long: { count: number; revenue: number };
    };
  };
  total_platform_revenue: number;
  summary?: {
    total_orders: number;
    completed_orders: number;
    total_gmv: number;
    platform_fees_collected: number;
    delivery_fees_collected: number;
    tips_collected: number;
  };
  driver_earnings?: {
    delivery_fees_to_drivers: number;
    tips_to_drivers: number;
    total_to_drivers: number;
  };
}

const PlatformRevenue: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('month');

  const [revenueData, setRevenueData] = useState<RevenueData>({
    food_delivery: {
      total_orders: 0,
      customer_fees: 0,
      restaurant_fees: 0,
      total_revenue: 0
    },
    rideshare: {
      total_rides: 0,
      customer_fees: 0,
      driver_fees: 0,
      total_revenue: 0,
      by_tier: {
        short: { count: 0, revenue: 0 },
        medium: { count: 0, revenue: 0 },
        long: { count: 0, revenue: 0 }
      }
    },
    total_platform_revenue: 0
  });

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/accounting/platform-revenue', {
        params: { period }
      });
      const data = response.data;

      // Map API response to component state
      setRevenueData({
        food_delivery: {
          total_orders: data.summary?.total_orders || 0,
          customer_fees: data.revenue_breakdown?.food_delivery?.customer_fees || 0,
          restaurant_fees: data.revenue_breakdown?.food_delivery?.restaurant_fees || 0,
          total_revenue: data.revenue_breakdown?.food_delivery?.total || 0
        },
        rideshare: {
          total_rides: 0, // TODO: Add rideshare data when available
          customer_fees: data.revenue_breakdown?.rideshare?.tier_1_under_35 || 0,
          driver_fees: 0,
          total_revenue: data.revenue_breakdown?.rideshare?.total || 0,
          by_tier: {
            short: { count: 0, revenue: data.revenue_breakdown?.rideshare?.tier_1_under_35 || 0 },
            medium: { count: 0, revenue: data.revenue_breakdown?.rideshare?.tier_2_35_70 || 0 },
            long: { count: 0, revenue: data.revenue_breakdown?.rideshare?.tier_3_over_70 || 0 }
          }
        },
        total_platform_revenue: data.revenue_breakdown?.total_platform_revenue || 0,
        summary: data.summary,
        driver_earnings: data.driver_earnings
      });
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      message.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

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

  return (
    <Spin spinning={loading}>
    <div className="platform-revenue-container">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Platform Revenue</Title>
          <Text type="secondary">Track revenue from platform fees (Food Delivery + Rideshare)</Text>
        </div>
        <div className="header-actions">
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 150, marginRight: 16 }}
            options={[
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'quarter', label: 'Last Quarter' },
              { value: 'year', label: 'Last Year' },
            ]}
          />
          <Button type="primary" icon={<SyncOutlined spin={loading} />} onClick={fetchRevenueData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* GMV & Driver Earnings Summary */}
      {revenueData.summary && (
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={6}>
            <Card size="small">
              <Statistic
                title="Total GMV"
                value={revenueData.summary.total_gmv}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={6}>
            <Card size="small">
              <Statistic
                title="Completed Orders"
                value={revenueData.summary.completed_orders}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={6}>
            <Card size="small">
              <Statistic
                title="Driver Earnings (Delivery)"
                value={revenueData.driver_earnings?.delivery_fees_to_drivers || 0}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={6}>
            <Card size="small">
              <Statistic
                title="Driver Earnings (Tips)"
                value={revenueData.driver_earnings?.tips_to_drivers || 0}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      )}

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
    </Spin>
  );
};

export default PlatformRevenue;
