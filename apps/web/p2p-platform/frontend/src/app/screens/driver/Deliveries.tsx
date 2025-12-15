import React, { useState } from 'react';
import { Card, Table, Tag, Button, Input, DatePicker, Select, Row, Col, Typography, Tabs, Statistic, Avatar, Timeline } from 'antd';
import {
  SearchOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  FilterOutlined,
  EyeOutlined,
  StarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface Delivery {
  id: string;
  restaurant: string;
  customer: string;
  address: string;
  items: number;
  total: number;
  payout: number;
  distance: string;
  status: 'completed' | 'in_progress' | 'cancelled';
  date: string;
  time: string;
  rating?: number;
  tip?: number;
}

const DriverDeliveries: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const deliveries: Delivery[] = [
    {
      id: 'DEL-2024-001',
      restaurant: 'Pasta Paradise',
      customer: 'John Smith',
      address: '123 Main Street, Apt 4B',
      items: 3,
      total: 42.50,
      payout: 9.50,
      distance: '2.3 mi',
      status: 'completed',
      date: '2024-01-15',
      time: '12:30 PM',
      rating: 5,
      tip: 5.00
    },
    {
      id: 'DEL-2024-002',
      restaurant: 'Burger Bliss',
      customer: 'Emily Davis',
      address: '456 Oak Avenue, Suite 201',
      items: 2,
      total: 28.00,
      payout: 7.25,
      distance: '1.8 mi',
      status: 'completed',
      date: '2024-01-15',
      time: '1:15 PM',
      rating: 4,
      tip: 3.00
    },
    {
      id: 'DEL-2024-003',
      restaurant: 'Sushi Supreme',
      customer: 'Michael Brown',
      address: '789 Pine Road',
      items: 5,
      total: 78.50,
      payout: 14.00,
      distance: '3.2 mi',
      status: 'in_progress',
      date: '2024-01-15',
      time: '2:00 PM'
    },
    {
      id: 'DEL-2024-004',
      restaurant: 'Taco Town',
      customer: 'Sarah Wilson',
      address: '321 Elm Street',
      items: 4,
      total: 35.00,
      payout: 8.00,
      distance: '2.1 mi',
      status: 'completed',
      date: '2024-01-14',
      time: '6:45 PM',
      rating: 5,
      tip: 6.00
    },
    {
      id: 'DEL-2024-005',
      restaurant: 'Pizza Palace',
      customer: 'James Taylor',
      address: '654 Maple Drive',
      items: 2,
      total: 32.00,
      payout: 7.50,
      distance: '1.5 mi',
      status: 'cancelled',
      date: '2024-01-14',
      time: '7:30 PM'
    }
  ];

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

  const columns: ColumnsType<Delivery> = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <Text strong style={{ color: '#6366F1' }}>{id}</Text>
    },
    {
      title: 'Restaurant',
      dataIndex: 'restaurant',
      key: 'restaurant',
      render: (name) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar style={{ background: '#10B981' }}>{name[0]}</Avatar>
          <Text strong>{name}</Text>
        </div>
      )
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer'
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

  const completedDeliveries = deliveries.filter(d => d.status === 'completed');
  const totalEarnings = completedDeliveries.reduce((sum, d) => sum + d.payout + (d.tip || 0), 0);

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
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="All Deliveries" key="all" />
          <TabPane tab="Completed" key="completed" />
          <TabPane tab="In Progress" key="in_progress" />
          <TabPane tab="Cancelled" key="cancelled" />
        </Tabs>
        <Table
          columns={columns}
          dataSource={activeTab === 'all' ? deliveries : deliveries.filter(d => d.status === activeTab)}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Delivery Detail Modal could go here */}

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
