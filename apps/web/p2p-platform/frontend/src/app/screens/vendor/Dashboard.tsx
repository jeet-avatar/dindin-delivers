import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Timeline, message } from 'antd';
import { DollarOutlined, ShoppingOutlined, ClockCircleOutlined, CheckCircleOutlined, BellOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getApiUrl } from '../../api/api';

const API_URL = getApiUrl();

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  items: any[];
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

const VendorDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    completedToday: 0
  });

  const vendorId = 1; // Get from auth context

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/orders?vendor_id=${vendorId}`);
      const vendorOrders = response.data;
      setOrders(vendorOrders);
      calculateStats(vendorOrders);
    } catch (error) {
      message.error('Failed to fetch orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const today = moment().startOf('day');
    const todayOrders = ordersData.filter(o => moment(o.created_at).isAfter(today));
    
    setStats({
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders
        .filter(o => o.payment_status === 'succeeded')
        .reduce((sum, o) => sum + o.total_amount, 0),
      pendingOrders: ordersData.filter(o => 
        o.status === 'confirmed' || o.status === 'preparing'
      ).length,
      completedToday: todayOrders.filter(o => o.status === 'delivered').length
    });
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      await axios.patch(`${API_URL}/api/orders/${orderId}/status`, {
        status: newStatus
      });
      message.success('Order status updated');
      fetchOrders();
    } catch (error) {
      message.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'confirmed': 'blue',
      'preparing': 'orange',
      'out_for_delivery': 'purple',
      'delivered': 'green'
    };
    return colors[status] || 'default';
  };

  const pendingOrders = orders.filter(o => 
    o.status === 'confirmed' || o.status === 'preparing' || o.status === 'out_for_delivery'
  );

  const recentOrders = orders.slice(0, 10);

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name'
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: any[]) => items.length
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `$${amount.toFixed(2)}`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => moment(date).format('HH:mm')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Order) => {
        if (record.status === 'confirmed') {
          return (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleUpdateStatus(record.id, 'preparing')}
            >
              Start Preparing
            </Button>
          );
        }
        if (record.status === 'preparing') {
          return (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleUpdateStatus(record.id, 'out_for_delivery')}
            >
              Ready for Pickup
            </Button>
          );
        }
        return null;
      }
    }
  ];

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Button icon={<BellOutlined />}>
          Notifications
        </Button>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card>
            <Statistic
              title="Today's Orders"
              value={stats.todayOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Today's Revenue"
              value={stats.todayRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats.pendingOrders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Today"
              value={stats.completedToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Active Orders */}
      <Card title="Active Orders" className="orders-card">
        {pendingOrders.length === 0 ? (
          <div className="empty-state">
            <CheckCircleOutlined className="empty-icon" />
            <p>No pending orders. You're all caught up!</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={pendingOrders}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        )}
      </Card>

      {/* Recent Orders */}
      <Card title="Recent Orders" className="orders-card">
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <style>{`
        .vendor-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .dashboard-header h1 {
          margin: 0;
          font-size: 28px;
        }
        .stats-row {
          margin-bottom: 24px;
        }
        .orders-card {
          margin-bottom: 24px;
        }
        .empty-state {
          text-align: center;
          padding: 48px 0;
        }
        .empty-icon {
          font-size: 64px;
          color: #52c41a;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};

export default VendorDashboard;
