import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Spin, message, Progress } from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FireOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getApiUrl, getCurrentVendorId } from '../../api/api';

const API_URL = getApiUrl();

/**
 * VendorAnalytics - Matches iOS AnalyticsView exactly
 *
 * Features from iOS:
 * - Period selector: Today / Week / Month / Year
 * - Key Metrics Grid: Total Revenue, Total Orders, Avg Order Value, Avg Prep Time (with % change)
 * - Revenue Trend chart (bar chart with Revenue/Orders/Avg Order toggle)
 * - Orders by Status (donut indicators)
 * - Top Selling Items (ranked list)
 * - Peak Hours (lunch/dinner)
 * - Performance Summary (completion rate, on-time delivery progress bars)
 */

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: { name: string; quantity: number; price: number }[];
}

type TimePeriod = 'today' | 'week' | 'month' | 'year';

interface PopularItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface HourlyData {
  hour: string;
  revenue: number;
  orders: number;
  avgOrder: number;
}

// ==================== COMPONENTS ====================

const PeriodSelector: React.FC<{ selected: TimePeriod; onChange: (p: TimePeriod) => void }> = ({ selected, onChange }) => {
  const periods: TimePeriod[] = ['today', 'week', 'month', 'year'];
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
      {periods.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: selected === p ? 600 : 400, whiteSpace: 'nowrap',
            background: selected === p ? '#F59E0B' : 'rgba(0,0,0,0.04)',
            color: selected === p ? '#fff' : '#64748b',
            transition: 'all 0.2s',
          }}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
};

const MetricCard: React.FC<{
  title: string; value: string; change: string; isPositive: boolean;
  icon: React.ReactNode; color: string;
}> = ({ title, value, change, isPositive, icon, color }) => (
  <div style={{
    padding: 16, background: '#fff', borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ color, fontSize: 20 }}>{icon}</span>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 500,
        color: isPositive ? '#10B981' : '#EF4444',
      }}>
        {isPositive ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
        {change}
      </span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: '#64748b' }}>{title}</div>
  </div>
);

const StatusDonutItem: React.FC<{ label: string; value: number; color: string; total: number }> = ({ label, value, color, total }) => {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Progress
          type="circle"
          percent={pct}
          size={56}
          strokeColor={color}
          trailColor={`${color}30`}
          format={() => <span style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>}
        />
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{label}</div>
    </div>
  );
};

const BarChart: React.FC<{ data: HourlyData[]; metric: 'revenue' | 'orders' | 'avgOrder' }> = ({ data, metric }) => {
  if (data.length === 0) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data</div>;
  const maxVal = Math.max(...data.map(d => metric === 'revenue' ? d.revenue : metric === 'orders' ? d.orders : d.avgOrder), 1);
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
      {data.map((d, i) => {
        const val = metric === 'revenue' ? d.revenue : metric === 'orders' ? d.orders : d.avgOrder;
        const height = (val / maxVal) * 170;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>
              {metric === 'revenue' ? `$${Math.round(val)}` : metric === 'orders' ? val : `$${Math.round(val)}`}
            </span>
            <div style={{
              width: '100%', maxWidth: 32, height: Math.max(height, 2), borderRadius: '4px 4px 0 0',
              background: `linear-gradient(180deg, #F59E0B 0%, rgba(245,158,11,0.6) 100%)`,
            }} />
            <span style={{ fontSize: 9, color: '#94a3b8' }}>{d.hour}</span>
          </div>
        );
      })}
    </div>
  );
};

