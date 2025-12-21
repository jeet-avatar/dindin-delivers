import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Select, Table, Progress, Button, Tag, Divider, Spin } from 'antd';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CarOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  BankOutlined,
  CalendarOutlined,
  DownloadOutlined,
  RightOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDriverEarnings, getCurrentDriverId, DriverEarningsData } from '../../api/api';
import { pricing } from '../../config/brand';

const { Title, Text } = Typography;

/**
 * Earnings Screen - Aligned with iOS DriverEarningsView.swift
 */

const DriverEarnings: React.FC = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<DriverEarningsData | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const driverId = getCurrentDriverId();
      if (driverId) {
        const data = await getDriverEarnings(driverId, period);
        setEarningsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      setEarningsData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !earningsData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 16 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary">Loading earnings...</Text>
      </div>
    );
  }

  const percentChange = ((earningsData.total - earningsData.previous_period) / earningsData.previous_period * 100).toFixed(1);
  const isPositive = earningsData.total > earningsData.previous_period;

  const columns: ColumnsType<typeof earningsData.payment_history[0]> = [
    {
      title: 'Payment ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text strong style={{ color: '#6366F1' }}>{id}</Text>
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => <Text strong style={{ color: '#10B981' }}>${amount.toFixed(2)}</Text>
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method) => (
        <span><BankOutlined style={{ marginRight: 8 }} />{method}</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: () => <Tag color="success">Completed</Tag>
    }
  ];

  return (
    <div className="driver-earnings">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Earnings</Title>
          <Text type="secondary">Track your income and payment history</Text>
        </div>
        <div className="header-actions">
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 150 }}
            options={[
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'year', label: 'This Year' }
            ]}
          />
          <Button icon={<DownloadOutlined />}>Export</Button>
        </div>
      </div>

      {/* Main Earnings Card */}
      <Card className="main-earnings-card">
        <Row gutter={[40, 24]}>
          <Col xs={24} md={12}>
            <div className="total-earnings">
              <Text type="secondary">Total Earnings</Text>
              <div className="earnings-amount">
                <Title level={1} style={{ margin: 0, color: '#10B981' }}>
                  ${earningsData.total.toFixed(2)}
                </Title>
                <Tag color={isPositive ? 'success' : 'error'} className="change-tag">
                  {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {percentChange}%
                </Tag>
              </div>
              <Text type="secondary">vs. last {period}: ${earningsData.previous_period.toFixed(2)}</Text>
            </div>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div className="earnings-breakdown">
                  <Text type="secondary">Base Pay</Text>
                  <Text strong style={{ fontSize: 18 }}>${earningsData.base_pay.toFixed(2)}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="earnings-breakdown">
                  <Text type="secondary">Tips (100% yours)</Text>
                  <Text strong style={{ fontSize: 18, color: '#6366F1' }}>${earningsData.tips.toFixed(2)}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="earnings-breakdown">
                  <Text type="secondary">Bonuses</Text>
                  <Text strong style={{ fontSize: 18, color: '#F59E0B' }}>${earningsData.bonuses.toFixed(2)}</Text>
                </div>
              </Col>
            </Row>

            <Divider />

            <div className="fee-structure">
              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>Platform Fee Structure</Text>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ color: '#10B981', fontSize: 12 }}>Food Delivery: </Text>
                <Tag color="green">$0 (FREE - keep 100%)</Tag>
              </div>
              <div>
                <Text strong style={{ color: '#6366F1', fontSize: 12 }}>Rideshare (by fare): </Text>
                <Tag color="green">≤${pricing.rideshare.tier1MaxFare}: ${pricing.rideshare.tier1Fee}</Tag>
                <Tag color="blue">${pricing.rideshare.tier1MaxFare}-${pricing.rideshare.tier2MaxFare}: ${pricing.rideshare.tier2Fee}</Tag>
                <Tag color="purple">${pricing.rideshare.tier2MaxFare}+: ${pricing.rideshare.tier3Fee}</Tag>
              </div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card className="mini-stat-card">
                  <Statistic
                    title="Deliveries"
                    value={earningsData.deliveries}
                    prefix={<CarOutlined />}
                    valueStyle={{ color: '#6366F1' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card className="mini-stat-card">
                  <Statistic
                    title="Hours Online"
                    value={earningsData.hours_online}
                    precision={1}
                    suffix="hrs"
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#3B82F6' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card className="mini-stat-card">
                  <Statistic
                    title="Avg/Delivery"
                    value={earningsData.avg_per_delivery}
                    precision={2}
                    prefix="$"
                    valueStyle={{ color: '#10B981' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card className="mini-stat-card">
                  <Statistic
                    title="Hourly Rate"
                    value={(earningsData.total / earningsData.hours_online).toFixed(2)}
                    prefix="$"
                    suffix="/hr"
                    valueStyle={{ color: '#F59E0B' }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Daily Breakdown */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <span><CalendarOutlined /> Daily Breakdown</span>
            }
            className="breakdown-card"
          >
            <div className="daily-breakdown">
              {earningsData.daily_breakdown.map((day, index) => (
                <div key={index} className="day-row">
                  <div className="day-info">
                    <Text strong>{day.day}</Text>
                    <Text type="secondary">{day.deliveries} deliveries • {day.hours}hrs</Text>
                  </div>
                  <div className="day-earnings">
                    <Text strong style={{ color: '#10B981' }}>${day.earnings.toFixed(2)}</Text>
                  </div>
                  <div className="day-progress">
                    <Progress
                      percent={(day.earnings / 150) * 100}
                      showInfo={false}
                      strokeColor="#10B981"
                      trailColor="#e2e8f0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Bonuses & Promotions */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <span><GiftOutlined /> Active Promotions</span>
            }
            className="promotions-card"
          >
            <div className="promotion-item active">
              <div className="promo-icon">
                <GiftOutlined />
              </div>
              <div className="promo-content">
                <Text strong>Peak Hour Bonus</Text>
                <Text type="secondary">Earn +$2 per delivery during 5-8 PM</Text>
                <Tag color="green">Active Now</Tag>
              </div>
            </div>
            <div className="promotion-item">
              <div className="promo-icon challenge">
                <CarOutlined />
              </div>
              <div className="promo-content">
                <Text strong>Weekly Challenge</Text>
                <Text type="secondary">Complete 50 deliveries for $50 bonus</Text>
                <Progress percent={96} size="small" />
                <Text type="secondary">48/50 completed</Text>
              </div>
            </div>
            <div className="promotion-item">
              <div className="promo-icon special">
                <DollarOutlined />
              </div>
              <div className="promo-content">
                <Text strong>Referral Bonus</Text>
                <Text type="secondary">Refer a driver, earn $100</Text>
                <Button type="link" style={{ padding: 0 }}>Share Link <RightOutlined /></Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Payment History */}
      <Card
        title={<span><BankOutlined /> Payment History</span>}
        className="payment-history-card"
        style={{ marginTop: 20 }}
        extra={<Button type="link">View All</Button>}
      >
        <Table
          columns={columns}
          dataSource={earningsData.payment_history}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <style>{`
        .driver-earnings {
          padding: 0;
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
          gap: 12px;
        }
        .main-earnings-card {
          border-radius: 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .total-earnings {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .earnings-amount {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .change-tag {
          font-size: 14px;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .earnings-breakdown {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mini-stat-card {
          border-radius: 12px;
          background: white;
        }
        .breakdown-card {
          border-radius: 16px;
        }
        .daily-breakdown {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .day-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
        }
        .day-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .day-earnings {
          width: 80px;
          text-align: right;
        }
        .day-progress {
          width: 120px;
        }
        .promotions-card {
          border-radius: 16px;
        }
        .promotion-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          background: #f8fafc;
          transition: all 0.3s;
        }
        .promotion-item.active {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .promotion-item:last-child {
          margin-bottom: 0;
        }
        .promo-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }
        .promo-icon.challenge {
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
        }
        .promo-icon.special {
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }
        .promo-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .payment-history-card {
          border-radius: 16px;
        }
      `}</style>
    </div>
  );
};

export default DriverEarnings;
