import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Card, Statistic, Row, Col, message, Popconfirm, Switch } from 'antd';
import { UserOutlined, WarningOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';
import api from '../../api/api';

interface Customer {
  id: number;
  email: string;
  name: string;
  phone: string;
  has_unpaid_balance: boolean;
  is_active: boolean;
  created_at: string | null;
}

const CustomersAdmin: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState<number | null>(null);
  const [blockedOnly, setBlockedOnly] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    blocked: 0,
    active: 0,
  });

  useEffect(() => {
    fetchCustomers();
  }, [blockedOnly]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = blockedOnly ? '/api/admin/customers?blocked_only=true' : '/api/admin/customers';
      const response = await api.get(url);
      const data: Customer[] = response.data;
      setCustomers(data);
      setStats({
        total: data.length,
        blocked: data.filter((c) => c.has_unpaid_balance).length,
        active: data.filter((c) => c.is_active).length,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err?.response?.data?.detail || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleClearBalance = async (customerId: number) => {
    setClearing(customerId);
    try {
      await api.post(`/api/admin/customers/${customerId}/clear-unpaid-balance`);
      message.success('Unpaid balance cleared — customer can now book rides');
      fetchCustomers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err?.response?.data?.detail || 'Failed to clear unpaid balance');
    } finally {
      setClearing(null);
    }
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: (a, b) => a.id - b.id,
      width: 70,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => name || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || <span style={{ color: '#999' }}>—</span>,
    },
    {
      title: 'Payment Status',
      dataIndex: 'has_unpaid_balance',
      key: 'has_unpaid_balance',
      render: (blocked: boolean) =>
        blocked ? (
          <Tag color="red" icon={<WarningOutlined />}>
            Blocked
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Clear
          </Tag>
        ),
      filters: [
        { text: 'Blocked', value: true },
        { text: 'Clear', value: false },
      ],
      onFilter: (value, record) => record.has_unpaid_balance === value,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) =>
        active ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="default">Inactive</Tag>
        ),
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string | null) =>
        date ? moment(date).format('MMM D, YYYY') : '—',
      sorter: (a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Customer) => (
        <Space>
          <Popconfirm
            title="Clear Unpaid Balance"
            description={`Clear the payment block for ${record.email}? This will allow them to book rides again.`}
            onConfirm={() => handleClearBalance(record.id)}
            okText="Yes, Clear"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            disabled={!record.has_unpaid_balance}
          >
            <Button
              type="primary"
              danger
              size="small"
              disabled={!record.has_unpaid_balance}
              loading={clearing === record.id}
            >
              Clear Balance
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Customer Management</h2>
        <p style={{ color: '#666', margin: '4px 0 0' }}>
          View all customers and clear payment blocks caused by failed capture retries.
        </p>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Customers"
              value={stats.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Blocked (Unpaid Balance)"
              value={stats.blocked}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats.blocked > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Active Accounts"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <span style={{ fontWeight: 500 }}>Show blocked only:</span>
            <Switch
              checked={blockedOnly}
              onChange={(checked) => setBlockedOnly(checked)}
              checkedChildren="Blocked"
              unCheckedChildren="All"
            />
          </Space>
          <Button
            icon={<SyncOutlined />}
            onClick={fetchCustomers}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} customers` }}
          rowClassName={(record) => (record.has_unpaid_balance ? 'ant-table-row-blocked' : '')}
        />
      </Card>
    </div>
  );
};

export default CustomersAdmin;
