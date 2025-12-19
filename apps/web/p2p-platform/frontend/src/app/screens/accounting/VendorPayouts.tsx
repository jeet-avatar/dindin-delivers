import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Card, Statistic, Row, Col, DatePicker, message, Modal, Select } from 'antd';
import { DollarOutlined, BankOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import moment from 'moment';
import { getVendorPayouts, syncVendorPayouts, getVendors } from '../../api/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface VendorPayout {
  id: number;
  payout_number: string;
  vendor_id: number;
  vendor_name?: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  gross_revenue: number;
  platform_fee: number;
  stripe_fees: number;
  net_payout: number;
  status: string;
  coupa_status?: string;
  coupa_invoice_id?: string;
  created_at: string;
  paid_at?: string;
}

const VendorPayoutsMain: React.FC = () => {
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncDateRange, setSyncDateRange] = useState<any>(null);

  const [stats, setStats] = useState({
    totalPayouts: 0,
    pendingAmount: 0,
    completedAmount: 0,
    vendorsCount: 0
  });

  useEffect(() => {
    fetchPayouts();
    fetchVendors();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await getVendorPayouts();
      
      // Merge vendor names
      const vendorsResponse = await getVendors();
      const vendorMap = new Map(vendorsResponse.map((v: any) => [v.id, v]));
      
      const payoutsWithVendorNames = response.map((payout: VendorPayout) => ({
        ...payout,
        vendor_name: vendorMap.get(payout.vendor_id)?.restaurant_name || 
                    vendorMap.get(payout.vendor_id)?.company_name || 'Unknown'
      }));
      
      setPayouts(payoutsWithVendorNames);
      calculateStats(payoutsWithVendorNames);
    } catch (error) {
      message.error('Failed to fetch vendor payouts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await getVendors();
      setVendors(response);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const calculateStats = (payoutsData: VendorPayout[]) => {
    const totalPayouts = payoutsData.length;
    const pendingAmount = payoutsData
      .filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + p.net_payout, 0);
    const completedAmount = payoutsData
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.net_payout, 0);
    const vendorsCount = new Set(payoutsData.map(p => p.vendor_id)).size;

    setStats({
      totalPayouts,
      pendingAmount,
      completedAmount,
      vendorsCount
    });
  };

  const handleSyncPayouts = async () => {
    if (!syncDateRange || syncDateRange.length !== 2) {
      message.warning('Please select a date range');
      return;
    }

    setSyncing(true);
    try {
      const startDate = syncDateRange[0].toISOString();
      const endDate = syncDateRange[1].toISOString();
      
      const result = await syncVendorPayouts(startDate, endDate);
      
      message.success(`Successfully created ${result.total_vendors} vendor payouts`);
      setSyncModalVisible(false);
      fetchPayouts();
    } catch (error) {
      message.error('Failed to sync vendor payouts');
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'orange',
      'processing': 'blue',
      'completed': 'green',
      'failed': 'red'
    };
    return statusColors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const columns = [
    {
      title: 'Payout #',
      dataIndex: 'payout_number',
      key: 'payout_number',
      fixed: 'left' as const,
      width: 200,
      render: (text: string) => <span className="payout-number">{text}</span>
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      width: 200
    },
    {
      title: 'Period',
      key: 'period',
      width: 220,
      render: (_: any, record: VendorPayout) => (
        <span>
          {moment(record.period_start).format('MMM DD')} - {moment(record.period_end).format('MMM DD, YYYY')}
        </span>
      )
    },
    {
      title: 'Orders',
      dataIndex: 'total_orders',
      key: 'total_orders',
      width: 80,
      align: 'center' as const
    },
    {
      title: 'Gross Revenue',
      dataIndex: 'gross_revenue',
      key: 'gross_revenue',
      width: 130,
      render: (amount: number) => `$${amount.toFixed(2)}`,
      sorter: (a: VendorPayout, b: VendorPayout) => a.gross_revenue - b.gross_revenue
    },
    {
      title: 'Platform Fee',
      dataIndex: 'platform_fee',
      key: 'platform_fee',
      width: 120,
      render: (amount: number) => <span className="fee-text">-${amount.toFixed(2)}</span>
    },
    {
      title: 'Stripe Fees',
      dataIndex: 'stripe_fees',
      key: 'stripe_fees',
      width: 110,
      render: (amount: number) => <span className="fee-text">-${amount.toFixed(2)}</span>
    },
    {
      title: 'Net Payout',
      dataIndex: 'net_payout',
      key: 'net_payout',
      width: 130,
      render: (amount: number) => <span className="net-payout">${amount.toFixed(2)}</span>,
      sorter: (a: VendorPayout, b: VendorPayout) => a.net_payout - b.net_payout
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Coupa',
      dataIndex: 'coupa_status',
      key: 'coupa_status',
      width: 120,
      render: (status: string) => status ? (
        <Tag color="blue">{status}</Tag>
      ) : (
        <Tag>Not Synced</Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => moment(date).format('MMM DD, YYYY')
    }
  ];

  return (
    <div className="vendor-payouts-container">
      {/* Stats Cards */}
      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Payouts"
              value={stats.totalPayouts}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Amount"
              value={stats.pendingAmount}
              precision={2}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Amount"
              value={stats.completedAmount}
              precision={2}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Vendors"
              value={stats.vendorsCount}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <Card className="actions-card">
        <Space>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => setSyncModalVisible(true)}
          >
            Sync Vendor Payouts
          </Button>
          <Button onClick={fetchPayouts}>
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Payouts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={payouts}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} payouts`
          }}
        />
      </Card>

      {/* Sync Modal */}
      <Modal
        title="Sync Vendor Payouts"
        open={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
        onOk={handleSyncPayouts}
        confirmLoading={syncing}
        okText="Sync Payouts"
      >
        <div className="sync-modal-content">
          <p>
            Select the date range to calculate vendor payouts. The system will:
          </p>
          <ul>
            <li>Calculate total orders per vendor</li>
            <li>Sum gross revenue from successful payments</li>
            <li>Calculate platform fees:
              <ul style={{ marginTop: 4, fontSize: 12 }}>
                <li><strong>Food Delivery:</strong> $1 flat fee per order</li>
                <li><strong>Rideshare:</strong> Tiered by distance - $1 (0-10mi), $2 (10-20mi), $3 (20+mi)</li>
              </ul>
            </li>
            <li>Calculate Stripe processing fees</li>
            <li>Generate net payout amounts</li>
            <li>Create payout records ready for Coupa sync</li>
          </ul>
          
          <div className="date-range-selector">
            <label>Payout Period:</label>
            <RangePicker
              value={syncDateRange}
              onChange={setSyncDateRange}
              format="YYYY-MM-DD"
              className="full-width"
            />
          </div>

          <div className="suggested-ranges">
            <p>Suggested ranges:</p>
            <Space wrap>
              <Button
                size="small"
                onClick={() => setSyncDateRange([
                  moment().subtract(7, 'days').startOf('day'),
                  moment().endOf('day')
                ])}
              >
                Last 7 Days
              </Button>
              <Button
                size="small"
                onClick={() => setSyncDateRange([
                  moment().subtract(30, 'days').startOf('day'),
                  moment().endOf('day')
                ])}
              >
                Last 30 Days
              </Button>
              <Button
                size="small"
                onClick={() => setSyncDateRange([
                  moment().startOf('month'),
                  moment().endOf('month')
                ])}
              >
                This Month
              </Button>
              <Button
                size="small"
                onClick={() => setSyncDateRange([
                  moment().subtract(1, 'month').startOf('month'),
                  moment().subtract(1, 'month').endOf('month')
                ])}
              >
                Last Month
              </Button>
            </Space>
          </div>
        </div>
      </Modal>

      <style>{`
        .vendor-payouts-container {
          padding: 24px;
        }
        .stats-row {
          margin-bottom: 24px;
        }
        .actions-card {
          margin-bottom: 16px;
        }
        .payout-number {
          font-weight: 600;
          color: #1890ff;
        }
        .fee-text {
          color: #ff4d4f;
        }
        .net-payout {
          font-weight: 600;
          color: #52c41a;
        }
        .sync-modal-content {
          margin-top: 16px;
        }
        .date-range-selector {
          margin: 20px 0;
        }
        .date-range-selector label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .full-width {
          width: 100%;
        }
        .suggested-ranges {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
        }
        .suggested-ranges p {
          margin-bottom: 8px;
          font-size: 12px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default VendorPayoutsMain;
