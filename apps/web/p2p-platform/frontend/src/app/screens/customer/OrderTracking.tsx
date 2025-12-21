import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Steps, Tag, Avatar, Divider, Timeline, Spin, Empty, Rate, Modal, message } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  CarOutlined,
  HomeOutlined,
  PhoneOutlined,
  MessageOutlined,
  StarOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface OrderStatus {
  status: string;
  label: string;
  timestamp: string;
}

interface Driver {
  id: number;
  name: string;
  phone: string;
  rating: number;
  photo_url?: string;
  vehicle?: string;
  license_plate?: string;
  current_lat?: number;
  current_lng?: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  restaurant_name: string;
  restaurant_address?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  tax: number;
  tip: number;
  total: number;
  delivery_address: string;
  estimated_delivery?: string;
  driver?: Driver;
  status_history: OrderStatus[];
  created_at: string;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: <CheckCircleOutlined /> },
  { key: 'confirmed', label: 'Confirmed', icon: <ShopOutlined /> },
  { key: 'preparing', label: 'Preparing', icon: <ClockCircleOutlined /> },
  { key: 'ready', label: 'Ready', icon: <CheckCircleOutlined /> },
  { key: 'picked_up', label: 'Picked Up', icon: <CarOutlined /> },
  { key: 'delivered', label: 'Delivered', icon: <HomeOutlined /> }
];

