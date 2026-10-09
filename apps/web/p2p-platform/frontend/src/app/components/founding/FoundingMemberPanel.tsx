import React, { useEffect, useState } from 'react';
import { Card, Button, Select, Spin, Alert, message, Typography, Space, Divider } from 'antd';
import {
  ArrowLeftOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getFoundingStatus,
  joinFounding,
  getDriverFoundingStatus,
  joinDriverFounding,
  getCustomerCards,
  FoundingStatus,
  FoundingJoinResult,
  SavedCard,
} from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text, Paragraph } = Typography;

/**
 * FoundingMemberPanel — the $100 "Founding 10,000 per state" program for the web app.
 *
 * Shared by both the customer (/customer/founding) and driver (/driver/founding) routes
 * via the `role` prop. Contract matches backend founding_members.py:
 *   - customer: GET /api/founding/status, POST /api/founding/join
 *   - driver:   GET /api/founding/driver/status, POST /api/founding/driver/join
 *
 * Payment: customers pick a saved card (its id is the Stripe PaymentMethod id) as the
 * payment_method_id. Demo accounts bypass the charge server-side, so no card is required.
 */

type FoundingRole = 'customer' | 'driver';

interface FoundingMemberPanelProps {
  role: FoundingRole;
}

const DEMO_EMAILS = ['demo.customer@dollor.ai', 'demo.driver@dollor.ai', 'demo.restaurant@dollor.ai'];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

function getStoredEmail(role: FoundingRole): string {
  const key = role === 'customer' ? 'customer_email' : 'driver_email';
  return (globalThis.localStorage.getItem(key) || '').toLowerCase();
}

function isDemoAccount(role: FoundingRole): boolean {
  return DEMO_EMAILS.includes(getStoredEmail(role));
}

function fetchStatus(role: FoundingRole, state?: string): Promise<FoundingStatus> {
  if (role === 'driver') {
    return getDriverFoundingStatus(state);
  }
  return getFoundingStatus(state);
}

function submitJoin(role: FoundingRole, state: string, paymentMethodId?: string): Promise<FoundingJoinResult> {
  if (role === 'driver') {
    return joinDriverFounding(state, paymentMethodId);
  }
  return joinFounding(state, paymentMethodId);
}

