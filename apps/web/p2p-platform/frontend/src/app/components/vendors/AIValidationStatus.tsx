import React, { useState, useEffect } from 'react';
import { Card, Steps, Progress, Alert, Button, Table, Tag, Space, Spin, Typography, Divider, Badge, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  DollarOutlined,
  ShoppingOutlined,
  SafetyOutlined,
  RocketOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import brand from '../../config/brand';

const { Title, Text, Paragraph } = Typography;
const API_URL = getApiUrl();

interface AIValidationStatusProps {
  vendorId: number;
  onActivate?: () => void;
}

interface DiscrepancyItem {
  item_id: number;
  item_name: string;
  current_price: number;
  source_price: number;
  difference: number;
  status: string;
  suggestion: string;
}

interface BundleSuggestion {
  id: string;
  name: string;
  description: string;
  type: string;
  items: { id: number; name: string; price: number }[];
  original_price: number;
  bundle_price: number;
  savings: number;
  discount_percentage: number;
  ai_reason: string;
  projected_orders_increase: string;
}

interface ValidationData {
  status: string;
  items_count: number;
  verified_count: number;
  discrepancies_count: number;
  discrepancies: DiscrepancyItem[];
  can_activate: boolean;
  message: string;
  processed_by: string;
}

const AIValidationStatus: React.FC<AIValidationStatusProps> = ({ vendorId, onActivate }) => {
  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [bundles, setBundles] = useState<BundleSuggestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activating, setActivating] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchValidationStatus();
    fetchBundleSuggestions();
  }, [vendorId]);

  const fetchValidationStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/menu-verification/status/${vendorId}`);
      setValidationData(response.data);

      // Determine current step based on status
      if (response.data.status === 'active') {
        setCurrentStep(3);
      } else if (response.data.can_activate) {
        setCurrentStep(2);
      } else if (response.data.items_count > 0) {
        setCurrentStep(1);
      } else {
        setCurrentStep(0);
      }
    } catch (error) {
      console.error('Error fetching validation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBundleSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/menu-verification/bundle-suggestions/${vendorId}`);
      setBundles(response.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching bundles:', error);
    }
  };

  const handleApproveAll = async () => {
    try {
      setApproving(true);
      await axios.post(`${API_URL}/api/menu-verification/approve-all/${vendorId}`);
      message.success('All prices approved by Aria!');
      await fetchValidationStatus();
    } catch (error) {
      message.error('Failed to approve prices');
    } finally {
      setApproving(false);
    }
  };

  const handleActivateMenu = async () => {
    try {
      setActivating(true);
      await axios.post(`${API_URL}/api/menu-verification/activate/${vendorId}`);
      message.success('Menu is now LIVE! Customers can order from your restaurant.');
      await fetchValidationStatus();
      onActivate?.();
    } catch (error) {
      message.error('Failed to activate menu');
    } finally {
      setActivating(false);
    }
  };

  const discrepancyColumns = [
    {
      title: 'Item',
      dataIndex: 'item_name',
      key: 'item_name',
    },
    {
      title: 'Your Price',
      dataIndex: 'current_price',
      key: 'current_price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: 'Suggested Price',
      dataIndex: 'source_price',
      key: 'source_price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: 'Difference',
      dataIndex: 'difference',
      key: 'difference',
      render: (diff: number) => (
        <Tag color={diff > 0 ? 'red' : 'green'}>
          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="orange" icon={<ExclamationCircleOutlined />}>
          Review
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <Card className="ai-validation-card">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>
            <RobotOutlined style={{ marginRight: 8 }} />
            Aria is analyzing your menu...
          </Paragraph>
        </div>
      </Card>
    );
  }

  return (
    <div className="ai-validation-container">
      {/* AI Employee Header */}
      <Card className="ai-header-card">
        <div className="ai-header">
          <div className="ai-avatar">
            <RobotOutlined />
          </div>
          <div className="ai-info">
            <Title level={4} style={{ margin: 0 }}>
              Aria - Menu Quality Analyst
            </Title>
            <Text type="secondary">AI Employee ID: AI_EMP_010</Text>
          </div>
          <Badge
            status="processing"
            text={<Text style={{ color: brand.colors.success }}>Online & Working</Text>}
          />
        </div>
      </Card>

      {/* Progress Steps */}
      <Card className="steps-card">
        <Steps current={currentStep}>
          <Steps.Step
            title="Menu Imported"
            description={`${validationData?.items_count || 0} items`}
            icon={<ShoppingOutlined />}
          />
          <Steps.Step
            title="Price Verification"
            description="AI Quality Check"
            icon={<DollarOutlined />}
          />
          <Steps.Step
            title="Ready to Activate"
            description="Final Review"
            icon={<SafetyOutlined />}
          />
          <Steps.Step
            title="Live on App"
            description="Customers Ordering"
            icon={<RocketOutlined />}
          />
        </Steps>
      </Card>

      {/* Validation Status */}
      <Card className="status-card">
        <div className="status-header">
          <Title level={4}>
            {validationData?.can_activate ? (
              <CheckCircleOutlined style={{ color: brand.colors.success, marginRight: 8 }} />
            ) : (
              <ClockCircleOutlined style={{ color: brand.colors.accent, marginRight: 8 }} />
            )}
            Verification Status
          </Title>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchValidationStatus}
            size="small"
          >
            Refresh
          </Button>
        </div>

        <div className="progress-section">
          <Progress
            percent={Math.round(((validationData?.verified_count || 0) / (validationData?.items_count || 1)) * 100)}
            status={validationData?.can_activate ? 'success' : 'active'}
            strokeColor={brand.colors.primary}
          />
          <div className="stats-row">
            <div className="stat">
              <Text type="secondary">Total Items</Text>
              <Title level={3}>{validationData?.items_count || 0}</Title>
            </div>
            <div className="stat">
              <Text type="secondary">Verified</Text>
              <Title level={3} style={{ color: brand.colors.success }}>
                {validationData?.verified_count || 0}
              </Title>
            </div>
            <div className="stat">
              <Text type="secondary">Need Review</Text>
              <Title level={3} style={{ color: brand.colors.accent }}>
                {validationData?.discrepancies_count || 0}
              </Title>
            </div>
          </div>
        </div>

        <Alert
          message={validationData?.message}
          type={validationData?.can_activate ? 'success' : 'info'}
          showIcon
          icon={<RobotOutlined />}
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* Discrepancies Table */}
      {validationData?.discrepancies && validationData.discrepancies.length > 0 && (
        <Card className="discrepancies-card">
          <Title level={4}>
            <ExclamationCircleOutlined style={{ color: brand.colors.accent, marginRight: 8 }} />
            Items Needing Review ({validationData.discrepancies.length})
          </Title>
          <Paragraph type="secondary">
            Aria detected potential price discrepancies. Review and approve to continue.
          </Paragraph>

          <Table
            dataSource={validationData.discrepancies}
            columns={discrepancyColumns}
            rowKey="item_id"
            pagination={false}
            size="small"
          />

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              loading={approving}
              onClick={handleApproveAll}
              style={{ background: brand.gradients.primary, border: 'none' }}
            >
              Approve All Prices as Correct
            </Button>
          </div>
        </Card>
      )}

      {/* Bundle Suggestions */}
      {bundles.length > 0 && (
        <Card className="bundles-card">
          <Title level={4}>
            <RobotOutlined style={{ color: brand.colors.secondary, marginRight: 8 }} />
            AI Bundle Suggestions by Aria
          </Title>
          <Paragraph type="secondary">
            Smart combo recommendations to increase your average order value
          </Paragraph>

          <div className="bundles-grid">
            {bundles.slice(0, 3).map((bundle) => (
              <Card key={bundle.id} className="bundle-item" size="small">
                <div className="bundle-header">
                  <Text strong>{bundle.name}</Text>
                  <Tag color="green">{bundle.projected_orders_increase}</Tag>
                </div>
                <Text type="secondary" className="bundle-desc">{bundle.description}</Text>
                <div className="bundle-pricing">
                  <Text delete style={{ marginRight: 8 }}>${bundle.original_price.toFixed(2)}</Text>
                  <Text strong style={{ color: brand.colors.primary, fontSize: 18 }}>
                    ${bundle.bundle_price.toFixed(2)}
                  </Text>
                  <Tag color="red" style={{ marginLeft: 8 }}>Save ${bundle.savings.toFixed(2)}</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  {bundle.ai_reason}
                </Text>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Activation Button */}
      {validationData?.can_activate && currentStep < 3 && (
        <Card className="activate-card">
          <div className="activate-content">
            <RocketOutlined className="activate-icon" />
            <Title level={3}>Ready to Go Live!</Title>
            <Paragraph>
              Aria has verified your menu. Your restaurant is ready to start receiving orders!
            </Paragraph>
            <Button
              type="primary"
              size="large"
              loading={activating}
              onClick={handleActivateMenu}
              icon={<RocketOutlined />}
              className="activate-button"
            >
              Activate Menu & Go Live
            </Button>
          </div>
        </Card>
      )}

      {/* Already Active */}
      {currentStep === 3 && (
        <Alert
          message="Your Restaurant is LIVE!"
          description="Customers can now order from your restaurant on the $ai app. Orders will appear in your vendor dashboard."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}

      <style>{`
        .ai-validation-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .ai-header-card {
          margin-bottom: 16px;
          border-radius: 12px;
        }

        .ai-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ai-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${brand.gradients.secondary};
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-avatar .anticon {
          font-size: 28px;
          color: white;
        }

        .ai-info {
          flex: 1;
        }

        .steps-card {
          margin-bottom: 16px;
          border-radius: 12px;
        }

        .status-card {
          margin-bottom: 16px;
          border-radius: 12px;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .status-header h4 {
          margin: 0 !important;
        }

        .progress-section {
          margin-bottom: 16px;
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          margin-top: 24px;
        }

        .stat {
          text-align: center;
        }

        .stat h3 {
          margin: 8px 0 0 0 !important;
        }

        .discrepancies-card {
          margin-bottom: 16px;
          border-radius: 12px;
          border: 1px solid ${brand.colors.accent};
        }

        .bundles-card {
          margin-bottom: 16px;
          border-radius: 12px;
        }

        .bundles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .bundle-item {
          border-radius: 8px;
        }

        .bundle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .bundle-desc {
          display: block;
          margin-bottom: 12px;
        }

        .bundle-pricing {
          display: flex;
          align-items: center;
        }

        .activate-card {
          border-radius: 12px;
          background: ${brand.gradients.primary};
          color: white;
        }

        .activate-content {
          text-align: center;
          padding: 24px;
        }

        .activate-icon {
          font-size: 48px;
          color: white;
          margin-bottom: 16px;
        }

        .activate-content h3,
        .activate-content p {
          color: white !important;
        }

        .activate-button {
          background: white !important;
          color: ${brand.colors.primary} !important;
          border: none !important;
          font-weight: 600 !important;
          height: 48px !important;
          padding: 0 32px !important;
        }
      `}</style>
    </div>
  );
};

export default AIValidationStatus;
