import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { DollarOutlined, FileTextOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.dollor.ai';

interface DashboardStats {
  total_invoices: number;
  total_clients: number;
  total_revenue: number;
  paid_invoices: number;
}

interface RecentInvoice {
  id: number;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  status: string;
  issue_date: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch invoices and calculate stats from them
      const invoicesRes = await axios.get(`${API_URL}/api/invoices`, config);
      const allInvoices = invoicesRes.data;

      // Calculate stats
      const dashboardStats: DashboardStats = {
        total_invoices: allInvoices.length,
        total_clients: new Set(allInvoices.map((inv: any) => inv.client_id)).size,
        total_revenue: allInvoices.reduce((sum: number, inv: any) => sum + inv.total_amount, 0),
        paid_invoices: allInvoices.filter((inv: any) => inv.status === 'paid').length
      };

      setStats(dashboardStats);
      setRecentInvoices(allInvoices.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'success',
      sent: 'processing',
      draft: 'default',
      overdue: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'issue_date',
      key: 'issue_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>Dashboard</h1>
      
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Invoices"
              value={stats?.total_invoices || 0}
              prefix={<FileTextOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Clients"
              value={stats?.total_clients || 0}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats?.total_revenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Paid Invoices"
              value={stats?.paid_invoices || 0}
              prefix={<CheckCircleOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Invoices" style={{ marginTop: '24px' }}>
        <Table
          columns={columns}
          dataSource={recentInvoices}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