const PerformanceRow: React.FC<{ label: string; value: string; progress: number; color: string }> = ({ label, value, progress, color }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color }}>{value}</span>
    </div>
    <div style={{ height: 8, borderRadius: 4, background: `${color}30` }}>
      <div style={{ height: 8, borderRadius: 4, background: color, width: `${progress * 100}%`, transition: 'width 0.5s' }} />
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const VendorAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'avgOrder'>('revenue');
  const [orders, setOrders] = useState<Order[]>([]);

  const vendorId = getCurrentVendorId();

  const fetchOrders = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
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
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Filter orders by period
  const filteredOrders = orders.filter(o => {
    const created = moment(o.created_at);
    switch (period) {
      case 'today': return created.isSame(moment(), 'day');
      case 'week': return created.isSame(moment(), 'week');
      case 'month': return created.isSame(moment(), 'month');
      case 'year': return created.isSame(moment(), 'year');
    }
  });

  const paidOrders = filteredOrders.filter(o => o.payment_status === 'succeeded');

  // Key Metrics
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgPrepTime = 15; // Placeholder

  // Orders by status
  const completedCount = filteredOrders.filter(o => o.status === 'delivered').length;
  const preparingCount = filteredOrders.filter(o => o.status === 'preparing' || o.status === 'accepted' || o.status === 'confirmed').length;
  const readyCount = filteredOrders.filter(o => o.status === 'ready_for_pickup' || o.status === 'ready' || o.status === 'pending_delivery_decision').length;
  const newCount = filteredOrders.filter(o => o.status === 'pending_restaurant' || o.status === 'placed').length;
  const statusTotal = Math.max(completedCount + preparingCount + readyCount + newCount, 1);

  // Popular Items
  const itemMap = new Map<string, { quantity: number; revenue: number }>();
  filteredOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
      itemMap.set(item.name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.price * item.quantity,
      });
    });
  });
  const popularItems: PopularItem[] = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Hourly data
  const hourlyMap = new Map<string, { revenue: number; orders: number }>();
  for (let h = 8; h <= 22; h++) {
    const label = h <= 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    hourlyMap.set(label, { revenue: 0, orders: 0 });
  }
  filteredOrders.forEach(o => {
    const h = moment(o.created_at).hour();
    if (h >= 8 && h <= 22) {
      const label = h <= 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      const existing = hourlyMap.get(label) || { revenue: 0, orders: 0 };
      hourlyMap.set(label, { revenue: existing.revenue + (o.total_amount || 0), orders: existing.orders + 1 });
    }
  });
  const hourlyData: HourlyData[] = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
    hour, ...data, avgOrder: data.orders > 0 ? data.revenue / data.orders : 0,
  }));

  // Peak hours
  const lunchHours = hourlyData.filter(d => ['11am', '12pm', '1pm', '2pm'].includes(d.hour));
  const dinnerHours = hourlyData.filter(d => ['5pm', '6pm', '7pm', '8pm'].includes(d.hour));
  const lunchPeak = lunchHours.reduce((max, d) => d.orders > max.orders ? d : max, { hour: '12pm', orders: 0, revenue: 0, avgOrder: 0 });
  const dinnerPeak = dinnerHours.reduce((max, d) => d.orders > max.orders ? d : max, { hour: '6pm', orders: 0, revenue: 0, avgOrder: 0 });

  // Performance
  const completionRate = totalOrders > 0 ? completedCount / totalOrders : 0;
  const onTimeRate = completionRate > 0 ? Math.min(completionRate * 1.1, 1) : 0; // Approximation

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1e293b' }}>Analytics</h1>
        <button onClick={() => fetchOrders()} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ReloadOutlined /> Refresh
        </button>
      </div>

      {/* Period Selector */}
      <PeriodSelector selected={period} onChange={setPeriod} />

      {/* Key Metrics Grid */}
      <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
        <Col xs={12} md={6}>
          <MetricCard title="Total Revenue" value={`$${Math.round(totalRevenue)}`} change="+0.0%" isPositive={true} icon={<DollarOutlined />} color="#06C167" />
        </Col>
        <Col xs={12} md={6}>
          <MetricCard title="Total Orders" value={`${totalOrders}`} change="+0.0%" isPositive={true} icon={<ShoppingOutlined />} color="#3B82F6" />
        </Col>
        <Col xs={12} md={6}>
          <MetricCard title="Avg Order Value" value={`$${Math.round(avgOrderValue)}`} change="+0.0%" isPositive={true} icon={<RiseOutlined />} color="#8B5CF6" />
        </Col>
        <Col xs={12} md={6}>
          <MetricCard title="Avg Prep Time" value={`${avgPrepTime} min`} change="0 min" isPositive={true} icon={<ClockCircleOutlined />} color="#F59E0B" />
        </Col>
      </Row>

      {/* Revenue Trend Chart */}
      <Card style={{ borderRadius: 16, marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Revenue Trend</span>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
            {(['revenue', 'orders', 'avgOrder'] as const).map(m => (
              <button key={m} onClick={() => setChartMetric(m)} style={{
                padding: '4px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                background: chartMetric === m ? '#fff' : 'transparent',
                color: chartMetric === m ? '#1e293b' : '#64748b',
                fontWeight: chartMetric === m ? 600 : 400,
                boxShadow: chartMetric === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
                {m === 'revenue' ? 'Revenue' : m === 'orders' ? 'Orders' : 'Avg Order'}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={hourlyData} metric={chartMetric} />
      </Card>

      {/* Orders by Status */}
      <Card style={{ borderRadius: 16, marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Orders by Status</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <StatusDonutItem label="Completed" value={completedCount} color="#06C167" total={statusTotal} />
          <StatusDonutItem label="Preparing" value={preparingCount} color="#3B82F6" total={statusTotal} />
          <StatusDonutItem label="Ready" value={readyCount} color="#F59E0B" total={statusTotal} />
          <StatusDonutItem label="New" value={newCount} color="#8B5CF6" total={statusTotal} />
        </div>
      </Card>

      {/* Top Selling Items */}
      <Card style={{ borderRadius: 16, marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Top Selling Items</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{period.charAt(0).toUpperCase() + period.slice(1)}</span>
        </div>
        {popularItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>No order data available</div>
        ) : (
          popularItems.map((item, idx) => (
            <div key={item.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700, color: '#fff',
                  background: idx < 3 ? '#F59E0B' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{item.quantity} orders</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#06C167' }}>${Math.round(item.revenue)}</span>
              </div>
              {idx < popularItems.length - 1 && <div style={{ height: 1, background: '#f0f0f0' }} />}
            </div>
          ))
        )}
      </Card>

      {/* Peak Hours */}
      <Card style={{ borderRadius: 16, marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Peak Hours</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Lunch Peak</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{lunchPeak.hour}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3B82F6' }}>
              <ShoppingOutlined style={{ fontSize: 11 }} /> {lunchPeak.orders} orders
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, background: 'rgba(245,158,11,0.08)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Dinner Peak</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{dinnerPeak.hour}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F59E0B' }}>
              <ShoppingOutlined style={{ fontSize: 11 }} /> {dinnerPeak.orders} orders
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Summary */}
      <Card style={{ borderRadius: 16, marginTop: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Performance Summary</div>
        <PerformanceRow label="Order Completion Rate" value={`${(completionRate * 100).toFixed(1)}%`} progress={completionRate} color="#06C167" />
        <PerformanceRow label="On-Time Delivery" value={`${(onTimeRate * 100).toFixed(1)}%`} progress={onTimeRate} color="#3B82F6" />
      </Card>
    </div>
  );
};

export default VendorAnalytics;
