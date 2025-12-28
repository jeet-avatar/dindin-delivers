import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Spin, message, Table, Divider, Typography, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import moment from 'moment';
import { getAdminAccountingData } from '../../../api/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title: AntTitle, Text } = Typography;

const IncomeStatement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchIncomeStatement();
  }, [period]);

  const fetchIncomeStatement = async () => {
    setLoading(true);
    try {
      const response = await getAdminAccountingData(`income-statement?period=${period}`);
      setData(response.income_statement);
    } catch (error) {
      message.error('Failed to fetch Income Statement');
      // Sample data for demo
      setData({
        period: { start_date: '2024-12-01', end_date: '2024-12-24', period_type: 'month' },
        revenue: {
          platform_fees: { food_delivery: 1250.00, rideshare: 890.00, total: 2140.00 },
          delivery_fees: 3500.00,
          total_revenue: 5640.00
        },
        cost_of_revenue: {
          driver_payments: 2800.00,
          payment_processing: 165.00,
          total_cost_of_revenue: 2965.00
        },
        gross_profit: 2675.00,
        gross_margin_percent: 47.4,
        operating_expenses: {
          technology_infrastructure: 564.00,
          marketing: 846.00,
          general_administrative: 282.00,
          total_operating_expenses: 1692.00
        },
        operating_income: 983.00,
        net_income: 983.00,
        net_margin_percent: 17.4,
        metrics: { total_orders: 1250, total_rides: 320, average_order_value: 28.50, revenue_per_order: 4.51 }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  const revenueChartData = {
    labels: ['Platform Fees', 'Delivery Fees'],
    datasets: [{
      label: 'Revenue',
      data: [data?.revenue?.platform_fees?.total || 0, data?.revenue?.delivery_fees || 0],
      backgroundColor: ['rgba(82, 196, 26, 0.8)', 'rgba(24, 144, 255, 0.8)'],
    }]
  };

  const expenseChartData = {
    labels: ['Driver Payments', 'Processing Fees', 'Technology', 'Marketing', 'Admin'],
    datasets: [{
      label: 'Expenses',
      data: [
        data?.cost_of_revenue?.driver_payments || 0,
        data?.cost_of_revenue?.payment_processing || 0,
        data?.operating_expenses?.technology_infrastructure || 0,
        data?.operating_expenses?.marketing || 0,
        data?.operating_expenses?.general_administrative || 0
      ],
      backgroundColor: [
        'rgba(245, 34, 45, 0.8)',
        'rgba(250, 140, 22, 0.8)',
        'rgba(114, 46, 209, 0.8)',
        'rgba(235, 47, 150, 0.8)',
        'rgba(47, 84, 235, 0.8)'
      ],
    }]
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <AntTitle level={4}>Income Statement (Profit & Loss)</AntTitle>
          <Text type="secondary">
            {moment(data?.period?.start_date).format('MMM D, YYYY')} - {moment(data?.period?.end_date).format('MMM D, YYYY')}
          </Text>
        </Col>
        <Col>
          <Select value={period} onChange={setPeriod} style={{ width: 150 }}>
            <Option value="week">This Week</Option>
            <Option value="month">This Month</Option>
            <Option value="quarter">This Quarter</Option>
            <Option value="year">This Year</Option>
          </Select>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={data?.revenue?.total_revenue || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Gross Profit"
              value={data?.gross_profit || 0}
              precision={2}
              prefix="$"
              suffix={<Tag color="green">{data?.gross_margin_percent}%</Tag>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Net Income"
              value={data?.net_income || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: data?.net_income >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Net Margin"
              value={data?.net_margin_percent || 0}
              precision={1}
              suffix="%"
              prefix={data?.net_margin_percent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              valueStyle={{ color: data?.net_margin_percent >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Left Column - Statement */}
        <Col span={14}>
          <Card title="Detailed Statement">
            {/* Revenue Section */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ fontSize: 16, color: '#52c41a' }}>REVENUE</Text>
              <Table
                dataSource={[
                  { item: 'Platform Fees - Food Delivery', amount: data?.revenue?.platform_fees?.food_delivery || 0 },
                  { item: 'Platform Fees - Rideshare (Wyoming)', amount: data?.revenue?.platform_fees?.rideshare || 0 },
                  { item: 'Delivery Fees', amount: data?.revenue?.delivery_fees || 0 },
                ]}
                columns={[
                  { title: 'Item', dataIndex: 'item', key: 'item' },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const,
                    render: (val: number) => `$${val.toFixed(2)}` }
                ]}
                pagination={false}
                size="small"
                showHeader={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><Text strong>Total Revenue</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: '#52c41a' }}>${(data?.revenue?.total_revenue || 0).toFixed(2)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>

            {/* Cost of Revenue */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ fontSize: 16, color: '#fa8c16' }}>COST OF REVENUE</Text>
              <Table
                dataSource={[
                  { item: 'Driver Payments', amount: data?.cost_of_revenue?.driver_payments || 0 },
                  { item: 'Payment Processing (Stripe)', amount: data?.cost_of_revenue?.payment_processing || 0 },
                ]}
                columns={[
                  { title: 'Item', dataIndex: 'item', key: 'item' },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const,
                    render: (val: number) => `($${val.toFixed(2)})` }
                ]}
                pagination={false}
                size="small"
                showHeader={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><Text strong>Total Cost of Revenue</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: '#fa8c16' }}>(${ (data?.cost_of_revenue?.total_cost_of_revenue || 0).toFixed(2)})</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>

            <Divider />
            <Row justify="space-between">
              <Text strong style={{ fontSize: 16 }}>GROSS PROFIT</Text>
              <Text strong style={{ fontSize: 16, color: '#52c41a' }}>${(data?.gross_profit || 0).toFixed(2)}</Text>
            </Row>
            <Divider />

            {/* Operating Expenses */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ fontSize: 16, color: '#f5222d' }}>OPERATING EXPENSES</Text>
              <Table
                dataSource={[
                  { item: 'Technology & Infrastructure', amount: data?.operating_expenses?.technology_infrastructure || 0 },
                  { item: 'Marketing & Advertising', amount: data?.operating_expenses?.marketing || 0 },
                  { item: 'General & Administrative', amount: data?.operating_expenses?.general_administrative || 0 },
                ]}
                columns={[
                  { title: 'Item', dataIndex: 'item', key: 'item' },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const,
                    render: (val: number) => `($${val.toFixed(2)})` }
                ]}
                pagination={false}
                size="small"
                showHeader={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><Text strong>Total Operating Expenses</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: '#f5222d' }}>(${ (data?.operating_expenses?.total_operating_expenses || 0).toFixed(2)})</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </div>

            <Divider style={{ borderWidth: 2 }} />
            <Row justify="space-between">
              <Text strong style={{ fontSize: 18 }}>NET INCOME</Text>
              <Text strong style={{ fontSize: 18, color: data?.net_income >= 0 ? '#52c41a' : '#f5222d' }}>
                ${(data?.net_income || 0).toFixed(2)}
              </Text>
            </Row>
          </Card>
        </Col>

        {/* Right Column - Charts */}
        <Col span={10}>
          <Card title="Revenue Breakdown" style={{ marginBottom: 16 }}>
            <Bar data={revenueChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </Card>
          <Card title="Expense Breakdown">
            <Bar data={expenseChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </Card>
          <Card title="Key Metrics" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Total Orders" value={data?.metrics?.total_orders || 0} />
              </Col>
              <Col span={12}>
                <Statistic title="Total Rides (WY)" value={data?.metrics?.total_rides || 0} />
              </Col>
              <Col span={12}>
                <Statistic title="Avg Order Value" value={data?.metrics?.average_order_value || 0} prefix="$" precision={2} />
              </Col>
              <Col span={12}>
                <Statistic title="Revenue/Order" value={data?.metrics?.revenue_per_order || 0} prefix="$" precision={2} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default IncomeStatement;
