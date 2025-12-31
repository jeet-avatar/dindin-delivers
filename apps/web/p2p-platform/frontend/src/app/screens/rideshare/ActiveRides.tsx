import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Statistic, Row, Col, Button, message, Progress, Badge } from 'antd';
import { CarOutlined, UserOutlined, EnvironmentOutlined, SyncOutlined, PhoneOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../../api/api';

interface ActiveRide {
  id: number;
  customer_name: string;
  customer_phone: string;
  driver_name: string;
  driver_phone: string;
  driver_id: number;
  pickup_address: string;
  dropoff_address: string;
  distance_miles: number;
  final_price: number;
  platform_fee: number;
  status: string;
  started_at: string;
  estimated_arrival: string;
  progress_percent: number;
  driver_lat?: number;
  driver_lng?: number;
}

const ActiveRides: React.FC = () => {
  const [rides, setRides] = useState<ActiveRide[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    activeCount: 0,
    driversOnline: 0,
    avgRideTime: 0,
    totalFaresInProgress: 0
  });

  useEffect(() => {
    fetchActiveRides();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveRides, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveRides = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/rideshare/active');
      setRides(response.data.rides || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Failed to fetch active rides:', error);
      // Use mock data for now
      setRides([]);
      message.info('Active rides API endpoint not yet configured');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'matched':
        return <Tag color="blue">Driver Matched</Tag>;
      case 'in_progress':
        return <Tag color="purple">In Progress</Tag>;
      default:
        return <Tag>{status?.replace('_', ' ').toUpperCase()}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Ride',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => (
        <Badge status="processing" text={<span style={{ fontWeight: 600 }}>#{id}</span>} />
      )
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 180,
      render: (_: any, record: ActiveRide) => (
        <div>
          <div><UserOutlined style={{ marginRight: 4 }} />{record.customer_name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            <PhoneOutlined style={{ marginRight: 4 }} />{record.customer_phone}
          </div>
        </div>
      )
    },
    {
      title: 'Driver',
      key: 'driver',
      width: 180,
      render: (_: any, record: ActiveRide) => (
        <div>
          <div><CarOutlined style={{ marginRight: 4 }} />{record.driver_name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            <PhoneOutlined style={{ marginRight: 4 }} />{record.driver_phone}
          </div>
        </div>
      )
    },
    {
      title: 'Route',
      key: 'route',
      width: 250,
      render: (_: any, record: ActiveRide) => (
        <div style={{ fontSize: 12 }}>
          <div><EnvironmentOutlined style={{ color: '#52c41a', marginRight: 4 }} />{record.pickup_address}</div>
          <div style={{ marginTop: 4 }}><EnvironmentOutlined style={{ color: '#f5222d', marginRight: 4 }} />{record.dropoff_address}</div>
        </div>
      )
    },
    {
      title: 'Distance',
      dataIndex: 'distance_miles',
      key: 'distance',
      width: 90,
      render: (miles: number) => `${miles?.toFixed(1) || 0} mi`
    },
    {
      title: 'Fare',
      dataIndex: 'final_price',
      key: 'fare',
      width: 100,
      render: (price: number) => <span style={{ fontWeight: 600 }}>${price?.toFixed(2) || '0.00'}</span>
    },
    {
      title: 'Platform Fee',
      dataIndex: 'platform_fee',
      key: 'platform_fee',
      width: 100,
      render: (fee: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>${fee?.toFixed(2) || '0.00'}</span>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Progress',
      dataIndex: 'progress_percent',
      key: 'progress',
      width: 120,
      render: (percent: number) => (
        <Progress percent={percent || 0} size="small" status="active" />
      )
    },
    {
      title: 'Started',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 100,
      render: (date: string) => date ? moment(date).format('HH:mm') : '-'
    },
    {
      title: 'ETA',
      dataIndex: 'estimated_arrival',
      key: 'eta',
      width: 100,
      render: (date: string) => date ? moment(date).format('HH:mm') : '-'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>
          <Badge status="processing" />
          <span style={{ marginLeft: 8 }}>Active Rides</span>
        </h2>
        <Button
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={fetchActiveRides}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Rides"
              value={stats.activeCount || rides.length}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Drivers Online"
              value={stats.driversOnline || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg. Ride Time"
              value={stats.avgRideTime || 0}
              suffix="min"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Fares In Progress"
              value={stats.totalFaresInProgress || rides.reduce((sum, r) => sum + (r.final_price || 0), 0)}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Real-time indicator */}
      {rides.length > 0 && (
        <Card style={{ marginBottom: 16, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge status="processing" />
            <span>Real-time updates every 30 seconds. Last updated: {moment().format('HH:mm:ss')}</span>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {rides.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <CarOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
          <h3 style={{ color: '#999' }}>No Active Rides</h3>
          <p style={{ color: '#bbb' }}>When rides are in progress, they will appear here in real-time.</p>
        </Card>
      )}

      {/* Active Rides Table */}
      {rides.length > 0 && (
        <Card>
          <Table
            columns={columns}
            dataSource={rides}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1500 }}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
};

export default ActiveRides;
