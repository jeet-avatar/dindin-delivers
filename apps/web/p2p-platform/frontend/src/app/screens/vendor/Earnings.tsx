import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Button, Space, message } from 'antd';
import { DollarOutlined, ShoppingOutlined, RiseOutlined, DownloadOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import moment from 'moment';
import { getApiUrl, getCurrentVendorId } from '../../api/api';

const API_URL = getApiUrl();

const { RangePicker } = DatePicker;

interface Earning {
  date: string;
  orders: number;
  revenue: number;
  commission: number;
  net_earnings: number;
}

const VendorEarnings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<any>([
    moment().subtract(30, 'days'),
    moment()
  ]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    platformFees: 0,
    stripeFees: 0,
    netEarnings: 0,
    totalOrders: 0,
    avgOrderValue: 0
  });

  const vendorId = getCurrentVendorId();

  useEffect(() => {
    if (vendorId) {
      fetchEarnings();
    }
  }, [dateRange, vendorId]);

  const fetchEarnings = async () => {
    if (!vendorId) {
      message.error('Not authenticated. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      // Fetch orders for the date range
      const response = await axios.get(`${API_URL}/api/orders`, {
        params: {
          vendor_id: vendorId,
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD')
        }
      });
      
      const orders = response.data;
      
      // Calculate statistics
      const succeededOrders = orders.filter((o: any) => o.payment_status === 'succeeded');
      const totalRevenue = succeededOrders.reduce((sum: number, o: any) => sum + o.subtotal, 0);
      const platformFees = succeededOrders.reduce((sum: number, o: any) => sum + o.platform_fee, 0);
      const stripeFees = succeededOrders.reduce((sum: number, o: any) => 
        sum + (o.total_amount * 0.029 + 0.30), 0
      );
      
      setStats({
        totalRevenue,
        platformFees,
        stripeFees,
        netEarnings: totalRevenue - platformFees - stripeFees,
        totalOrders: succeededOrders.length,
        avgOrderValue: succeededOrders.length > 0 ? totalRevenue / succeededOrders.length : 0
      });

      // Group by date for chart
      const dailyEarnings: Record<string, Earning> = {};
      succeededOrders.forEach((order: any) => {
        const date = moment(order.created_at).format('YYYY-MM-DD');
        if (!dailyEarnings[date]) {
          dailyEarnings[date] = {
            date,
            orders: 0,
            revenue: 0,
            commission: 0,
            net_earnings: 0
          };
        }
        dailyEarnings[date].orders += 1;
        dailyEarnings[date].revenue += order.subtotal;
        dailyEarnings[date].commission += order.platform_fee;
        dailyEarnings[date].net_earnings += order.subtotal - order.platform_fee - (order.total_amount * 0.029 + 0.30);
      });

      setEarnings(Object.values(dailyEarnings).sort((a, b) => 
        moment(a.date).unix() - moment(b.date).unix()
      ));

    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (earnings.length === 0) {
      message.warning('No earnings data to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Orders', 'Revenue', 'Platform Fee', 'Stripe Fee (est)', 'Net Earnings'];
    const csvRows = [headers.join(',')];

    earnings.forEach(e => {
      const stripeFee = e.revenue * 0.029 + (e.orders * 0.30);
      const row = [
        moment(e.date).format('YYYY-MM-DD'),
        e.orders,
        e.revenue.toFixed(2),
        e.commission.toFixed(2),
        stripeFee.toFixed(2),
        e.net_earnings.toFixed(2)
      ];
      csvRows.push(row.join(','));
    });

    // Add summary row
    csvRows.push('');
    csvRows.push(`Summary,${stats.totalOrders},${stats.totalRevenue.toFixed(2)},${stats.platformFees.toFixed(2)},${stats.stripeFees.toFixed(2)},${stats.netEarnings.toFixed(2)}`);

    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `earnings_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success('Report exported successfully!');
  };

  const chartData = {
    labels: earnings.map(e => moment(e.date).format('MMM DD')),
    datasets: [
      {
        label: 'Revenue',
        data: earnings.map(e => e.revenue),
        borderColor: '#1890ff',
        backgroundColor: 'rgba(24, 144, 255, 0.1)',
        tension: 0.4
      },
      {
        label: 'Net Earnings',
        data: earnings.map(e => e.net_earnings),
        borderColor: '#52c41a',
        backgroundColor: 'rgba(82, 196, 26, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toFixed(0);
          }
        }
      }
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('MMM DD, YYYY')
    },
    {
      title: 'Orders',
      dataIndex: 'orders',
      key: 'orders'
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (amount: number) => `$${amount.toFixed(2)}`
    },
    {
      title: 'Platform Fee ($1/order)',
      dataIndex: 'commission',
      key: 'commission',
      render: (amount: number) => <span className="fee-amount">-${amount.toFixed(2)}</span>
    },
    {
      title: 'Net Earnings',
      dataIndex: 'net_earnings',
      key: 'net_earnings',
      render: (amount: number) => <span className="net-amount">${amount.toFixed(2)}</span>
    }
  ];

  return (
    <div className="vendor-earnings">
      <div className="page-header">
        <h1>Earnings</h1>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="YYYY-MM-DD"
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportReport}>
            Export Report
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Net Earnings"
              value={stats.netEarnings}
              precision={2}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Order Value"
              value={stats.avgOrderValue}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>

      {/* Fee Breakdown */}
      <Card title="Fee Breakdown" className="fee-card">
        <Row gutter={16}>
          <Col span={8}>
            <div className="fee-item">
              <span className="fee-label">Platform Fee ($1/order)</span>
              <span className="fee-value">-${stats.platformFees.toFixed(2)}</span>
            </div>
          </Col>
          <Col span={8}>
            <div className="fee-item">
              <span className="fee-label">Payment Processing (Stripe)</span>
              <span className="fee-value">-${stats.stripeFees.toFixed(2)}</span>
            </div>
          </Col>
          <Col span={8}>
            <div className="fee-item">
              <span className="fee-label">Your Net Earnings</span>
              <span className="fee-value net">${stats.netEarnings.toFixed(2)}</span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Chart */}
      <Card title="Revenue Trend" className="chart-card">
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* Daily Breakdown */}
      <Card title="Daily Breakdown">
        <Table
          columns={columns}
          dataSource={earnings}
          rowKey="date"
          loading={loading}
          pagination={{ pageSize: 31 }}
        />
      </Card>

      <style>{`
        .vendor-earnings {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 28px;
        }
        .stats-row {
          margin-bottom: 24px;
        }
        .fee-card {
          margin-bottom: 24px;
        }
        .fee-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .fee-label {
          font-size: 14px;
          color: #666;
        }
        .fee-value {
          font-size: 18px;
          font-weight: 600;
          color: #ff4d4f;
        }
        .fee-value.net {
          color: #52c41a;
        }
        .chart-card {
          margin-bottom: 24px;
        }
        .chart-container {
          height: 300px;
          padding: 16px 0;
        }
        .fee-amount {
          color: #ff4d4f;
        }
        .net-amount {
          color: #52c41a;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default VendorEarnings;
