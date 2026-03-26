import React, { useEffect, useState } from 'react';
import {
  Table, Tabs, Tag, Button, Modal, Form, Input, Select, Space,
  Typography, message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '../../api/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface Prop22Period {
  id: number;
  driver_id: number;
  driver_name: string;
  driver_stripe_onboarded: boolean;
  period_start: string;
  period_end: string;
  status: 'PENDING' | 'RECONCILED' | 'PAID' | 'MANUAL_REVIEW' | 'OVERDUE';
  service_type: 'RIDESHARE' | 'FOOD_DELIVERY';
  engaged_hours: number;
  engaged_miles: number;
  net_earnings: number;
  prop22_floor: number;
  top_up_amount: number;
  top_up_stripe_id: string | null;
  deadline_at: string | null;
}

interface PaginatedResponse {
  total: number;
  page: number;
  page_size: number;
  items: Prop22Period[];
}

interface ManualTopupForm {
  driver_id: number;
  period_id: number;
  amount: number;
  method: 'ACH' | 'CHECK' | 'STRIPE';
  reference_number: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  RECONCILED: 'green',
  PAID: 'green',
  MANUAL_REVIEW: 'orange',
  OVERDUE: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Calculating',
  RECONCILED: 'No Top-Up',
  PAID: 'Paid',
  MANUAL_REVIEW: 'Review',
  OVERDUE: 'Overdue',
};

const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

const formatPeriod = (start: string, end: string) =>
  `${formatDate(start)} – ${formatDate(end)}`;

