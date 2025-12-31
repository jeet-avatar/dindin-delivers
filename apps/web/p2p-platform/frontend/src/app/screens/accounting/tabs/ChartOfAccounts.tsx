import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Spin, message, Collapse, Statistic, Row, Col } from 'antd';
import { SearchOutlined, BankOutlined, DollarOutlined, WalletOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { getAdminAccountingData } from '../../../api/api';

const { Panel } = Collapse;
const { Option } = Select;

interface Account {
  code: string;
  name: string;
  type: string;
  category: string;
  normal_balance: string;
}

const ChartOfAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<any>({});

  useEffect(() => {
    fetchChartOfAccounts();
  }, []);

  const fetchChartOfAccounts = async () => {
    setLoading(true);
    try {
      const response = await getAdminAccountingData('chart-of-accounts');
      setAccounts(response.chart_of_accounts || []);
      setGrouped(response.grouped || {});
    } catch (error) {
      message.error('Failed to fetch Chart of Accounts');
      // Use sample data for demo
      const sampleAccounts = [
        { code: "1000", name: "Cash - Stripe", type: "asset", category: "cash", normal_balance: "debit" },
        { code: "1010", name: "Cash - Bank Account", type: "asset", category: "cash", normal_balance: "debit" },
        { code: "2000", name: "Accounts Payable - General", type: "liability", category: "accounts_payable", normal_balance: "credit" },
        { code: "2200", name: "Accounts Payable - Drivers", type: "liability", category: "accounts_payable", normal_balance: "credit" },
        { code: "3100", name: "Retained Earnings", type: "equity", category: "retained_earnings", normal_balance: "credit" },
        { code: "4010", name: "Platform Fee Revenue - WY Tier 1", type: "revenue", category: "platform_revenue", normal_balance: "credit" },
        { code: "4011", name: "Platform Fee Revenue - WY Tier 2", type: "revenue", category: "platform_revenue", normal_balance: "credit" },
        { code: "4012", name: "Platform Fee Revenue - WY Tier 3", type: "revenue", category: "platform_revenue", normal_balance: "credit" },
        { code: "5000", name: "Payment Processing Fees", type: "expense", category: "cost_of_revenue", normal_balance: "debit" },
      ];
      setAccounts(sampleAccounts);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      asset: 'blue',
      liability: 'orange',
      equity: 'purple',
      revenue: 'green',
      expense: 'red'
    };
    return colors[type] || 'default';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return <BankOutlined />;
      case 'liability': return <WalletOutlined />;
      case 'equity': return <DollarOutlined />;
      case 'revenue': return <RiseOutlined />;
      case 'expense': return <FallOutlined />;
      default: return <DollarOutlined />;
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         account.code.includes(searchText);
    const matchesType = !filterType || account.type === filterType;
    return matchesSearch && matchesType;
  });

  const columns = [
    {
      title: 'Account Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: Account, b: Account) => a.code.localeCompare(b.code),
      render: (code: string) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Account Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Account, b: Account) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag icon={getTypeIcon(type)} color={getTypeColor(type)}>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (category: string) => (
        <span style={{ textTransform: 'capitalize' }}>
          {category.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      title: 'Normal Balance',
      dataIndex: 'normal_balance',
      key: 'normal_balance',
      width: 130,
      render: (balance: string) => (
        <Tag color={balance === 'debit' ? 'cyan' : 'magenta'}>
          {balance.toUpperCase()}
        </Tag>
      )
    }
  ];

  const accountCounts = {
    assets: accounts.filter(a => a.type === 'asset').length,
    liabilities: accounts.filter(a => a.type === 'liability').length,
    equity: accounts.filter(a => a.type === 'equity').length,
    revenue: accounts.filter(a => a.type === 'revenue').length,
    expenses: accounts.filter(a => a.type === 'expense').length,
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Assets" value={accountCounts.assets} prefix={<BankOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Liabilities" value={accountCounts.liabilities} prefix={<WalletOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Equity" value={accountCounts.equity} prefix={<DollarOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Revenue" value={accountCounts.revenue} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Expenses" value={accountCounts.expenses} prefix={<FallOutlined />} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Total Accounts" value={accounts.length} />
          </Card>
        </Col>
      </Row>

      <Card
        title="Chart of Accounts (COA)"
        extra={
          <div style={{ display: 'flex', gap: 16 }}>
            <Input
              placeholder="Search accounts..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Filter by type"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setFilterType(value)}
            >
              <Option value="asset">Assets</Option>
              <Option value="liability">Liabilities</Option>
              <Option value="equity">Equity</Option>
              <Option value="revenue">Revenue</Option>
              <Option value="expense">Expenses</Option>
            </Select>
          </div>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredAccounts}
            rowKey="code"
            pagination={{ pageSize: 15, showSizeChanger: true }}
            size="middle"
          />
        )}
      </Card>

      <Card title="Account Code Structure" style={{ marginTop: 24 }}>
        <Collapse>
          <Panel header="1xxx - Assets" key="1">
            <p><strong>1000-1099:</strong> Cash accounts (Stripe, Bank, ACH Pending)</p>
            <p><strong>1100-1199:</strong> Accounts Receivable</p>
            <p><strong>1200-1299:</strong> Prepaid Expenses</p>
            <p><strong>1500-1599:</strong> Fixed Assets & Depreciation</p>
          </Panel>
          <Panel header="2xxx - Liabilities" key="2">
            <p><strong>2000-2099:</strong> Accounts Payable - General</p>
            <p><strong>2100-2199:</strong> Accounts Payable - Restaurants</p>
            <p><strong>2200-2299:</strong> Accounts Payable - Drivers</p>
            <p><strong>2300-2399:</strong> Tax Liabilities</p>
            <p><strong>2500-2599:</strong> Deferred Revenue</p>
          </Panel>
          <Panel header="3xxx - Equity" key="3">
            <p><strong>3000:</strong> Common Stock</p>
            <p><strong>3100:</strong> Retained Earnings</p>
            <p><strong>3200:</strong> Current Period Earnings</p>
          </Panel>
          <Panel header="4xxx - Revenue (Wyoming TNC)" key="4">
            <p><strong>4000:</strong> Platform Fee - Food Delivery</p>
            <p><strong>4010:</strong> WY Tier 1 (&lt;10mi) - $1.00</p>
            <p><strong>4011:</strong> WY Tier 2 (10-25mi) - $2.00</p>
            <p><strong>4012:</strong> WY Tier 3 (&gt;25mi) - $3.00</p>
            <p><strong>4021:</strong> Airport Fees (JAC/CYS/CPR)</p>
          </Panel>
          <Panel header="5xxx-6xxx - Expenses" key="5">
            <p><strong>5000:</strong> Payment Processing (Stripe)</p>
            <p><strong>5100:</strong> Driver Payments</p>
            <p><strong>6000:</strong> Salaries & Wages</p>
            <p><strong>6100:</strong> Marketing</p>
            <p><strong>6200:</strong> Technology</p>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default ChartOfAccounts;