function FoundingMemberPanel(props: FoundingMemberPanelProps): React.ReactElement {
  const { role } = props;
  const navigate = useNavigate();

  const [status, setStatus] = useState<FoundingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('');
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [joining, setJoining] = useState(false);

  const demo = isDemoAccount(role);
  const customerId = globalThis.localStorage.getItem('customer_id');

  const loadStatus = async (state?: string): Promise<void> => {
    setLoading(true);
    try {
      const data = await fetchStatus(role, state);
      setStatus(data);
      if (!state && data.founder_state) {
        setSelectedState(data.founder_state);
      }
    } catch (error) {
      console.error('Failed to load founding status:', error);
      message.error('Could not load Founding Member status. Please log in and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async (): Promise<void> => {
    if (role !== 'customer' || !customerId) {
      return;
    }
    try {
      const saved = await getCustomerCards(customerId);
      setCards(saved);
      const defaultCard = saved.find((card) => card.is_default) || saved[0];
      if (defaultCard) {
        setSelectedCardId(defaultCard.id);
      }
    } catch (error) {
      console.error('Failed to load saved cards:', error);
    }
  };

  useEffect(() => {
    loadStatus();
    loadCards();
    // role is stable per mount; intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleStateChange = (value: string): void => {
    setSelectedState(value);
    loadStatus(value);
  };

  const resolvePaymentMethodId = (): string | undefined => {
    if (demo) {
      return undefined;
    }
    if (role === 'customer') {
      return selectedCardId || undefined;
    }
    return undefined;
  };

  const needsCardSelection = !demo && role === 'customer';
  const driverNeedsAppPayment = !demo && role === 'driver';

  const canJoin = (): boolean => {
    if (!status || !status.eligible_to_join) {
      return false;
    }
    if (!selectedState) {
      return false;
    }
    if (typeof status.slots_remaining === 'number' && status.slots_remaining <= 0) {
      return false;
    }
    if (needsCardSelection && !selectedCardId) {
      return false;
    }
    if (driverNeedsAppPayment) {
      return false;
    }
    return true;
  };

  const handleJoin = async (): Promise<void> => {
    if (!selectedState) {
      message.warning('Please select your state first.');
      return;
    }
    setJoining(true);
    try {
      const result = await submitJoin(role, selectedState, resolvePaymentMethodId());
      message.success('Welcome aboard — your platform fee is now locked for life!');
      setStatus((prev) => (prev ? { ...prev, is_founder: result.is_founder, eligible_to_join: false, founder_state: result.state, slots_remaining: result.slots_remaining } : prev));
    } catch (error) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || 'Could not complete your Founding Member join.');
    } finally {
      setJoining(false);
    }
  };

  const roleLabel = role === 'driver' ? 'Driver' : 'Rider';
  const depositUsd = status?.deposit_usd ?? 100;

  if (loading && !status) {
    return (
      <div className="founding-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="founding-screen">
      <div className="founding-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="back-btn" />
        <Title level={4} style={{ margin: 0 }}>Founding Membership</Title>
        <span style={{ width: 32 }} />
      </div>

      <Card className="founding-hero">
        <Space align="center" size="middle">
          <div className="crown-badge">
            <CrownOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0 }}>Founding {roleLabel}</Title>
            <Text type="secondary">One-time ${depositUsd} · non-refundable · limited to 10,000 per state</Text>
          </div>
        </Space>

        {status?.is_founder && (
          <Alert
            style={{ marginTop: 16 }}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={`You're a Founding ${roleLabel}${status.founder_state ? ` in ${status.founder_state}` : ''}`}
            description="Your platform fee is locked for life and you're protected from future fee and surge increases."
          />
        )}
      </Card>

      <Card className="founding-benefits" title="What you get">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space align="start">
            <LockOutlined style={{ color: DollorTheme.Brand.green, fontSize: 18 }} />
            <div>
              <Text strong>Platform fee locked for life</Text>
              <Paragraph style={{ margin: 0 }} type="secondary">
                {status?.benefit || "Lock today's platform fee for life and stay protected from future fee / surge increases. Government fees still apply."}
              </Paragraph>
            </div>
          </Space>
          <Space align="start">
            <ThunderboltOutlined style={{ color: DollorTheme.Brand.orange, fontSize: 18 }} />
            <div>
              <Text strong>Surge protection</Text>
              <Paragraph style={{ margin: 0 }} type="secondary">
                You're shielded from future surge-pricing increases that apply to everyone else.
              </Paragraph>
            </div>
          </Space>
          <Space align="start">
            <SafetyCertificateOutlined style={{ color: DollorTheme.Brand.blue, fontSize: 18 }} />
            <div>
              <Text strong>Transparent receipts</Text>
              <Paragraph style={{ margin: 0 }} type="secondary">
                Your locked platform fee is itemized on every receipt. Government / regulatory fees still pass through.
              </Paragraph>
            </div>
          </Space>
        </Space>
      </Card>

      <Card className="founding-status" title="Your eligibility">
        <div className="status-grid">
          <div className="status-cell">
            <Text type="secondary">Rides taken</Text>
            <Text strong>{status?.rides_taken ?? 0} / {status?.claim_window_rides ?? 3} window</Text>
          </div>
          <div className="status-cell">
            <Text type="secondary">Deposit</Text>
            <Text strong>${depositUsd} (non-refundable)</Text>
          </div>
          <div className="status-cell">
            <Text type="secondary">Slots remaining</Text>
            <Text strong>
              {typeof status?.slots_remaining === 'number'
                ? status.slots_remaining.toLocaleString()
                : 'Select a state'}
            </Text>
          </div>
        </div>

        {!status?.is_founder && !status?.eligible_to_join && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="The founding offer is only available within your first 3 rides"
            description="Your claim window has closed, so this offer is no longer available on this account."
          />
        )}
      </Card>

      {!status?.is_founder && status?.eligible_to_join && (
        <Card className="founding-join" title={`Join for $${depositUsd}`}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Your state</Text>
              <Select
                showSearch
                placeholder="Select your state"
                value={selectedState || undefined}
                onChange={handleStateChange}
                style={{ width: '100%', marginTop: 8 }}
                options={US_STATES.map((code) => ({ value: code, label: code }))}
              />
            </div>

            {needsCardSelection && (
              <div>
                <Text strong>Payment card</Text>
                {cards.length > 0 ? (
                  <Select
                    placeholder="Select a saved card"
                    value={selectedCardId || undefined}
                    onChange={setSelectedCardId}
                    style={{ width: '100%', marginTop: 8 }}
                    options={cards.map((card) => ({
                      value: card.id,
                      label: `${card.brand?.toUpperCase() || 'Card'} •••• ${card.last4} (exp ${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)})`,
                    }))}
                  />
                ) : (
                  <Alert
                    style={{ marginTop: 8 }}
                    type="info"
                    showIcon
                    icon={<CreditCardOutlined />}
                    message="No saved card"
                    description={
                      <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/customer/payment-methods')}>
                        Add a payment method first
                      </Button>
                    }
                  />
                )}
              </div>
            )}

            {driverNeedsAppPayment && (
              <Alert
                type="info"
                showIcon
                icon={<CreditCardOutlined />}
                message="Finish your $100 join in the Dollor driver app"
                description="Card payment for drivers is collected in the mobile app. Open Dollor on your phone to complete the one-time founding payment."
              />
            )}

            {demo && (
              <Alert
                type="success"
                showIcon
                message="Demo account — payment bypassed"
                description="This demo account joins without a real charge."
              />
            )}

            <Divider style={{ margin: '8px 0' }} />

            <Button
              type="primary"
              size="large"
              block
              loading={joining}
              disabled={!canJoin()}
              onClick={handleJoin}
              style={{ background: DollorTheme.Brand.green }}
            >
              Join for ${depositUsd}
            </Button>
            <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
              ${depositUsd} is non-refundable. Government / regulatory fees are not included and still apply.
            </Text>
          </Space>
        </Card>
      )}

      <style>{`
        .founding-screen {
          max-width: 760px;
          margin: 0 auto;
          padding: 0 16px 32px 16px;
        }
        .founding-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 320px;
        }
        .founding-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
        }
        .back-btn {
          font-size: 18px;
        }
        .founding-hero,
        .founding-benefits,
        .founding-status,
        .founding-join {
          border-radius: 12px;
          margin-bottom: 16px;
          box-shadow: ${DollorTheme.Shadow.card};
        }
        .crown-badge {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: ${DollorTheme.Brand.orange};
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .status-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        @media (max-width: 576px) {
          .founding-header {
            padding: 12px 0;
          }
        }
      `}</style>
    </div>
  );
}

export default FoundingMemberPanel;
