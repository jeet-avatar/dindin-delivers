import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, message, Spin, Progress, Avatar, Space, Modal, Popconfirm } from 'antd';
import { RobotOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

interface AIEmployee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: string;
}

interface MenuReviewStats {
  total_items: number;
  approved: number;
  pending: number;
  flagged: number;
  approval_rate: string;
}

interface ComplianceStats {
  total_vendors: number;
  documents_verified: number;
  published: number;
  verification_rate: string;
}

interface PendingMenuItem {
  item_id: number;
  item_name: string;
  vendor_id: number;
  price: number;
  category: string;
  confidence_score: number | null;
  review_status: string;
  needs_review: boolean;
}

interface DashboardData {
  ai_employees: AIEmployee[];
  menu_review_stats: MenuReviewStats;
  compliance_stats: ComplianceStats;
  thresholds: {
    auto_approve: string;
    quick_review: string;
    manual_review: string;
  };
}

const AIDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, pendingRes] = await Promise.all([
        axios.get(`${getApiUrl()}/api/ai/dashboard`),
        axios.get(`${getApiUrl()}/api/ai/pending-reviews`)
      ]);
      setDashboardData(dashboardRes.data);
      setPendingItems(pendingRes.data.menu_items || []);
    } catch (error) {
      console.error('Error fetching AI dashboard:', error);
      message.error('Failed to load AI dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAllItems = async (vendorId: number) => {
    setProcessing(`vendor-${vendorId}`);
    try {
      const res = await axios.post(`${getApiUrl()}/api/ai/menu/review-all/${vendorId}`);
      message.success(`MenuBot reviewed ${res.data.total_reviewed} items: ${res.data.summary.auto_approved} approved, ${res.data.summary.queued_for_review} queued`);
      fetchDashboardData();
    } catch (error) {
      message.error('Failed to run AI review');
    } finally {
      setProcessing(null);
    }
  };

  const handleReviewSingleItem = async (itemId: number) => {
    setProcessing(`item-${itemId}`);
    try {
      const res = await axios.post(`${getApiUrl()}/api/ai/menu/review-item/${itemId}`);
      message.success(`${res.data.item_name}: ${res.data.action} (${(res.data.confidence * 100).toFixed(0)}% confidence)`);
      fetchDashboardData();
    } catch (error) {
      message.error('Failed to review item');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessVendor = async (vendorId: number) => {
    setProcessing(`process-${vendorId}`);
    try {
      const res = await axios.post(`${getApiUrl()}/api/ai/process-new-vendor/${vendorId}`);
      Modal.success({
        title: `AI Processing Complete - ${res.data.vendor_name}`,
        content: (
          <div>
            {res.data.steps.map((step: any, idx: number) => (
              <div key={idx} style={{ marginBottom: 8 }}>
                <strong>Step {step.step}:</strong> {step.ai_employee} - {step.action}
                <br />
                <Tag color={step.result.success !== false ? 'green' : 'orange'}>
                  {JSON.stringify(step.result)}
                </Tag>
              </div>
            ))}
            <div style={{ marginTop: 16, fontWeight: 'bold' }}>
              Final Status: <Tag color={res.data.final_status === 'PUBLISHED' ? 'green' : 'blue'}>{res.data.final_status}</Tag>
            </div>
          </div>
        ),
        width: 600
      });
      fetchDashboardData();
    } catch (error) {
      message.error('Failed to process vendor');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      approved: { color: 'success', icon: <CheckCircleOutlined /> },
      pending: { color: 'processing', icon: <ClockCircleOutlined /> },
      flagged: { color: 'warning', icon: <ExclamationCircleOutlined /> },
      rejected: { color: 'error', icon: <ExclamationCircleOutlined /> }
    };
    const c = config[status] || { color: 'default', icon: null };
    return <Tag color={c.color} icon={c.icon}>{status?.toUpperCase() || 'PENDING'}</Tag>;
  };

  const menuColumns = [
    {
      title: 'Item',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (name: string, record: PendingMenuItem) => (
        <div>
          <strong>{name}</strong>
          <br />
          <small style={{ color: '#888' }}>{record.category}</small>
        </div>
      )
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price?.toFixed(2) || '0.00'}`
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence_score',
      key: 'confidence_score',
      render: (score: number | null) => (
        <Progress
          percent={score ? score * 100 : 70}
          size="small"
          status={score && score >= 0.85 ? 'success' : score && score >= 0.6 ? 'normal' : 'exception'}
          format={(p) => `${p?.toFixed(0)}%`}
        />
      )
    },
    {
      title: 'Status',
      dataIndex: 'review_status',
      key: 'review_status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PendingMenuItem) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<RobotOutlined />}
            loading={processing === `item-${record.item_id}`}
            onClick={() => handleReviewSingleItem(record.item_id)}
          >
            AI Review
          </Button>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading AI Dashboard...</p>
      </div>
    );
  }

  // Group items by vendor
  const vendorGroups = pendingItems.reduce((acc: Record<number, PendingMenuItem[]>, item) => {
    if (!acc[item.vendor_id]) acc[item.vendor_id] = [];
    acc[item.vendor_id].push(item);
    return acc;
  }, {});

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>AI Employees Dashboard</h1>
        <Button icon={<ReloadOutlined />} onClick={fetchDashboardData}>Refresh</Button>
      </div>

      {/* AI Employees Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {dashboardData?.ai_employees.map((emp) => (
          <Col span={8} key={emp.id}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Avatar size={64} style={{ backgroundColor: '#1890ff', fontSize: 32 }}>
                  {emp.avatar}
                </Avatar>
                <div>
                  <h3 style={{ margin: 0 }}>{emp.name}</h3>
                  <Tag color="blue">{emp.role}</Tag>
                  <Tag color="green">{emp.status}</Tag>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Menu Items"
              value={dashboardData?.menu_review_stats.total_items || 0}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approved"
              value={dashboardData?.menu_review_stats.approved || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Review"
              value={dashboardData?.menu_review_stats.pending || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Approval Rate"
              value={dashboardData?.menu_review_stats.approval_rate || '0%'}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Thresholds */}
      <Card title="Auto-Approval Thresholds" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Tag color="green" style={{ padding: '8px 16px', fontSize: 14 }}>
              Auto-Approve: {dashboardData?.thresholds.auto_approve}
            </Tag>
          </Col>
          <Col span={8}>
            <Tag color="orange" style={{ padding: '8px 16px', fontSize: 14 }}>
              Quick Review: {dashboardData?.thresholds.quick_review}
            </Tag>
          </Col>
          <Col span={8}>
            <Tag color="red" style={{ padding: '8px 16px', fontSize: 14 }}>
              Manual Review: {dashboardData?.thresholds.manual_review}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* Pending Items by Vendor */}
      {Object.entries(vendorGroups).map(([vendorId, items]) => (
        <Card
          key={vendorId}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Vendor #{vendorId} - {items.length} items pending</span>
              <Space>
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  loading={processing === `vendor-${vendorId}`}
                  onClick={() => handleReviewAllItems(Number(vendorId))}
                >
                  AI Review All
                </Button>
                <Button
                  type="default"
                  icon={<ThunderboltOutlined />}
                  loading={processing === `process-${vendorId}`}
                  onClick={() => handleProcessVendor(Number(vendorId))}
                >
                  Full AI Process
                </Button>
              </Space>
            </div>
          }
          style={{ marginBottom: 16 }}
        >
          <Table
            columns={menuColumns}
            dataSource={items}
            rowKey="item_id"
            pagination={false}
            size="small"
          />
        </Card>
      ))}

      {pendingItems.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <h3>All items reviewed!</h3>
            <p>No pending menu items or vendors require AI review.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AIDashboard;
