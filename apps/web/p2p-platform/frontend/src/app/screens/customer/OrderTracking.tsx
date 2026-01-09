import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Row, Col, Button, Typography, Steps, Tag, Avatar, Divider, Timeline, Spin, Empty, Rate, Modal, message, Badge } from 'antd';
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
import { getApiUrl, getWebSocketUrl } from '../../api/api';
import { pricing } from '../../config/brand';
import ChatPanel from '../../components/chat/ChatPanel';

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
  unit_price?: number;  // Backend may return unit_price instead of price
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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get customer info from localStorage
  const customerId = parseInt(localStorage.getItem('customer_id') || '0');
  const customerName = localStorage.getItem('customer_name') || 'Customer';

  // WebSocket connection for real-time order updates
  const connectWebSocket = useCallback(() => {
    if (!orderId || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `${getWebSocketUrl()}/customer/${customerId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Order tracking WebSocket connected');
        // Subscribe to order topic
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: `order:${orderId}`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle order status updates
          if (data.type === 'order_status' || data.type === 'order:status') {
            const statusData = data.data || data;
            if (statusData.order_id?.toString() === orderId) {
              // Update order status in real-time
              setOrder(prev => prev ? {
                ...prev,
                status: statusData.status,
                driver: statusData.driver || prev.driver
              } : null);
            }
          }

          // Handle driver assignment
          if (data.type === 'driver_assigned') {
            const driverData = data.data || data;
            if (driverData.order_id?.toString() === orderId) {
              setOrder(prev => prev ? {
                ...prev,
                driver: driverData.driver
              } : null);
              message.success('A driver has been assigned to your order!');
            }
          }

          // Handle chat message notification
          if (data.type === 'chat_message' && !chatOpen) {
            const msgData = data.data || data;
            if (msgData.order_id?.toString() === orderId && msgData.sender_type === 'driver') {
              setUnreadMessages(prev => prev + 1);
            }
          }

          // Handle driver location updates
          if (data.type === 'driver_location') {
            const locData = data.data || data;
            if (order?.driver && locData.driver_id === order.driver.id) {
              setOrder(prev => prev && prev.driver ? {
                ...prev,
                driver: {
                  ...prev.driver,
                  current_lat: locData.latitude,
                  current_lng: locData.longitude
                }
              } : null);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Order tracking WebSocket disconnected');
        // Reconnect after 5 seconds if order is still active
        if (order && !['delivered', 'cancelled'].includes(order.status)) {
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [orderId, customerId, order, chatOpen]);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Connect WebSocket after order is loaded
  useEffect(() => {
    if (order && !['delivered', 'cancelled'].includes(order.status)) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [order?.id, connectWebSocket]);

  // Fallback polling every 30 seconds (reduced from 10 since we have WebSocket)
  useEffect(() => {
    if (order && !['delivered', 'cancelled'].includes(order.status)) {
      const interval = setInterval(fetchOrder, 30000);
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

    // Map items and normalize price field (backend may return unit_price instead of price)
    const rawItems = orderData.items as Array<Record<string, unknown>> || [];
    const mappedItems: OrderItem[] = rawItems.map(item => ({
      name: item.name as string || 'Item',
      quantity: item.quantity as number || 1,
      price: (item.price as number) || (item.unit_price as number) || (item.item_price as number) || 0
    }));

    return {
      id: orderData.id as number || 1,
      order_number: orderData.order_number as string || `ORD-${Date.now().toString().slice(-8)}`,
      status: orderData.status as string || 'preparing',
      restaurant_name: orderData.restaurant_name as string || orderData.vendor_name as string || 'Restaurant',
      items: mappedItems,
      subtotal: orderData.subtotal as number || 0,
      delivery_fee: orderData.delivery_fee as number || 0,
      platform_fee: orderData.platform_fee as number || pricing.foodDelivery.customerFee,
      tax: (orderData.tax as number) || (orderData.tax_amount as number) || 0,
      tip: orderData.tip as number || 0,
      total: (orderData.total_amount as number) || (orderData.total as number) || 0,
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
                    <Badge count={unreadMessages} size="small">
                      <Button
                        icon={<MessageOutlined />}
                        onClick={() => {
                          setChatOpen(true);
                          setUnreadMessages(0);
                        }}
                        type={unreadMessages > 0 ? 'primary' : 'default'}
                      >
                        Chat
                      </Button>
                    </Badge>
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
                <Text>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
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

      {/* Chat Panel */}
      {order && order.driver && (
        <ChatPanel
          orderId={order.id}
          userType="customer"
          userId={customerId}
          userName={customerName}
          otherPartyName={order.driver.name}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          onUnreadCountChange={setUnreadMessages}
        />
      )}

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
        /* ============================================
           ORDER TRACKING PAGE - International-Level Design
           Responsive breakpoints: 480, 640, 768, 1024, 1280px
           ============================================ */

        .tracking-page {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 16px;
          min-height: 100vh;
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
          margin-bottom: 28px;
          gap: 16px;
        }

        .page-header h2 {
          flex: 1;
          text-align: center;
        }

        .tracking-card {
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .tracking-card .ant-card-body {
          padding: 28px;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .eta-badge {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 28px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 16px;
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .eta-badge .anticon {
          font-size: 28px;
        }

        .eta-time {
          font-size: 28px;
          font-weight: 700;
          color: white;
        }

        .tracking-steps {
          margin: 28px 0;
        }

        .tracking-steps .ant-steps-item-title {
          font-weight: 500;
        }

        .driver-section {
          margin: 28px 0;
        }

        .driver-card {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 20px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 16px;
          transition: box-shadow 0.2s ease;
        }

        .driver-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .driver-info {
          flex: 1;
          min-width: 0;
        }

        .driver-rating {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 6px 0;
        }

        .driver-actions {
          display: flex;
          gap: 10px;
        }

        .driver-actions button {
          border-radius: 10px;
          height: 40px;
        }

        .address-section {
          margin: 28px 0;
          padding: 20px;
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
          border-radius: 16px;
        }

        .address-section h5 {
          margin-bottom: 12px;
        }

        .timeline-section {
          margin: 28px 0;
        }

        .timeline-item {
          padding: 6px 0;
        }

        .rate-section {
          margin-top: 28px;
        }

        .rate-section button {
          height: 52px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 14px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          transition: all 0.2s ease;
        }

        .rate-section button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .summary-card {
          border-radius: 20px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
        }

        .summary-line.platform-fee {
          background: #f0fdf4;
          margin: 10px -24px;
          padding: 12px 24px;
        }

        .summary-line.total {
          padding-top: 18px;
        }

        .driver-earnings-note {
          text-align: center;
          margin-top: 18px;
          padding: 14px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
        }

        .help-card {
          border-radius: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .help-card button {
          border-radius: 12px;
          height: 44px;
        }

        .rating-content {
          text-align: center;
          padding: 28px 0;
        }

        .rate-driver {
          margin-bottom: 20px;
        }

        .rate-stars {
          margin: 28px 0;
        }

        /* ============================================
           RESPONSIVE BREAKPOINTS
           ============================================ */

        /* Extra small devices (phones, 480px and down) */
        @media (max-width: 480px) {
          .tracking-page {
            padding: 16px 12px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .page-header h2 {
            order: -1;
            text-align: left;
          }

          .tracking-card .ant-card-body {
            padding: 20px 16px;
          }

          .order-header {
            flex-direction: column;
            gap: 16px;
          }

          .eta-badge {
            width: 100%;
            justify-content: center;
            padding: 16px 20px;
          }

          .eta-time {
            font-size: 24px;
          }

          .driver-card {
            flex-direction: column;
            text-align: center;
            padding: 16px;
          }

          .driver-actions {
            width: 100%;
            justify-content: center;
          }

          .tracking-steps .ant-steps-item-title {
            font-size: 11px;
          }
        }

        /* Small devices (landscape phones, 481px to 640px) */
        @media (min-width: 481px) and (max-width: 640px) {
          .tracking-page {
            padding: 20px 16px;
          }

          .order-header {
            flex-direction: column;
          }

          .eta-badge {
            width: 100%;
            justify-content: center;
          }
        }

        /* Medium devices (tablets, 641px to 768px) */
        @media (min-width: 641px) and (max-width: 768px) {
          .tracking-page {
            padding: 24px 20px;
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

        /* Large devices (desktops, 769px to 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .tracking-page {
            padding: 24px 24px;
          }
        }

        /* Extra large devices (1025px to 1280px) */
        @media (min-width: 1025px) and (max-width: 1280px) {
          .tracking-page {
            padding: 24px 32px;
          }
        }

        /* XXL devices (1281px and up) */
        @media (min-width: 1281px) {
          .tracking-page {
            padding: 32px 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderTracking;