const Prop22Compliance: React.FC = () => {
  const [allPeriods, setAllPeriods] = useState<Prop22Period[]>([]);
  const [manualReviewPeriods, setManualReviewPeriods] = useState<Prop22Period[]>([]);
  const [loading, setLoading] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Prop22Period | null>(null);
  const [form] = Form.useForm<ManualTopupForm>();
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const fetchAllPeriods = async (page = 1) => {
    setLoading(true);
    try {
      const resp = await api.get<PaginatedResponse>(
        `/admin/prop22/periods?page=${page}&page_size=50`
      );
      setAllPeriods(resp.data.items);
      setPagination(p => ({ ...p, total: resp.data.total, current: page }));
    } catch (_err) {
      message.error('Failed to load Prop 22 periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchManualReview = async () => {
    try {
      // Fetch OVERDUE first (most urgent), then MANUAL_REVIEW — both sorted by deadline ASC
      const ov = await api.get<PaginatedResponse>(
        '/admin/prop22/periods?status=OVERDUE&page_size=200'
      );
      const mr = await api.get<PaginatedResponse>(
        '/admin/prop22/periods?status=MANUAL_REVIEW&page_size=200'
      );
      setManualReviewPeriods([
        ...ov.data.items,
        ...mr.data.items,
      ]);
    } catch (_err) {
      message.error('Failed to load manual review queue');
    }
  };

  useEffect(() => {
    fetchAllPeriods();
    fetchManualReview();
  }, []);

  const openTopupModal = (period: Prop22Period) => {
    setSelectedPeriod(period);
    form.setFieldsValue({
      driver_id: period.driver_id,
      period_id: period.id,
      amount: parseFloat(period.top_up_amount.toFixed(2)),
      method: 'ACH',
      reference_number: '',
    });
    setTopupModalOpen(true);
  };

  const submitTopup = async (values: ManualTopupForm) => {
    setSubmitting(true);
    try {
      await api.post('/admin/prop22/manual-topup', values);
      message.success(`Manual top-up of ${formatCurrency(values.amount)} recorded`);
      setTopupModalOpen(false);
      form.resetFields();
      fetchAllPeriods(pagination.current);
      fetchManualReview();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      message.error(axiosErr?.response?.data?.detail || 'Failed to record top-up');
    } finally {
      setSubmitting(false);
    }
  };

  const baseColumns: ColumnsType<Prop22Period> = [
    {
      title: 'Driver',
      dataIndex: 'driver_name',
      key: 'driver_name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text>{name}</Text>
          {!record.driver_stripe_onboarded && (
            <Tag color="red" style={{ fontSize: 10 }}>No Stripe</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: unknown, r: Prop22Period) => formatPeriod(r.period_start, r.period_end),
    },
    {
      title: 'Type',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (t: string) => <Tag>{t === 'RIDESHARE' ? 'Ride' : 'Delivery'}</Tag>,
    },
    {
      title: 'Hrs',
      dataIndex: 'engaged_hours',
      key: 'engaged_hours',
      render: (v: number) => `${v.toFixed(1)}h`,
    },
    {
      title: 'Miles',
      dataIndex: 'engaged_miles',
      key: 'engaged_miles',
      render: (v: number) => `${v.toFixed(1)}mi`,
    },
    {
      title: 'Earned',
      dataIndex: 'net_earnings',
      key: 'net_earnings',
      render: formatCurrency,
    },
    {
      title: 'Floor',
      dataIndex: 'prop22_floor',
      key: 'prop22_floor',
      render: formatCurrency,
    },
    {
      title: 'Top-Up',
      dataIndex: 'top_up_amount',
      key: 'top_up_amount',
      render: (v: number) =>
        v > 0 ? (
          <Text strong style={{ color: '#52c41a' }}>{formatCurrency(v)}</Text>
        ) : (
          '—'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>
      ),
    },
  ];

  const manualReviewColumns: ColumnsType<Prop22Period> = [
    ...baseColumns,
    {
      title: 'Due By',
      dataIndex: 'deadline_at',
      key: 'deadline_at',
      render: (d: string | null, r: Prop22Period) => (
        <Text style={{ color: r.status === 'OVERDUE' ? '#ff4d4f' : '#fa8c16' }}>
          {formatDate(d)}
          {r.status === 'OVERDUE' && ' (OVERDUE)'}
        </Text>
      ),
      sorter: (a, b) => {
        if (!a.deadline_at || !b.deadline_at) return 0;
        return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Prop22Period) => (
        <Button type="primary" size="small" onClick={() => openTopupModal(record)}>
          Manual Top-Up
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={3}>Prop 22 Compliance</Title>
      <Text type="secondary">
        California BPC §§7453–7463 — 14-day period earnings floor
      </Text>

      <Tabs defaultActiveKey="all" style={{ marginTop: 16 }}>
        <TabPane tab="All Periods" key="all">
          <Table<Prop22Period>
            columns={baseColumns}
            dataSource={allPeriods}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page) => fetchAllPeriods(page),
            }}
            rowClassName={(record) =>
              record.status === 'OVERDUE' ? 'prop22-overdue-row' : ''
            }
            size="middle"
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              Manual Review
              {manualReviewPeriods.length > 0 && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  {manualReviewPeriods.length}
                </Tag>
              )}
            </span>
          }
          key="manual-review"
        >
          <Table<Prop22Period>
            columns={manualReviewColumns}
            dataSource={manualReviewPeriods}
            rowKey="id"
            loading={loading}
            pagination={false}
            rowClassName={(record) =>
              record.status === 'OVERDUE' ? 'prop22-overdue-row' : ''
            }
            size="middle"
          />
        </TabPane>
      </Tabs>

      {/* Manual Top-Up Modal */}
      <Modal
        title="Record Manual Prop 22 Top-Up"
        open={topupModalOpen}
        onCancel={() => {
          setTopupModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        {selectedPeriod && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>{selectedPeriod.driver_name}</Text>
            <br />
            <Text type="secondary">
              Period: {formatPeriod(selectedPeriod.period_start, selectedPeriod.period_end)}
              {' · '}Top-up owed: {formatCurrency(selectedPeriod.top_up_amount)}
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={submitTopup}>
          <Form.Item name="driver_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="period_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="Amount ($)"
            name="amount"
            rules={[{ required: true, message: 'Enter top-up amount' }]}
          >
            <Input type="number" step="0.01" prefix="$" />
          </Form.Item>

          <Form.Item
            label="Payment Method"
            name="method"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="ACH">ACH Transfer</Option>
              <Option value="CHECK">Check</Option>
              <Option value="STRIPE">Stripe Manual</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Reference Number"
            name="reference_number"
            rules={[{ required: true, message: 'Enter reference/confirmation number' }]}
            tooltip="Stored as the BPC §7454 payment record. Enter ACH trace number, check number, or Stripe transfer ID."
          >
            <Input placeholder="e.g., ACH trace #, check #, or Stripe transfer ID" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Record Payment
              </Button>
              <Button
                onClick={() => {
                  setTopupModalOpen(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .prop22-overdue-row {
          background-color: #fff1f0 !important;
        }
      `}</style>
    </div>
  );
};

export default Prop22Compliance;
