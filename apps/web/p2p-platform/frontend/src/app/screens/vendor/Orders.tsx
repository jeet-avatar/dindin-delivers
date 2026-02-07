import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Tag, Modal, Spin, message, Badge, Empty } from 'antd';
import {
  BellOutlined,
  FireOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  UserOutlined,
  PhoneOutlined,
  StarOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl, getCurrentVendorId } from '../../api/api';

const API_URL = getApiUrl();

/**
 * VendorOrders - Matches iOS OrdersDashboardView exactly
 *
 * Features from iOS:
 * - Filter tabs: All / New / Preparing / Ready / Delivering (with count badges)
 * - Quick stats: New (bell), Preparing (flame), Ready (bag), Today revenue ($)
 * - Status bar: Busy level + avg prep time
 * - Online/Offline toggle
 * - Card-based order list with:
 *   - Status badge, order ID, NEW tag, items count, time elapsed, total
 *   - Items preview (first 3 items)
 *   - New orders: 3-min countdown timer, Reject, Accept & Send to Driver, Accept & I'll Deliver
 *   - Preparing: Driver en-route info + Mark Ready for Pickup
 *   - Pending delivery decision: Send to Driver Pool / I'll Deliver
 *   - Ready for pickup: Driver on way or waiting for driver
 *   - Restaurant will deliver: delivery address + Mark as Delivered
 * - Auto-refresh polling (15s)
 * - Empty state per filter
 */

// Types
interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_address?: string;
  delivery_instructions?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_rating?: number;
  driver_eta?: number;
  subtotal?: number;
  tax?: number;
  delivery_fee?: number;
  tip?: number;
}

type OrderFilter = 'all' | 'new' | 'preparing' | 'ready' | 'delivering';

// Status config matching iOS OrderStatus
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending_restaurant: { color: '#F59E0B', icon: <BellOutlined />, label: 'New Order' },
  placed: { color: '#F59E0B', icon: <BellOutlined />, label: 'New Order' },
  confirmed: { color: '#3B82F6', icon: <CheckCircleOutlined />, label: 'Confirmed' },
  accepted: { color: '#3B82F6', icon: <CheckCircleOutlined />, label: 'Accepted' },
  preparing: { color: '#F97316', icon: <FireOutlined />, label: 'Preparing' },
  pending_delivery_decision: { color: '#8B5CF6', icon: <ClockCircleOutlined />, label: 'Delivery Decision' },
  ready_for_pickup: { color: '#06C167', icon: <ShoppingOutlined />, label: 'Ready' },
  ready: { color: '#06C167', icon: <ShoppingOutlined />, label: 'Ready' },
  restaurant_will_deliver: { color: '#06C167', icon: <CarOutlined />, label: 'Self-Delivering' },
  out_for_delivery: { color: '#6366F1', icon: <CarOutlined />, label: 'Out for Delivery' },
  delivered: { color: '#10B981', icon: <CheckCircleOutlined />, label: 'Delivered' },
  declined_by_restaurant: { color: '#EF4444', icon: <CloseCircleOutlined />, label: 'Declined' },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || { color: '#64748b', icon: <ClockCircleOutlined />, label: status };

