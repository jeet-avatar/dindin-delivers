import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Tag, Modal, Form, Input, Select, message, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  DollarOutlined,
  PlusOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  LoadingOutlined,
  LockOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text } = Typography;

/**
 * CustomerPaymentMethods - Manage saved payment cards
 * Matches iOS PaymentMethodsView.swift for platform parity
 */

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  cardholder_name?: string;
}

// Card brand display info
const cardBrands: { [key: string]: { name: string; color: string } } = {
  visa: { name: 'Visa', color: '#1A1F71' },
  mastercard: { name: 'Mastercard', color: '#EB001B' },
  amex: { name: 'American Express', color: '#006FCF' },
  discover: { name: 'Discover', color: '#FF6000' },
  diners: { name: 'Diners Club', color: '#0079BE' },
  jcb: { name: 'JCB', color: '#0B4EA2' },
  unionpay: { name: 'UnionPay', color: '#DD0000' },
  unknown: { name: 'Card', color: '#666666' }
};

const CustomerPaymentMethods: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null);
  const [form] = Form.useForm();

  const customerId = localStorage.getItem('customer_id');

  useEffect(() => {
    if (customerId) {
      fetchCards();
    } else {
      message.error('Please log in to view payment methods');
      navigate('/customer/login');
    }
  }, [customerId]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('customer_token');
      const response = await axios.get(`${API_URL}/api/customers/${customerId}/cards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCards(response.data?.cards || []);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (values: any) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('customer_token');

      // Parse expiry date (MM/YY format)
      const [expMonth, expYear] = values.expiry.split('/').map((v: string) => parseInt(v.trim()));

      const cardData = {
        card_number: values.card_number.replace(/\s/g, ''),
        exp_month: expMonth,
        exp_year: 2000 + expYear,
        cvc: values.cvc,
        cardholder_name: values.cardholder_name
      };

      await axios.post(
        `${API_URL}/api/customers/${customerId}/cards`,
        cardData,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      message.success('Card added successfully');
      setShowAddModal(false);
      form.resetFields();
      fetchCards();
    } catch (error: any) {
      console.error('Failed to add card:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to add card';
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      const token = localStorage.getItem('customer_token');
      await axios.delete(`${API_URL}/api/customers/${customerId}/cards/${cardToDelete.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      message.success('Card removed');
      setCardToDelete(null);
      fetchCards();
    } catch (error) {
      console.error('Failed to delete card:', error);
      message.error('Failed to remove card');
    }
  };

  const handleSetDefault = async (card: SavedCard) => {
    try {
      const token = localStorage.getItem('customer_token');
      await axios.post(
        `${API_URL}/api/customers/${customerId}/cards/${card.id}/default`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      message.success('Default card updated');
      fetchCards();
    } catch (error) {
      console.error('Failed to set default card:', error);
      message.error('Failed to set default card');
    }
  };

  const getBrandInfo = (brand: string) => {
    return cardBrands[brand?.toLowerCase()] || cardBrands.unknown;
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="payment-methods-screen">
      {/* Header */}
      <div className="screen-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-btn"
        />
        <Title level={4} style={{ margin: 0 }}>Payment Methods</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            setShowAddModal(true);
          }}
          style={{ background: DollorTheme.Brand.green }}
        >
          Add
        </Button>
      </div>

      {/* Cards List */}
      {cards.length === 0 ? (
        <Card className="empty-card">
          <Empty
            image={<CreditCardOutlined style={{ fontSize: 64, color: DollorTheme.Text.tertiary }} />}
            description={
              <div>
                <Text strong style={{ fontSize: 16 }}>No saved cards</Text>
                <br />
                <Text type="secondary">Add a card to make checkout faster</Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddModal(true)}
              style={{ background: DollorTheme.Brand.green }}
            >
              Add Card
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card className="cards-list-card">
          <List
            dataSource={cards}
            renderItem={(card) => {
              const brandInfo = getBrandInfo(card.brand);
              return (
                <List.Item className="card-item">
                  <div className="card-content">
                    <div
                      className="card-icon"
                      style={{ backgroundColor: brandInfo.color }}
                    >
                      <CreditCardOutlined style={{ color: '#fff', fontSize: 20 }} />
                    </div>
                    <div className="card-details">
                      <div className="card-header">
                        <Text strong>{brandInfo.name} •••• {card.last4}</Text>
                        {card.is_default && (
                          <Tag color="green" style={{ marginLeft: 8 }}>Default</Tag>
                        )}
                      </div>
                      <Text type="secondary" className="card-expiry">
                        Expires {card.exp_month.toString().padStart(2, '0')}/{card.exp_year.toString().slice(-2)}
                      </Text>
                    </div>
                    <div className="card-actions">
                      {!card.is_default && (
                        <Button
                          type="text"
                          icon={<StarOutlined />}
                          onClick={() => handleSetDefault(card)}
                          title="Set as default"
                        />
                      )}
                      {card.is_default && (
                        <StarFilled style={{ color: DollorTheme.Brand.orange, padding: '8px' }} />
                      )}
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setCardToDelete(card)}
                      />
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />

          {/* Cash on Delivery option */}
          <div className="cash-option">
            <div className="card-content">
              <div
                className="card-icon"
                style={{ backgroundColor: DollorTheme.Brand.green }}
              >
                <DollarOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div className="card-details">
                <Text strong>Cash on Delivery</Text>
                <Text type="secondary" className="card-expiry">
                  Pay when you receive your order
                </Text>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Add Card Modal */}
      <Modal
        title="Add Payment Card"
        open={showAddModal}
        onCancel={() => {
          setShowAddModal(false);
          form.resetFields();
        }}
        footer={null}
        width={450}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddCard}
        >
          <Form.Item
            name="card_number"
            label="Card Number"
            rules={[
              { required: true, message: 'Please enter card number' },
              { min: 18, message: 'Please enter a valid card number' }
            ]}
            getValueFromEvent={(e) => formatCardNumber(e.target.value)}
          >
            <Input
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              prefix={<CreditCardOutlined />}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="expiry"
              label="Expiry Date"
              rules={[
                { required: true, message: 'Required' },
                { pattern: /^\d{2}\/\d{2}$/, message: 'MM/YY format' }
              ]}
              style={{ flex: 1 }}
              getValueFromEvent={(e) => formatExpiry(e.target.value)}
            >
              <Input placeholder="MM/YY" maxLength={5} />
            </Form.Item>

            <Form.Item
              name="cvc"
              label="CVV"
              rules={[
                { required: true, message: 'Required' },
                { min: 3, max: 4, message: '3-4 digits' }
              ]}
              style={{ width: 100 }}
            >
              <Input.Password
                placeholder="123"
                maxLength={4}
                visibilityToggle={false}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="cardholder_name"
            label="Cardholder Name"
            rules={[{ required: true, message: 'Please enter cardholder name' }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          {/* Security Notice */}
          <div className="security-notice">
            <SafetyCertificateOutlined style={{ color: DollorTheme.Brand.green, marginRight: 8 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Your card information is securely processed by Stripe
            </Text>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
              size="large"
              style={{ background: DollorTheme.Brand.green }}
            >
              Add Card
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Remove Card?"
        open={!!cardToDelete}
        onCancel={() => setCardToDelete(null)}
        onOk={handleDeleteCard}
        okText="Remove"
        okButtonProps={{ danger: true }}
      >
        {cardToDelete && (
          <Text>
            Are you sure you want to remove {getBrandInfo(cardToDelete.brand).name} •••• {cardToDelete.last4}?
          </Text>
        )}
      </Modal>

      <style>{`
        .payment-methods-screen {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 16px 24px 16px;
          background: ${DollorTheme.Background.primary};
          min-height: 100vh;
        }

        .screen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          position: sticky;
          top: 0;
          background: ${DollorTheme.Background.primary};
          z-index: 10;
        }

        .back-btn {
          font-size: 18px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .empty-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
          text-align: center;
          padding: 40px 20px;
        }

        .cards-list-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
        }

        .cards-list-card .ant-card-body {
          padding: 0;
        }

        .card-item {
          padding: 16px 20px !important;
          border-bottom: 1px solid ${DollorTheme.Border.light};
          transition: background 0.2s;
        }

        .card-item:last-child {
          border-bottom: none;
        }

        .card-item:hover {
          background: ${DollorTheme.Background.tertiary};
        }

        .card-content {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .card-icon {
          width: 48px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-details {
          flex: 1;
          min-width: 0;
        }

        .card-header {
          display: flex;
          align-items: center;
          margin-bottom: 2px;
        }

        .card-expiry {
          display: block;
          font-size: 13px;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .cash-option {
          padding: 16px 20px;
          border-top: 1px solid ${DollorTheme.Border.light};
          background: ${DollorTheme.Background.secondary};
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }

        .security-notice {
          display: flex;
          align-items: center;
          padding: 12px;
          background: ${DollorTheme.Background.secondary};
          border-radius: 8px;
          margin-top: 8px;
        }

        @media (max-width: 576px) {
          .screen-header {
            padding: 12px 0;
          }

          .card-content {
            flex-wrap: wrap;
          }

          .card-actions {
            width: 100%;
            justify-content: flex-end;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed ${DollorTheme.Border.light};
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerPaymentMethods;
