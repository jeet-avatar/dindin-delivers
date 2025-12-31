import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, Button, Space, Card, Statistic, Row, Col, message, Tooltip } from 'antd';
import { SearchOutlined, CarOutlined, DollarOutlined, ClockCircleOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../../api/api';

const { Option } = Select;

interface RideRequest {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_miles: number;
  estimated_fare: number;
  final_price: number;
  platform_fee: number;
  status: string;
  driver_id?: number;
  driver_name?: string;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
}

const RideRequests: React.FC = () => {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    activeRides: 0,
    completedRides: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchRides();
  }, [statusFilter]);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/admin/rideshare/requests', { params });
      setRides(response.data.rides || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Failed to fetch rides:', error);
      // Use mock data for now if endpoint doesn't exist
      setRides([]);
      message.info('Rideshare API endpoint not yet configured');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'open': 'orange',
      'bidding': 'blue',
      'matched': 'cyan',
      'in_progress': 'purple',
      'completed': 'green',
      'cancelled': 'red',
      'expired': 'default'
    };
    return statusColors[status] || 'default';
  };

  const getPlatformFee = (distance: number): number => {
    // Tiered pricing: $1 (0-10mi), $2 (10-20mi), $3 (20+mi)
    if (distance <= 10) return 2; // $1 from each side
    if (distance <= 20) return 4; // $2 from each side
    return 6; // $3 from each side
  };

  const columns = [
    {
      title: 'Ride ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <span style={{ fontWeight: 600 }}>#{id}</span>
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 150,
      render: (name: string, record: RideRequest) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.customer_phone}</div>
        </div>
      )
    },
    {
      title: 'Pickup',
      dataIndex: 'pickup_address',
      key: 'pickup_address',
      width: 200,
      ellipsis: true,
      render: (addr: string) => (
        <Tooltip title={addr}>
          <span>{addr}</span>
        </Tooltip>
      )
    },
    {
      title: 'Dropoff',
      dataIndex: 'dropoff_address',
      key: 'dropoff_address',
      width: 200,
      ellipsis: true,
      render: (addr: string) => (
        <Tooltip title={addr}>
          <span>{addr}</span>
        </Tooltip>
      )
    },
    {
      title: 'Distance',
      dataIndex: 'distance_miles',
      key: 'distance_miles',
      width: 100,
      render: (miles: number) => `${miles?.toFixed(1) || 0} mi`,
      sorter: (a: RideRequest, b: RideRequest) => (a.distance_miles || 0) - (b.distance_miles || 0)
    },
    {
      title: 'Est. Fare',
      dataIndex: 'estimated_fare',
      key: 'estimated_fare',
      width: 100,
      render: (fare: number) => <span style={{ color: '#1890ff' }}>${fare?.toFixed(2) || '0.00'}</span>
    },
    {
      title: 'Platform Fee',
      dataIndex: 'platform_fee',
      key: 'platform_fee',
      width: 110,
      render: (_: any, record: RideRequest) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>
          ${record.platform_fee?.toFixed(2) || getPlatformFee(record.distance_miles || 0).toFixed(2)}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
        </Tag>
      )
    },
    {
      title: 'Driver',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 130,
      render: (name: string) => name || <span style={{ color: '#999' }}>Not assigned</span>
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => date ? moment(date).format('MMM DD, HH:mm') : '-',
      sorter: (a: RideRequest, b: RideRequest) =>
        moment(a.created_at).unix() - moment(b.created_at).unix()
    }
  ];

  const filteredRides = rides.filter(ride => {
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        ride.customer_name?.toLowerCase().includes(search) ||
        ride.pickup_address?.toLowerCase().includes(search) ||
        ride.dropoff_address?.toLowerCase().includes(search) ||
        String(ride.id).includes(search)
      );
    }
    return true;
  });

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: 24 }}>
        <CarOutlined style={{ marginRight: 8 }} />
        Ride Requests
      </h2>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={5}>
          <Card>
            <Statistic
              title="Total Requests"
              value={stats.totalRequests || rides.length}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pendingRequests || rides.filter(r => r.status === 'pending').length}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Active Rides"
              value={stats.activeRides || rides.filter(r => r.status === 'in_progress').length}
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completedRides || rides.filter(r => r.status === 'completed').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Platform Revenue"
              value={stats.totalRevenue || 0}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Info Banner */}
      <Card style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
          <div>
            <strong>Platform Fee Structure (Tiered by Distance):</strong>
            <div style={{ color: '#666', marginTop: 4 }}>
              0-10 miles: $1 × 2 = $2 | 10-20 miles: $2 × 2 = $4 | 20+ miles: $3 × 2 = $6
              <span style={{ marginLeft: 8, color: '#999' }}>(Fee charged to both customer and driver)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Input
            placeholder="Search rides..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Select
            style={{ width: 180 }}
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All Statuses</Option>
            <Option value="open">Open (Waiting for Bids)</Option>
            <Option value="bidding">Bidding (Has Bids)</Option>
            <Option value="matched">Matched</Option>
            <Option value="in_progress">In Progress</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
            <Option value="expired">Expired</Option>
          </Select>

          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={fetchRides}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Rides Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredRides}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} ride requests`
          }}
        />
      </Card>
    </div>
  );
};

export default RideRequests;