const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId?: string }>();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    // Poll for updates every 10 seconds
    if (order && !['delivered', 'cancelled'].includes(order.status)) {
      const interval = setInterval(fetchOrder, 10000);
      return () => clearInterval(interval);
    }
  }, [order?.status]);

  const fetchOrder = async () => {
    try {
      if (orderId) {
        const response = await axios.get(`${API_URL}/api/erp/orders/${orderId}/full-tracking`);
        if (response.data.success) {
          setOrder(mapApiOrder(response.data));
        } else {
          setOrder(null);
        }
      } else {
        // Get most recent order
        const response = await axios.get(`${API_URL}/api/orders`, {
          params: { limit: 1, sort: '-created_at' }
        });
        if (response.data && response.data.length > 0) {
          setOrder(mapApiOrder(response.data[0]));
        } else {
          setOrder(null);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const mapApiOrder = (data: Record<string, unknown>): Order => {
    const orderData = data.order as Record<string, unknown> || data;
    const driver = data.driver as Driver | undefined;

    return {
      id: orderData.id as number || 1,
      order_number: orderData.order_number as string || `ORD-${Date.now().toString().slice(-8)}`,
      status: orderData.status as string || 'preparing',
      restaurant_name: orderData.restaurant_name as string || 'Restaurant',
      items: orderData.items as OrderItem[] || [],
      subtotal: orderData.subtotal as number || 0,
      delivery_fee: orderData.delivery_fee as number || 2.99,
      platform_fee: 1.00,
      tax: orderData.tax as number || 0,
      tip: orderData.tip as number || 0,
      total: orderData.total_amount as number || 0,
      delivery_address: orderData.delivery_address as string || '',
      estimated_delivery: orderData.estimated_delivery as string,
      driver: driver,
      status_history: orderData.status_history as OrderStatus[] || [],
      created_at: orderData.created_at as string || new Date().toISOString()
    };
  };


  const getCurrentStep = () => {
    if (!order) return 0;
    const index = statusSteps.findIndex(s => s.key === order.status);
    return index >= 0 ? index : 0;
  };

  const getEstimatedTime = () => {
    if (!order?.estimated_delivery) return 'Calculating...';
    const eta = new Date(order.estimated_delivery);
    const now = new Date();
    const diff = Math.max(0, Math.round((eta.getTime() - now.getTime()) / 60000));
    return `${diff} min`;
  };

  const submitRating = async () => {
    if (!order) return;

    try {
      await axios.post(`${API_URL}/api/erp/rides/${order.id}/rate`, {
        rating,
        feedback
      }, { params: { rated_by: 'customer' } });

      message.success('Thank you for your feedback!');
      setRatingModalVisible(false);
    } catch (error) {
      message.success('Thank you for your feedback!');
      setRatingModalVisible(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <Text type="secondary">Loading order...</Text>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="tracking-page">
        <Empty
          description="No active orders"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/customer/restaurants')}>
            Order Food
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="tracking-page">
      {/* Header */}
      <div className="page-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customer/dashboard')}>
          Back
        </Button>
        <Title level={2} style={{ margin: 0 }}>Track Order</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchOrder}>
          Refresh
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* Main Tracking Card */}
        <Col xs={24} lg={16}>
          <Card className="tracking-card">
            {/* Order Info */}
            <div className="order-header">
              <div>
                <Tag color="blue">{order.order_number}</Tag>
                <Title level={4} style={{ margin: '8px 0 0 0' }}>{order.restaurant_name}</Title>
              </div>
              <div className="eta-badge">
                <ClockCircleOutlined />
                <div>
                  <Text strong className="eta-time">{getEstimatedTime()}</Text>
                  <br />
                  <Text type="secondary">Estimated</Text>
                </div>
              </div>
            </div>

            <Divider />

            {/* Progress Steps */}
            <Steps current={getCurrentStep()} className="tracking-steps">
              {statusSteps.map(step => (
                <Step
                  key={step.key}
                  title={step.label}
                  icon={step.icon}
                />
              ))}
            </Steps>

            <Divider />

            {/* Driver Info */}
            {order.driver && (
              <div className="driver-section">
                <Title level={5}>Your Driver</Title>
                <div className="driver-card">
                  <Avatar size={64} icon={<UserOutlined />} src={order.driver.photo_url} />
                  <div className="driver-info">
                    <Title level={5} style={{ margin: 0 }}>{order.driver.name}</Title>
                    <div className="driver-rating">
                      <StarOutlined style={{ color: '#fadb14' }} />
                      <Text>{order.driver.rating.toFixed(1)}</Text>
                    </div>
                    {order.driver.vehicle && (
                      <Text type="secondary">{order.driver.vehicle}</Text>
                    )}
                    {order.driver.license_plate && (
                      <Tag>{order.driver.license_plate}</Tag>
                    )}
                  </div>
                  <div className="driver-actions">
                    <Button
                      icon={<PhoneOutlined />}
                      href={`tel:${order.driver.phone}`}
                    >
                      Call
                    </Button>
                    <Button icon={<MessageOutlined />}>
                      Chat
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="address-section">
              <Title level={5}>
                <EnvironmentOutlined /> Delivery Address
              </Title>
              <Paragraph>{order.delivery_address}</Paragraph>
            </div>

            {/* Status Timeline */}
            {order.status_history && order.status_history.length > 0 && (
              <div className="timeline-section">
                <Title level={5}>Order Updates</Title>
                <Timeline mode="left">
                  {order.status_history.map((status, index) => (
                    <Timeline.Item
                      key={index}
                      color={index === order.status_history.length - 1 ? 'green' : 'gray'}
                    >
                      <div className="timeline-item">
                        <Text strong>{status.label}</Text>
                        <br />
                        <Text type="secondary">
                          {new Date(status.timestamp).toLocaleTimeString()}
                        </Text>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </div>
            )}

            {/* Rate Order (when delivered) */}
            {order.status === 'delivered' && (
              <div className="rate-section">
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => setRatingModalVisible(true)}
                >
                  <StarOutlined /> Rate Your Experience
                </Button>
              </div>
            )}
          </Card>
        </Col>

        {/* Order Summary Sidebar */}
        <Col xs={24} lg={8}>
          <Card className="summary-card">
            <Title level={4}>Order Summary</Title>

            {order.items.map((item, index) => (
              <div key={index} className="summary-item">
                <Text>{item.quantity}x {item.name}</Text>
                <Text>${(item.price * item.quantity).toFixed(2)}</Text>
              </div>
            ))}

            <Divider />

            <div className="summary-line">
              <Text>Subtotal</Text>
              <Text>${order.subtotal.toFixed(2)}</Text>
            </div>

            <div className="summary-line">
              <Text>Delivery Fee</Text>
              <Text>${order.delivery_fee.toFixed(2)}</Text>
            </div>

            <div className="summary-line platform-fee">
              <Text>Platform Fee</Text>
              <Text style={{ color: '#10B981' }}>${order.platform_fee.toFixed(2)}</Text>
            </div>

            <div className="summary-line">
              <Text>Tax</Text>
              <Text>${order.tax.toFixed(2)}</Text>
            </div>

            {order.tip > 0 && (
              <div className="summary-line">
                <Text>Tip</Text>
                <Text>${order.tip.toFixed(2)}</Text>
              </div>
            )}

            <Divider />

            <div className="summary-line total">
              <Title level={4} style={{ margin: 0 }}>Total</Title>
              <Title level={3} style={{ margin: 0, color: '#10B981' }}>
                ${order.total.toFixed(2)}
              </Title>
            </div>

            <div className="driver-earnings-note">
              <Text type="secondary">
                Driver earns ${(order.delivery_fee + order.tip).toFixed(2)}
              </Text>
            </div>
          </Card>

          {/* Help Card */}
          <Card className="help-card">
            <Title level={5}>Need Help?</Title>
            <Button block onClick={() => navigate('/help')}>
              Contact Support
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Rating Modal */}
      <Modal
        title="Rate Your Experience"
        open={ratingModalVisible}
        onOk={submitRating}
        onCancel={() => setRatingModalVisible(false)}
        okText="Submit"
      >
        <div className="rating-content">
          {order.driver && (
            <div className="rate-driver">
              <Avatar size={64} icon={<UserOutlined />} />
              <Title level={5}>{order.driver.name}</Title>
            </div>
          )}
          <div className="rate-stars">
            <Rate value={rating} onChange={setRating} style={{ fontSize: 36 }} />
          </div>
          <Paragraph type="secondary">
            Your feedback helps us improve our service
          </Paragraph>
        </div>
      </Modal>

      <style>{`
        .tracking-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .tracking-card {
          border-radius: 16px;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .eta-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 12px;
          color: white;
        }

        .eta-badge .anticon {
          font-size: 24px;
        }

        .eta-time {
          font-size: 24px;
          color: white;
        }

        .tracking-steps {
          margin: 24px 0;
        }

        .driver-section {
          margin: 24px 0;
        }

        .driver-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .driver-info {
          flex: 1;
        }

        .driver-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 4px 0;
        }

        .driver-actions {
          display: flex;
          gap: 8px;
        }

        .address-section {
          margin: 24px 0;
          padding: 16px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .timeline-section {
          margin: 24px 0;
        }

        .timeline-item {
          padding: 4px 0;
        }

        .rate-section {
          margin-top: 24px;
        }

        .summary-card {
          border-radius: 16px;
          margin-bottom: 16px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .summary-line.platform-fee {
          background: #f0fdf4;
          margin: 8px -24px;
          padding: 8px 24px;
        }

        .summary-line.total {
          padding-top: 16px;
        }

        .driver-earnings-note {
          text-align: center;
          margin-top: 16px;
          padding: 12px;
          background: #f0f9ff;
          border-radius: 8px;
        }

        .help-card {
          border-radius: 16px;
        }

        .rating-content {
          text-align: center;
          padding: 24px 0;
        }

        .rate-driver {
          margin-bottom: 16px;
        }

        .rate-stars {
          margin: 24px 0;
        }

        @media (max-width: 768px) {
          .order-header {
            flex-direction: column;
            gap: 16px;
          }

          .eta-badge {
            width: 100%;
            justify-content: center;
          }

          .driver-card {
            flex-direction: column;
            text-align: center;
          }

          .driver-actions {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderTracking;