// Time helpers
const getTimeElapsed = (createdAt: string): string => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m ago`;
};

const getRemainingSeconds = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - created.getTime()) / 1000);
  return Math.max(0, 180 - elapsed);
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Busy level based on active order count
const getBusyLevel = (activeCount: number): { label: string; color: string } => {
  if (activeCount === 0) return { label: 'Quiet', color: '#10B981' };
  if (activeCount <= 3) return { label: 'Moderate', color: '#F59E0B' };
  if (activeCount <= 6) return { label: 'Busy', color: '#F97316' };
  return { label: 'Very Busy', color: '#EF4444' };
};

// ==================== COMPONENTS ====================

// Delivery Timer Component (3-min countdown)
const DeliveryTimer: React.FC<{ createdAt: string; onExpire: () => void }> = ({ createdAt, onExpire }) => {
  const [seconds, setSeconds] = useState(() => getRemainingSeconds(createdAt));
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(createdAt);
      setSeconds(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  const isUrgent = seconds <= 30;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
      <ClockCircleOutlined style={{ color: isUrgent ? '#EF4444' : '#F59E0B' }} />
      <span style={{ fontWeight: 700, color: isUrgent ? '#EF4444' : '#F59E0B', fontSize: 14 }}>
        Decide in: {formatTime(seconds)}
      </span>
      <span style={{ flex: 1 }} />
      {isUrgent && (
        <span style={{ fontSize: 12, color: '#EF4444' }}>Auto-sending to drivers...</span>
      )}
    </div>
  );
};

// Quick Stat Card (matches iOS QuickStatCard)
const QuickStatCard: React.FC<{ title: string; value: string; color: string; icon: React.ReactNode }> = ({
  title, value, color, icon
}) => (
  <div style={{
    flex: 1,
    textAlign: 'center',
    padding: '12px 8px',
    background: `${color}15`,
    borderRadius: 10,
    minWidth: 80,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color, marginBottom: 4 }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
    </div>
    <div style={{ fontSize: 11, color: '#64748b' }}>{title}</div>
  </div>
);

// Filter Tab (matches iOS FilterTab)
const FilterTab: React.FC<{
  title: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ title, count, isSelected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 16px',
      border: 'none',
      borderRadius: 20,
      background: isSelected ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
      color: isSelected ? '#F59E0B' : '#64748b',
      fontWeight: isSelected ? 600 : 400,
      cursor: 'pointer',
      fontSize: 14,
      whiteSpace: 'nowrap',
      transition: 'all 0.2s',
    }}
  >
    {title}
    {count > 0 && (
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        background: isSelected ? '#F59E0B' : '#94a3b8',
        padding: '1px 6px',
        borderRadius: 20,
        minWidth: 18,
        textAlign: 'center',
      }}>
        {count}
      </span>
    )}
  </button>
);

// Driver Info Card (shows when driver is assigned)
const DriverInfo: React.FC<{ order: Order; statusColor: string }> = ({ order, statusColor }) => {
  if (!order.driver_name) return null;

  return (
    <div style={{ padding: '8px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <CarOutlined style={{ color: statusColor }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: statusColor }}>
          Driver heading to restaurant
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserOutlined style={{ color: '#3B82F6', fontSize: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{order.driver_name}</div>
          {order.driver_phone && (
            <div style={{ fontSize: 12, color: '#64748b' }}>{order.driver_phone}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
            {order.driver_eta && order.driver_eta > 0 && (
              <span style={{ fontSize: 12, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ClockCircleOutlined style={{ fontSize: 10 }} /> ~{order.driver_eta} min
              </span>
            )}
            {order.driver_rating && order.driver_rating > 0 && (
              <span style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 2 }}>
                <StarOutlined style={{ fontSize: 10, color: '#F59E0B' }} /> {order.driver_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {order.driver_phone && (
          <a href={`tel:${order.driver_phone.replace(/[\s()-]/g, '')}`}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#3B82F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PhoneOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
          </a>
        )}
      </div>
    </div>
  );
};

// Order Card (matches iOS EnhancedOrderCard)
const OrderCard: React.FC<{
  order: Order;
  onAccept: () => void;
  onReject: () => void;
  onMarkReady: () => void;
  onSelfDeliver: () => void;
  onSendToDriver: () => void;
  onMarkDelivered: () => void;
  onViewDetail: () => void;
}> = ({ order, onAccept, onReject, onMarkReady, onSelfDeliver, onSendToDriver, onMarkDelivered, onViewDetail }) => {
  const config = getStatusConfig(order.status);
  const isNew = order.status === 'placed' || order.status === 'pending_restaurant';
  const isPreparing = order.status === 'preparing' || order.status === 'accepted' || order.status === 'confirmed';
  const isPendingDelivery = order.status === 'pending_delivery_decision';
  const isReady = order.status === 'ready_for_pickup' || order.status === 'ready';
  const isSelfDelivering = order.status === 'restaurant_will_deliver' || order.status === 'out_for_delivery';
  const showItemsPreview = isNew || isPreparing;

  const handleTimerExpire = useCallback(() => {
    onAccept();
    onSendToDriver();
  }, [onAccept, onSendToDriver]);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div
        onClick={onViewDetail}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer' }}
      >
        {/* Status Badge Circle */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `${config.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: config.color,
        }}>
          {config.icon}
        </div>

        {/* Order Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              #{order.order_number || order.id}
            </span>
            {isNew && (
              <Tag color="orange" style={{ margin: 0, fontWeight: 700, fontSize: 10 }}>NEW</Tag>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {order.items?.length || 0} items &bull; {getTimeElapsed(order.created_at)}
          </div>
        </div>

        {/* Total & Status */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#06C167' }}>
            ${order.total_amount?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: 12, color: config.color }}>{config.label}</div>
        </div>
      </div>

      {/* Items Preview (for new and preparing orders) */}
      {showItemsPreview && order.items && order.items.length > 0 && (
        <>
          <div style={{ height: 1, background: '#f0f0f0', margin: '0 16px' }} />
          <div style={{ padding: '8px 16px' }}>
            {order.items.slice(0, 3).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ fontSize: 12, color: '#64748b', width: 24 }}>{item.quantity}x</span>
                <span style={{ fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            {order.items.length > 3 && (
              <div style={{ fontSize: 12, color: '#64748b', paddingTop: 2 }}>
                + {order.items.length - 3} more items
              </div>
            )}
          </div>
        </>
      )}

      {/* === NEW ORDER ACTIONS (3-min timer + Accept/Reject) === */}
      {isNew && (
        <>
          <div style={{ height: 1, background: '#f0f0f0' }} />
          <DeliveryTimer createdAt={order.created_at} onExpire={handleTimerExpire} />

          {/* Reject Button */}
          <div style={{ padding: '0 16px 8px' }}>
            <button
              onClick={onReject}
              style={{
                width: '100%', padding: '10px 0', border: 'none', borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <CloseCircleOutlined /> Reject Order
            </button>
          </div>

          {/* Accept Buttons - Two Options */}
          <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px' }}>
            <button
              onClick={() => { onAccept(); onSendToDriver(); }}
              style={{
                flex: 1, padding: '14px 8px', border: 'none', borderRadius: 10,
                background: '#3B82F6', color: '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <CarOutlined style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10 }}>Accept &</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Send to Driver</span>
            </button>
            <button
              onClick={() => { onAccept(); onSelfDeliver(); }}
              style={{
                flex: 1, padding: '14px 8px', border: 'none', borderRadius: 10,
                background: '#06C167', color: '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <UserOutlined style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10 }}>Accept &</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>I'll Deliver</span>
            </button>
          </div>
        </>
      )}

      {/* === PREPARING ACTIONS (driver info + Mark Ready) === */}
      {isPreparing && (
        <>
          <div style={{ height: 1, background: '#f0f0f0' }} />
          <DriverInfo order={order} statusColor="#3B82F6" />
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={onMarkReady}
              style={{
                width: '100%', padding: '12px 0', border: 'none', borderRadius: 10,
                background: '#F59E0B', color: '#fff',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <CheckCircleOutlined /> Mark Ready for Pickup
            </button>
          </div>
        </>
      )}

      {/* === PENDING DELIVERY DECISION (Send to Driver / I'll Deliver) === */}
      {isPendingDelivery && (
        <>
          <div style={{ height: 1, background: '#f0f0f0' }} />
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircleOutlined style={{ color: '#06C167' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Order Ready - Choose delivery option</span>
          </div>
          <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px' }}>
            <button
              onClick={onSendToDriver}
              style={{
                flex: 1, padding: '14px 8px', border: 'none', borderRadius: 10,
                background: '#3B82F6', color: '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <CarOutlined style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10 }}>Send to</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Driver Pool</span>
            </button>
            <button
              onClick={onSelfDeliver}
              style={{
                flex: 1, padding: '14px 8px', border: 'none', borderRadius: 10,
                background: '#06C167', color: '#fff', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
            >
              <UserOutlined style={{ fontSize: 20 }} />
              <span style={{ fontSize: 10 }}>I'll</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Deliver</span>
            </button>
          </div>
        </>
      )}

      {/* === READY FOR PICKUP (waiting for driver / driver assigned) === */}
      {isReady && (
        <>
          <div style={{ height: 1, background: '#f0f0f0' }} />
          {order.driver_name ? (
            <>
              <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CarOutlined style={{ color: '#06C167' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#06C167' }}>
                  Driver on the way to pick up
                </span>
              </div>
              <DriverInfo order={order} statusColor="#06C167" />
            </>
          ) : (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <ClockCircleOutlined style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#F59E0B' }}>
                  Waiting for driver pickup
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CarOutlined style={{ fontSize: 11 }} />
                Order sent to driver pool - a driver will accept soon
              </div>
            </div>
          )}
        </>
      )}

      {/* === SELF-DELIVERING (address + Mark Delivered) === */}
      {isSelfDelivering && (
        <>
          <div style={{ height: 1, background: '#f0f0f0' }} />
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <CarOutlined style={{ color: '#06C167' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#06C167' }}>
                You are delivering this order
              </span>
            </div>
            {order.delivery_address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12, color: '#64748b' }}>
                <EnvironmentOutlined style={{ fontSize: 11 }} />
                <span style={{ lineHeight: 1.4 }}>{order.delivery_address}</span>
              </div>
            )}
            <button
              onClick={onMarkDelivered}
              style={{
                width: '100%', padding: '14px 0', border: 'none', borderRadius: 10,
                background: '#06C167', color: '#fff',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <CheckCircleOutlined /> Mark as Delivered
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const VendorOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>('all');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const vendorId = getCurrentVendorId();

  // Fetch orders from API
  const fetchOrders = useCallback(async (showLoader = false) => {
    if (!vendorId) return;
    if (showLoader) setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/orders`, {
        params: { vendor_id: vendorId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('id_token') || localStorage.getItem('access_token') || ''}`,
        },
      });
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (showLoader) message.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Start polling
  useEffect(() => {
    fetchOrders(true);
    pollingRef.current = setInterval(() => fetchOrders(false), 15000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchOrders]);

  // Categorize orders (matching iOS ViewModel)
  const newOrders = orders.filter(o =>
    o.status === 'pending_restaurant' || o.status === 'placed'
  );
  const preparingOrders = orders.filter(o =>
    o.status === 'preparing' || o.status === 'accepted' || o.status === 'confirmed'
  );
  const readyOrders = orders.filter(o =>
    o.status === 'ready_for_pickup' || o.status === 'ready' || o.status === 'pending_delivery_decision'
  );
  const deliveringOrders = orders.filter(o =>
    o.status === 'restaurant_will_deliver' || o.status === 'out_for_delivery'
  );

  const filteredOrders = (() => {
    switch (selectedFilter) {
      case 'new': return newOrders;
      case 'preparing': return preparingOrders;
      case 'ready': return readyOrders;
      case 'delivering': return deliveringOrders;
      default: return [...newOrders, ...preparingOrders, ...readyOrders, ...deliveringOrders];
    }
  })();

  // Stats
  const todayRevenue = orders
    .filter(o => {
      const today = new Date();
      const created = new Date(o.created_at);
      return created.toDateString() === today.toDateString() && o.payment_status === 'succeeded';
    })
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const activeCount = newOrders.length + preparingOrders.length + readyOrders.length + deliveringOrders.length;
  const busyLevel = getBusyLevel(activeCount);
  const avgPrepTime = preparingOrders.length > 0 ? 15 : 0; // Placeholder

  // === ORDER ACTIONS ===
  const handleAcceptOrder = async (orderId: number) => {
    try {
      await axios.post(`${API_URL}/api/erp/orders/${orderId}/restaurant-accept`);
      message.success('Order accepted! Starting preparation.');
      fetchOrders();
    } catch (error) {
      message.error('Failed to accept order');
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    try {
      await axios.post(`${API_URL}/api/erp/orders/${orderId}/restaurant-decline`, {
        reason: 'Restaurant unavailable'
      });
      message.success('Order declined. Customer will be refunded.');
      fetchOrders();
    } catch (error) {
      message.error('Failed to decline order');
    }
  };

  const handleMarkReady = async (orderId: number) => {
    try {
      await axios.post(`${API_URL}/api/erp/orders/${orderId}/ready-for-pickup`);
      message.success('Order marked as ready!');
      fetchOrders();
    } catch (error) {
      message.error('Failed to update order');
    }
  };

  const handleSelfDeliver = async (orderId: number) => {
    try {
      await axios.post(`${API_URL}/api/erp/orders/${orderId}/restaurant-accept-delivery`);
      message.success('You will deliver this order.');
      fetchOrders();
    } catch (error) {
      message.error('Failed to accept delivery');
    }
  };

  const handleSendToDriver = async (orderId: number) => {
    try {
      await axios.post(`${API_URL}/api/erp/orders/${orderId}/restaurant-decline-delivery`);
      message.success('Order sent to driver pool.');
      fetchOrders();
    } catch (error) {
      message.error('Failed to send to drivers');
    }
  };

  const handleMarkDelivered = async (orderId: number) => {
    try {
      await axios.post(`${API_URL}/api/erp/orders/${orderId}/delivered`);
      message.success('Order marked as delivered!');
      fetchOrders();
    } catch (error) {
      message.error('Failed to mark delivered');
    }
  };

  // Filter config
  const filters: { key: OrderFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: activeCount },
    { key: 'new', label: 'New', count: newOrders.length },
    { key: 'preparing', label: 'Preparing', count: preparingOrders.length },
    { key: 'ready', label: 'Ready', count: readyOrders.length },
    { key: 'delivering', label: 'Delivering', count: deliveringOrders.length },
  ];

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="vendor-orders">
      {/* Page Header with Online/Offline Toggle */}
      <div className="orders-header">
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1e293b' }}>Orders</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchOrders(true)}
            loading={loading}
          />
          <div
            onClick={() => setIsOnline(!isOnline)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isOnline ? '#10B981' : '#EF4444',
            }} />
            <span style={{
              fontSize: 13, fontWeight: 500,
              color: isOnline ? '#10B981' : '#EF4444',
            }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Bar - Busy Level + Avg Prep Time */}
      <div className="status-bar">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 20,
          background: `${busyLevel.color}15`,
        }}>
          <FireOutlined style={{ color: busyLevel.color }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: busyLevel.color }}>{busyLevel.label}</span>
        </div>
        <span style={{ flex: 1 }} />
        {avgPrepTime > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 13 }}>
            <ClockCircleOutlined style={{ fontSize: 12 }} />
            <span>~{avgPrepTime} min avg</span>
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats">
        <QuickStatCard title="New" value={`${newOrders.length}`} color="#F59E0B" icon={<BellOutlined />} />
        <QuickStatCard title="Preparing" value={`${preparingOrders.length}`} color="#F97316" icon={<FireOutlined />} />
        <QuickStatCard title="Ready" value={`${readyOrders.length}`} color="#06C167" icon={<ShoppingOutlined />} />
        <QuickStatCard title="Today" value={`$${Math.floor(todayRevenue)}`} color="#8B5CF6" icon={<DollarOutlined />} />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {filters.map(f => (
          <FilterTab
            key={f.key}
            title={f.label}
            count={f.count}
            isSelected={selectedFilter === f.key}
            onClick={() => setSelectedFilter(f.key)}
          />
        ))}
      </div>

      {/* Order Cards */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Empty
              description={
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                    No {selectedFilter === 'all' ? '' : selectedFilter + ' '}orders
                  </div>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>
                    New orders will appear here automatically
                  </div>
                </div>
              }
            />
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={() => handleAcceptOrder(order.id)}
              onReject={() => handleRejectOrder(order.id)}
              onMarkReady={() => handleMarkReady(order.id)}
              onSelfDeliver={() => handleSelfDeliver(order.id)}
              onSendToDriver={() => handleSendToDriver(order.id)}
              onMarkDelivered={() => handleMarkDelivered(order.id)}
              onViewDetail={() => setSelectedOrder(order)}
            />
          ))
        )}
      </div>

      {/* Order Detail Modal (matches iOS OrderDetailSheet) */}
      <Modal
        open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)}
        footer={null}
        width={600}
        title={selectedOrder ? `Order #${selectedOrder.order_number || selectedOrder.id}` : ''}
      >
        {selectedOrder && (
          <div style={{ padding: '8px 0' }}>
            {/* Status Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
                background: `${getStatusConfig(selectedOrder.status).color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, color: getStatusConfig(selectedOrder.status).color,
              }}>
                {getStatusConfig(selectedOrder.status).icon}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {getStatusConfig(selectedOrder.status).label}
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                <UserOutlined style={{ color: '#F59E0B' }} /> Customer
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedOrder.customer_name}</div>
                  {selectedOrder.customer_phone && (
                    <div style={{ fontSize: 13, color: '#64748b' }}>{selectedOrder.customer_phone}</div>
                  )}
                </div>
                {selectedOrder.customer_phone && (
                  <a href={`tel:${selectedOrder.customer_phone.replace(/[\s()-]/g, '')}`}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: '#06C167', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PhoneOutlined style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            {selectedOrder.delivery_address && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 600 }}>
                  <EnvironmentOutlined style={{ color: '#F59E0B' }} /> Delivery Address
                </div>
                <div style={{ fontSize: 14 }}>{selectedOrder.delivery_address}</div>
                {selectedOrder.delivery_instructions && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: '#F59E0B' }}>
                    <ExclamationCircleOutlined /> {selectedOrder.delivery_instructions}
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontWeight: 600 }}>
                <ShoppingOutlined style={{ color: '#F59E0B' }} /> Order Items
              </div>
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', padding: '8px 0',
                  borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #e2e8f0' : 'none',
                }}>
                  <span style={{ width: 30, fontSize: 14, fontWeight: 500, color: '#64748b' }}>{item.quantity}x</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{item.name}</span>
                  <span style={{ fontSize: 14, color: '#64748b' }}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Payment Details */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontWeight: 600 }}>
                <DollarOutlined style={{ color: '#F59E0B' }} /> Payment Details
              </div>
              {selectedOrder.subtotal != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                  <span>Subtotal</span><span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.tax != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                  <span>Tax</span><span>${selectedOrder.tax.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.delivery_fee != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                  <span>Delivery Fee</span><span>${selectedOrder.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              {selectedOrder.tip != null && selectedOrder.tip > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                  <span>Tip</span><span>${selectedOrder.tip.toFixed(2)}</span>
                </div>
              )}
              <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: '#06C167' }}>${selectedOrder.total_amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .vendor-orders {
          max-width: 800px;
          margin: 0 auto;
        }
        .orders-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .status-bar {
          display: flex;
          align-items: center;
          padding: 12px 0;
          margin-bottom: 8px;
        }
        .quick-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          overflow-x: auto;
        }
        .filter-tabs {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding-bottom: 12px;
          margin-bottom: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        .filter-tabs::-webkit-scrollbar {
          display: none;
        }
        .orders-list {
          min-height: 200px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .vendor-orders {
            padding: 0 4px;
          }
          .quick-stats {
            gap: 8px;
          }
          .orders-header h1 {
            font-size: 22px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default VendorOrders;
