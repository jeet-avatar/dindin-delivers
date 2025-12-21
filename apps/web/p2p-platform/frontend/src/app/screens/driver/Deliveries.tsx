import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Input, DatePicker, Select, Row, Col, Typography, Tabs, Statistic, Avatar, Spin } from 'antd';
import {
  SearchOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  FilterOutlined,
  EyeOutlined,
  StarOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDriverDeliveries, getCurrentDriverId, DriverDelivery } from '../../api/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * Deliveries History Screen - Aligned with iOS MyDeliveriesView.swift
 */

const DriverDeliveries: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<DriverDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DriverDelivery | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const driverId = getCurrentDriverId();
      if (driverId) {
        const data = await getDriverDeliveries(driverId);
        setDeliveries(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">Completed</Tag>;
      case 'in_progress':
        return <Tag icon={<ClockCircleOutlined />} color="processing">In Progress</Tag>;
      case 'cancelled':
        return <Tag color="error">Cancelled</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns: ColumnsType<DriverDelivery> = [
    {
      title: 'Order ID',
      dataIndex: 'order_id',
      key: 'order_id',
      render: (id) => <Text strong style={{ color: '#6366F1' }}>#{id}</Text>
    },
    {
      title: 'Restaurant',
      dataIndex: 'restaurant_name',
      key: 'restaurant_name',
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ background: '#10B981' }}>{name[0]}</Avatar>
          <Text strong>{name}</Text>
        </div>
      )
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name'
    },
    {
      title: 'Distance',
      dataIndex: 'distance',
      key: 'distance',
      render: (dist) => (
        <span><EnvironmentOutlined style={{ color: '#6366F1' }} /> {dist}</span>
      )
    },
    {
      title: 'Payout',
      dataIndex: 'payout',
      key: 'payout',
      render: (amount, record) => (
        <div>
          <Text strong style={{ color: '#10B981' }}>${amount.toFixed(2)}</Text>
          {record.tip && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>+${record.tip.toFixed(2)} tip</Text>}
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date, record) => (
        <div>
          <Text>{date}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{record.time}</Text>
        </div>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating) => rating ? (
        <span style={{ color: '#F59E0B' }}>
          <StarOutlined /> {rating}.0
        </span>
      ) : '-'
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => setSelectedDelivery(record)}
        >
          View
        </Button>
      )
    }
  ];

  const getFilteredDeliveries = () => {
    if (activeTab === 'all') return deliveries;
    return deliveries.filter(d => d.status === activeTab);
  };

  const filteredDeliveries = getFilteredDeliveries();
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');
  const totalEarnings = completedDeliveries.reduce((sum, d) => sum + d.payout + (d.tip || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 16 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary">Loading deliveries...</Text>
      </div>
    );
  }

  return (
    <div className="driver-deliveries">
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>My Deliveries</Title>
          <Text type="secondary">Track and manage your delivery history</Text>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Deliveries"
              value={deliveries.length}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#6366F1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Completed"
              value={completedDeliveries.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Earned"
              value={totalEarnings}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="filters-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Search deliveries..."
              prefix={<SearchOutlined />}
              size="large"
            />
          </Col>
          <Col xs={24} md={8}>
            <RangePicker size="large" style={{ width: '100%' }} />
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="Status"
              size="large"
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button icon={<FilterOutlined />} size="large" style={{ width: '100%' }}>
              More Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Deliveries Table */}
      <Card className="deliveries-table-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: 'All Deliveries' },
            { key: 'completed', label: 'Completed' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Table
          columns={columns}
          dataSource={filteredDeliveries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <style>{`
        .driver-deliveries {
          padding: 0;
        }
        .page-header {
          margin-bottom: 24px;
        }
        .stat-card {
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .filters-card {
          border-radius: 16px;
        }
        .deliveries-table-card {
          border-radius: 16px;
        }
        .ant-table {
          border-radius: 12px;
        }
        .ant-table-thead > tr > th {
          background: #f8fafc;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default DriverDeliveries;
