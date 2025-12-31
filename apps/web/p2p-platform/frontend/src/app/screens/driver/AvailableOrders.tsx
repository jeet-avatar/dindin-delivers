import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Tag, Typography, Segmented, List, Empty, Spin, message } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CarOutlined,
  ShoppingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { getAvailableDeliveries, acceptDelivery, AvailableDelivery } from '../../api/api';

const { Title, Text } = Typography;

/**
 * Available Orders Screen - Aligned with iOS AvailableOrdersView.swift
 *
 * Features matched from iOS:
 * - Service mode toggle (Food Delivery / Rideshare)
 * - Stats header (Available, Avg Pay, Nearby)
 * - Filter chips (All, Nearby, High Pay, Quick)
 * - List/Map view toggle
 * - Order cards with earnings and accept button
 */

const AvailableOrders: React.FC = () => {
  const [serviceMode, setServiceMode] = useState<string>('food');
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<string>('list');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<AvailableDelivery[]>([]);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getAvailableDeliveries();
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
      message.error('Failed to load available orders');
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = (order: AvailableDelivery) =>
    order.delivery_fee + (order.priority_fee || 0) + order.tip;

  const avgPay = orders.length > 0
    ? orders.reduce((sum, o) => sum + totalEarnings(o), 0) / orders.length
    : 0;

  const nearbyCount = orders.filter(o => o.distance_miles < 2).length;

  const handleRefresh = () => {
    fetchOrders();
  };

  const handleAccept = async (orderId: number) => {
    setAcceptingId(orderId);
    try {
      await acceptDelivery(orderId);
      message.success('Order accepted! Check Active tab.');
      // Remove from list
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Failed to accept order:', error);
      message.error('Failed to accept order');
    } finally {
      setAcceptingId(null);
    }
  };

  const getFilteredOrders = () => {
    switch (filter) {
      case 'nearby':
        return orders.filter(o => o.distance_miles < 2);
      case 'highpay':
        return orders.filter(o => totalEarnings(o) >= 15);
      case 'quick':
        return orders.filter(o => o.estimated_minutes <= 15);
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div className="available-orders">
      {/* Header */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Available Orders</Title>
          <Text type="secondary">Accept deliveries to start earning</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* Service Mode Toggle - matching iOS */}
      <Card className="service-toggle-card">
        <Segmented
          value={serviceMode}
          onChange={(value) => setServiceMode(value as string)}
          options={[
            {
              label: (
                <div className="segment-option">
                  <ShoppingOutlined />
                  <span>Food Delivery</span>
                </div>
              ),
              value: 'food',
            },
            {
              label: (
                <div className="segment-option">
                  <CarOutlined />
                  <span>Rideshare</span>
                </div>
              ),
              value: 'ride',
            },
          ]}
          block
          className="service-segmented"
        />
      </Card>

      {/* Stats Header - matching iOS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-pill">
            <div className="stat-content">
              <CarOutlined style={{ color: '#10B981', fontSize: 18 }} />
              <div>
                <Text strong style={{ fontSize: 18 }}>{orders.length}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Available</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-pill">
            <div className="stat-content">
              <DollarOutlined style={{ color: '#4CAF50', fontSize: 18 }} />
              <div>
                <Text strong style={{ fontSize: 18 }}>${avgPay.toFixed(0)}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Avg Pay</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-pill">
            <div className="stat-content">
              <EnvironmentOutlined style={{ color: '#3B82F6', fontSize: 18 }} />
              <div>
                <Text strong style={{ fontSize: 18 }}>{nearbyCount}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{'< 2 mi'}</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter Bar - matching iOS */}
      <Card className="filter-bar">
        <div className="filter-content">
          <div className="filter-chips">
            {['all', 'nearby', 'highpay', 'quick'].map((f) => (
              <Tag
                key={f}
                className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' && 'All'}
                {f === 'nearby' && 'Nearby'}
                {f === 'highpay' && 'High Pay'}
                {f === 'quick' && 'Quick'}
              </Tag>
            ))}
          </div>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as string)}
            options={[
              { label: 'List', value: 'list' },
              { label: 'Map', value: 'map' },
            ]}
            size="small"
          />
        </div>
      </Card>

      {/* Orders List - matching iOS */}
      {loading ? (
        <div className="loading-container">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Text type="secondary">Finding orders near you...</Text>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Empty
          image={<CarOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description={
            <div>
              <Text strong style={{ fontSize: 18, display: 'block' }}>No Orders Available</Text>
              <Text type="secondary">New delivery requests will appear here</Text>
            </div>
          }
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={filteredOrders}
          renderItem={(order) => (
            <Card className="order-card" key={order.id}>
              {/* Header Row */}
              <div className="order-header">
                <div className="order-info">
                  <Text strong style={{ fontSize: 16 }}>{order.restaurant_name}</Text>
                  <div className="order-meta">
                    <Tag icon={<ShoppingOutlined />}>{order.items_count} items</Tag>
                    <Tag icon={<EnvironmentOutlined />}>{order.distance_miles.toFixed(1)} mi</Tag>
                  </div>
                </div>
                <div className="order-earnings">
                  <Text strong style={{ fontSize: 22, color: '#4CAF50' }}>
                    ${totalEarnings(order).toFixed(2)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>earnings</Text>
                </div>
              </div>

              {/* Route Info */}
              <div className="route-info">
                <div className="route-stop pickup">
                  <div className="stop-icon">
                    <EnvironmentOutlined />
                  </div>
                  <div className="stop-details">
                    <Text type="secondary" style={{ fontSize: 10 }}>PICKUP</Text>
                    <Text>{order.restaurant_address}</Text>
                  </div>
                </div>
                <div className="route-stop dropoff">
                  <div className="stop-icon dropoff">
                    <EnvironmentOutlined />
                  </div>
                  <div className="stop-details">
                    <Text type="secondary" style={{ fontSize: 10 }}>DROPOFF</Text>
                    <Text>{order.delivery_address}</Text>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="quick-stats">
                <Tag icon={<ClockCircleOutlined />} color="blue">{order.estimated_minutes} min</Tag>
                <Tag icon={<ShoppingOutlined />} color="orange">{order.items_count} items</Tag>
                {(order.priority_fee || 0) > 0 && (
                  <Tag icon={<ThunderboltOutlined />} color="gold">Priority</Tag>
                )}
              </div>

              {/* Action Buttons */}
              <div className="order-actions">
                <Button className="details-btn">
                  <EnvironmentOutlined /> Details
                </Button>
                <Button
                  type="primary"
                  className="accept-btn"
                  icon={<CheckCircleOutlined />}
                  loading={acceptingId === order.id}
                  onClick={() => handleAccept(order.id)}
                >
                  Accept
                </Button>
              </div>
            </Card>
          )}
        />
      )}

      <style>{`
        .available-orders {
          padding: 0;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .service-toggle-card {
          margin-bottom: 20px;
          border-radius: 16px;
        }
        .service-toggle-card .ant-card-body {
          padding: 12px;
        }
        .service-segmented {
          background: #f5f5f5;
        }
        .service-segmented .ant-segmented-item-selected {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
        }
        .segment-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
        }
        .stat-pill {
          border-radius: 20px;
        }
        .stat-pill .ant-card-body {
          padding: 12px;
        }
        .stat-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .filter-bar {
          margin-bottom: 20px;
          border-radius: 12px;
        }
        .filter-bar .ant-card-body {
          padding: 12px 16px;
        }
        .filter-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .filter-chips {
          display: flex;
          gap: 8px;
        }
        .filter-chip {
          cursor: pointer;
          padding: 6px 16px;
          border-radius: 20px;
          border: none;
          background: #f0f0f0;
          transition: all 0.2s;
        }
        .filter-chip.active {
          background: #10B981;
          color: white;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 60px;
        }
        .order-card {
          border-radius: 20px;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .order-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .order-info {
          flex: 1;
        }
        .order-meta {
          margin-top: 8px;
        }
        .order-earnings {
          text-align: right;
        }
        .route-info {
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
          padding: 16px 0;
          margin-bottom: 16px;
        }
        .route-stop {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .route-stop:last-child {
          margin-bottom: 0;
        }
        .stop-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(242, 153, 74, 0.1);
          color: #F2994A;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stop-icon.dropoff {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
        }
        .quick-stats {
          margin-bottom: 16px;
        }
        .order-actions {
          display: flex;
          gap: 12px;
        }
        .details-btn {
          flex: 1;
          height: 44px;
          border-radius: 10px;
        }
        .accept-btn {
          flex: 1;
          height: 44px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
        }
      `}</style>
    </div>
  );
};

export default AvailableOrders;
