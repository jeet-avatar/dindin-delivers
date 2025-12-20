import React, { useState, useEffect } from 'react';
import { Card, Button, Steps, Typography, Tag, Row, Col, Divider, Spin, Empty, message } from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  CarOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  CompassOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { getActiveDelivery, markDeliveryPickedUp, completeDelivery, ActiveDeliveryData } from '../../api/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

/**
 * Active Delivery Screen - Aligned with iOS PickupDropoffView.swift
 *
 * Features matched from iOS:
 * - Active delivery tracking with progress steps
 * - Pickup and dropoff information
 * - Contact customer buttons
 * - Mark as delivered action
 * - Map placeholder
 */

const ActiveDelivery: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDeliveryData | null>(null);

  useEffect(() => {
    fetchActiveDelivery();
  }, []);

  const fetchActiveDelivery = async () => {
    setLoading(true);
    try {
      const data = await getActiveDelivery();
      setActiveDelivery(data);
    } catch (error) {
      console.error('Failed to fetch active delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = () => {
    if (!activeDelivery) return 0;
    switch (activeDelivery.status) {
      case 'accepted': return 0;
      case 'picked_up': return 1;
      case 'delivering': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const handlePickedUp = async () => {
    if (!activeDelivery) return;
    setActionLoading(true);
    try {
      await markDeliveryPickedUp(activeDelivery.id);
      setActiveDelivery({ ...activeDelivery, status: 'picked_up' });
      message.success('Marked as picked up!');
    } catch (error) {
      console.error('Failed to mark as picked up:', error);
      message.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelivered = async () => {
    if (!activeDelivery) return;
    setActionLoading(true);
    try {
      await completeDelivery(activeDelivery.id);
      message.success('Delivery completed!');
      setActiveDelivery(null);
      navigate('/driver/orders');
    } catch (error) {
      console.error('Failed to complete delivery:', error);
      message.error('Failed to complete delivery');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary">Loading active delivery...</Text>
      </div>
    );
  }

  if (!activeDelivery) {
    return (
      <div className="no-delivery">
        <Card className="no-delivery-card">
          <Empty
            image={<CarOutlined style={{ fontSize: 64, color: '#10B981' }} />}
            description={
              <div>
                <Title level={4}>No Active Delivery</Title>
                <Text type="secondary">Accept an order from the Orders tab to start delivering</Text>
              </div>
            }
          >
            <Button type="primary" size="large" onClick={() => navigate('/driver/orders')}>
              Find Deliveries
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="active-delivery">
      {/* Header */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Active Delivery</Title>
          <Text type="secondary">Order #{activeDelivery.order_id}</Text>
        </div>
        <Tag color="blue" className="status-tag">
          <ClockCircleOutlined /> In Progress
        </Tag>
      </div>

      <Row gutter={[20, 20]}>
        {/* Map Placeholder */}
        <Col xs={24} lg={14}>
          <Card className="map-card">
            <div className="map-placeholder">
              <CompassOutlined style={{ fontSize: 48, color: '#10B981' }} />
              <Text strong style={{ marginTop: 16 }}>Map Navigation</Text>
              <Text type="secondary">Turn-by-turn directions would appear here</Text>
              <Button type="primary" icon={<CompassOutlined />} style={{ marginTop: 16 }}>
                Open in Maps
              </Button>
            </div>
          </Card>
        </Col>

        {/* Delivery Details */}
        <Col xs={24} lg={10}>
          {/* Progress Steps */}
          <Card className="progress-card">
            <Steps
              current={getCurrentStep()}
              direction="vertical"
              size="small"
              items={[
                {
                  title: 'Order Accepted',
                  description: 'Head to restaurant',
                  icon: <CheckCircleOutlined />,
                },
                {
                  title: 'Picked Up',
                  description: 'On the way to customer',
                  icon: <ShoppingOutlined />,
                },
                {
                  title: 'Delivered',
                  description: 'Order complete',
                  icon: <EnvironmentOutlined />,
                },
              ]}
            />
          </Card>

          {/* Order Details */}
          <Card className="details-card">
            <div className="section">
              <div className="section-header">
                <div className="stop-badge pickup">
                  <EnvironmentOutlined />
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>PICKUP</Text>
              </div>
              <Text strong style={{ fontSize: 16 }}>{activeDelivery.restaurant_name}</Text>
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {activeDelivery.restaurant_address}
              </Text>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div className="section">
              <div className="section-header">
                <div className="stop-badge dropoff">
                  <EnvironmentOutlined />
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>DROPOFF</Text>
              </div>
              <Text strong style={{ fontSize: 16 }}>{activeDelivery.customer_name}</Text>
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                {activeDelivery.delivery_address}
              </Text>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Order Info */}
            <Row gutter={16}>
              <Col span={8}>
                <div className="info-item">
                  <Text type="secondary" style={{ fontSize: 11 }}>ITEMS</Text>
                  <Text strong>{activeDelivery.items_count} items</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="info-item">
                  <Text type="secondary" style={{ fontSize: 11 }}>DISTANCE</Text>
                  <Text strong>{activeDelivery.distance}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="info-item">
                  <Text type="secondary" style={{ fontSize: 11 }}>ETA</Text>
                  <Text strong>{activeDelivery.estimated_time}</Text>
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            {/* Payout */}
            <div className="payout-section">
              <Text type="secondary">Your Earnings</Text>
              <Text strong style={{ fontSize: 28, color: '#10B981' }}>
                ${activeDelivery.payout.toFixed(2)}
              </Text>
            </div>
          </Card>

          {/* Contact Buttons */}
          <Card className="contact-card">
            <Row gutter={12}>
              <Col span={12}>
                <Button icon={<PhoneOutlined />} block size="large" className="contact-btn">
                  Call Customer
                </Button>
              </Col>
              <Col span={12}>
                <Button icon={<MessageOutlined />} block size="large" className="contact-btn">
                  Message
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Action Button */}
          <Button
            type="primary"
            size="large"
            block
            icon={<CheckCircleOutlined />}
            className="action-btn"
            loading={actionLoading}
            onClick={activeDelivery.status === 'accepted' ? handlePickedUp : handleDelivered}
          >
            {activeDelivery.status === 'accepted' ? 'Mark as Picked Up' : 'Mark as Delivered'}
          </Button>
        </Col>
      </Row>

      <style>{`
        .active-delivery {
          padding: 0;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .status-tag {
          padding: 6px 16px;
          font-size: 14px;
        }
        .map-card {
          border-radius: 16px;
          height: 100%;
          min-height: 400px;
        }
        .map-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 350px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 12px;
        }
        .progress-card {
          border-radius: 16px;
          margin-bottom: 16px;
        }
        .details-card {
          border-radius: 16px;
          margin-bottom: 16px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .stop-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .stop-badge.pickup {
          background: rgba(242, 153, 74, 0.1);
          color: #F2994A;
        }
        .stop-badge.dropoff {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .payout-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .contact-card {
          border-radius: 16px;
          margin-bottom: 16px;
        }
        .contact-card .ant-card-body {
          padding: 12px;
        }
        .contact-btn {
          border-radius: 10px;
          height: 44px;
        }
        .action-btn {
          height: 56px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
        }
        .no-delivery {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }
        .no-delivery-card {
          border-radius: 20px;
          max-width: 400px;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default ActiveDelivery;
