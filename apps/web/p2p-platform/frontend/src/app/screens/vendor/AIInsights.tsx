import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spin, message, Button } from 'antd';
import {
  RobotOutlined,
  RiseOutlined,
  BarChartOutlined,
  StarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ShoppingOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  ReloadOutlined,
  WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { getApiUrl, getCurrentVendorId } from '../../api/api';

const API_URL = getApiUrl();

/**
 * VendorAIInsights - Matches iOS AIInsightsView exactly
 *
 * Features from iOS:
 * - AI Status Header (brain icon, active indicator, order count)
 * - Period selector: Today / Week / Month / Year
 * - Insight Type tabs: Demand, Performance, Top Items, Staffing
 * - Demand Forecast card with predictions
 * - Performance Metrics grid
 * - Popular Items ranked list
 * - Staffing Recommendations
 * - Smart Recommendations
 * - Peak Hours (lunch/dinner)
 */

type InsightType = 'demand' | 'performance' | 'items' | 'staff';
type Period = 'today' | 'week' | 'month' | 'year';

interface Order {
  id: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: { name: string; quantity: number; price: number }[];
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: string;
  icon: string;
}

interface StaffingSlot {
  timeSlot: string;
  recommendedStaff: number;
  expectedOrders: number;
}

// ==================== COMPONENTS ====================

const InsightTypeButton: React.FC<{
  type: InsightType; label: string; icon: React.ReactNode; color: string;
  isSelected: boolean; onClick: () => void;
}> = ({ label, icon, color, isSelected, onClick }) => (
  <button onClick={onClick} style={{
    width: 80, height: 70, border: 'none', borderRadius: 12, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: isSelected ? color : `${color}15`,
    color: isSelected ? '#fff' : color,
    transition: 'all 0.2s',
  }}>
    <span style={{ fontSize: 22 }}>{icon}</span>
    <span style={{ fontSize: 11, fontWeight: isSelected ? 600 : 400 }}>{label}</span>
  </button>
);

const PredictionBadge: React.FC<{ label: string; value: string; sublabel: string; color: string }> = ({ label, value, sublabel, color }) => (
  <div style={{
    flex: 1, textAlign: 'center', padding: '10px 4px',
    background: `${color}12`, borderRadius: 10,
  }}>
    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
    <div style={{ fontSize: 10, color: '#64748b' }}>{sublabel}</div>
  </div>
);

const MetricTile: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div style={{
    padding: 16, borderRadius: 12,
    background: 'rgba(0,0,0,0.02)',
  }}>
    <div style={{ color, fontSize: 18, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: '#64748b' }}>{title}</div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const VendorAIInsights: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<InsightType>('demand');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [aiDashboard, setAiDashboard] = useState<any>(null);

  const vendorId = getCurrentVendorId();

  const fetchData = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem('id_token') || localStorage.getItem('access_token') || ''}`,
      };
      const [ordersRes, aiRes] = await Promise.all([
        axios.get(`${API_URL}/api/orders`, { params: { vendor_id: vendorId }, headers }),
        axios.get(`${API_URL}/api/ai/dashboard`, { headers }).catch(() => ({ data: null })),
      ]);
      setOrders(ordersRes.data || []);
      setAiDashboard(aiRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter orders by period
  const filteredOrders = orders.filter(o => {
    const created = moment(o.created_at);
    switch (selectedPeriod) {
      case 'today': return created.isSame(moment(), 'day');
      case 'week': return created.isSame(moment(), 'week');
      case 'month': return created.isSame(moment(), 'month');
      case 'year': return created.isSame(moment(), 'year');
    }
  });

  const paidOrders = filteredOrders.filter(o => o.payment_status === 'succeeded');
  const totalOrders = filteredOrders.length;
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completedCount = filteredOrders.filter(o => o.status === 'delivered').length;
  const completionRate = totalOrders > 0 ? completedCount / totalOrders : 0;
  const avgPrepTime = 15;

  // Popular items
  const itemMap = new Map<string, { quantity: number; revenue: number }>();
  filteredOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const existing = itemMap.get(item.name) || { quantity: 0, revenue: 0 };
      itemMap.set(item.name, { quantity: existing.quantity + item.quantity, revenue: existing.revenue + item.price * item.quantity });
    });
  });
  const popularItems = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Hourly data for demand forecast
  const hourlyMap = new Map<number, number>();
  filteredOrders.forEach(o => {
    const h = moment(o.created_at).hour();
    hourlyMap.set(h, (hourlyMap.get(h) || 0) + 1);
  });

  // Peak hours
  const lunchOrders = [11, 12, 13, 14].reduce((s, h) => s + (hourlyMap.get(h) || 0), 0);
  const dinnerOrders = [17, 18, 19, 20].reduce((s, h) => s + (hourlyMap.get(h) || 0), 0);
  const lunchPeakHour = [11, 12, 13, 14].reduce((max, h) => (hourlyMap.get(h) || 0) > (hourlyMap.get(max) || 0) ? h : max, 12);
  const dinnerPeakHour = [17, 18, 19, 20].reduce((max, h) => (hourlyMap.get(h) || 0) > (hourlyMap.get(max) || 0) ? h : max, 18);
  const formatHour = (h: number) => h <= 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;

  // Demand forecast
  const nextHourOrders = Math.max(Math.round(totalOrders / 12), 1);
  const forecastConfidence = totalOrders > 10 ? 0.82 : totalOrders > 3 ? 0.65 : 0.4;

  // Staffing recommendations
  const staffingSlots: StaffingSlot[] = [
    { timeSlot: '8:00 - 11:00', recommendedStaff: Math.max(1, Math.round(lunchOrders / 5)), expectedOrders: Math.round(lunchOrders * 0.3) },
    { timeSlot: '11:00 - 14:00', recommendedStaff: Math.max(2, Math.round(lunchOrders / 3)), expectedOrders: lunchOrders },
    { timeSlot: '14:00 - 17:00', recommendedStaff: Math.max(1, Math.round((lunchOrders + dinnerOrders) / 8)), expectedOrders: Math.round((lunchOrders + dinnerOrders) / 4) },
    { timeSlot: '17:00 - 21:00', recommendedStaff: Math.max(2, Math.round(dinnerOrders / 3)), expectedOrders: dinnerOrders },
    { timeSlot: '21:00 - 23:00', recommendedStaff: 1, expectedOrders: Math.round(dinnerOrders * 0.2) },
  ];

  // Smart recommendations
  const recommendations: Recommendation[] = [];
  if (avgPrepTime > 20) {
    recommendations.push({ id: '1', title: 'Reduce Prep Time', description: 'Your avg prep time is above 20 min. Consider prep batching.', impact: 'Could improve on-time by 15%', priority: 'high', icon: 'clock' });
  }
  if (avgOrderValue < 25) {
    recommendations.push({ id: '2', title: 'Boost Order Value', description: 'Suggest combos or add-ons at checkout to increase average order.', impact: 'Potential +20% revenue per order', priority: 'medium', icon: 'dollar' });
  }
  if (completionRate < 0.9 && totalOrders > 5) {
    recommendations.push({ id: '3', title: 'Improve Completion Rate', description: `Your completion rate is ${(completionRate * 100).toFixed(0)}%. Review declined orders.`, impact: 'Fewer refunds, better ratings', priority: 'high', icon: 'check' });
  }
  if (recommendations.length === 0) {
    recommendations.push({ id: '4', title: 'Keep It Up!', description: 'Your restaurant is performing well. Continue monitoring trends.', impact: 'Steady growth expected', priority: 'low', icon: 'bulb' });
  }

  const getRecIcon = (icon: string) => {
    switch (icon) {
      case 'clock': return <ClockCircleOutlined />;
      case 'dollar': return <DollarOutlined />;
      case 'check': return <CheckCircleOutlined />;
      default: return <BulbOutlined />;
    }
  };
  const getPriorityColor = (p: string) => p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#3B82F6';

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
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1e293b' }}>AI Insights</h1>
        <button onClick={() => fetchData()} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ReloadOutlined /> Refresh
        </button>
      </div>

      {/* AI Status Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16, marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.08) 100%)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RobotOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>AI Engine Active</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiDashboard ? '#10B981' : '#F59E0B' }} />
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Analyzing {totalOrders} orders to optimize your restaurant
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {(['today', 'week', 'month', 'year'] as Period[]).map(p => (
          <button key={p} onClick={() => setSelectedPeriod(p)} style={{
            padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14,
            fontWeight: selectedPeriod === p ? 600 : 400, whiteSpace: 'nowrap',
            background: selectedPeriod === p ? '#F59E0B' : 'rgba(0,0,0,0.04)',
            color: selectedPeriod === p ? '#fff' : '#64748b',
          }}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Insight Type Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, overflowX: 'auto' }}>
        <InsightTypeButton type="demand" label="Demand" icon={<RiseOutlined />} color="#8B5CF6" isSelected={selectedInsight === 'demand'} onClick={() => setSelectedInsight('demand')} />
        <InsightTypeButton type="performance" label="Performance" icon={<BarChartOutlined />} color="#10B981" isSelected={selectedInsight === 'performance'} onClick={() => setSelectedInsight('performance')} />
        <InsightTypeButton type="items" label="Top Items" icon={<StarOutlined />} color="#F59E0B" isSelected={selectedInsight === 'items'} onClick={() => setSelectedInsight('items')} />
        <InsightTypeButton type="staff" label="Staffing" icon={<TeamOutlined />} color="#3B82F6" isSelected={selectedInsight === 'staff'} onClick={() => setSelectedInsight('staff')} />
      </div>

      {/* === DEMAND FORECAST === */}
      {selectedInsight === 'demand' && (
        <Card style={{ borderRadius: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <RiseOutlined style={{ color: '#8B5CF6', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Demand Forecast</span>
          </div>
          {totalOrders === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
              Not enough data for forecast. Keep processing orders!
            </div>
          ) : (
            <>
              {/* Simple visual forecast */}
              <div style={{ height: 120, display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 16, padding: '0 8px' }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const h = 8 + i;
                  const count = hourlyMap.get(h) || 0;
                  const maxH = Math.max(...Array.from(hourlyMap.values()), 1);
                  const height = (count / maxH) * 90;
                  const isFuture = h > moment().hour();
                  return (
                    <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div style={{
                        width: '100%', maxWidth: 28, height: Math.max(height, 4), borderRadius: '4px 4px 0 0',
                        background: isFuture
                          ? 'repeating-linear-gradient(45deg, rgba(139,92,246,0.3), rgba(139,92,246,0.3) 2px, rgba(139,92,246,0.1) 2px, rgba(139,92,246,0.1) 4px)'
                          : 'linear-gradient(180deg, #8B5CF6 0%, rgba(139,92,246,0.5) 100%)',
                      }} />
                      <span style={{ fontSize: 8, color: '#94a3b8' }}>{h > 12 ? `${h - 12}p` : `${h}a`}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <PredictionBadge label="Next Hour" value={`${nextHourOrders}`} sublabel="orders expected" color="#8B5CF6" />
                <PredictionBadge label="Peak Time" value={formatHour(dinnerPeakHour)} sublabel={`${hourlyMap.get(dinnerPeakHour) || 0} orders`} color="#F59E0B" />
                <PredictionBadge label="Confidence" value={`${Math.round(forecastConfidence * 100)}%`} sublabel="accuracy" color="#10B981" />
              </div>
            </>
          )}
        </Card>
      )}

      {/* === PERFORMANCE === */}
      {selectedInsight === 'performance' && (
        <Card style={{ borderRadius: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChartOutlined style={{ color: '#10B981', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Performance Metrics</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <MetricTile title="Total Orders" value={`${totalOrders}`} icon={<ShoppingOutlined />} color="#3B82F6" />
            <MetricTile title="Revenue" value={`$${Math.round(totalRevenue)}`} icon={<DollarOutlined />} color="#10B981" />
            <MetricTile title="Avg Order" value={`$${Math.round(avgOrderValue)}`} icon={<RiseOutlined />} color="#8B5CF6" />
            <MetricTile title="Completion Rate" value={`${Math.round(completionRate * 100)}%`} icon={<CheckCircleOutlined />} color="#F59E0B" />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, background: 'rgba(0,0,0,0.02)', borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ color: '#3B82F6' }} />
              <span style={{ fontSize: 14 }}>Avg Prep Time</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: avgPrepTime > 25 ? '#EF4444' : '#10B981' }}>
              {avgPrepTime} min
            </span>
          </div>
        </Card>
      )}

      {/* === TOP ITEMS === */}
      {selectedInsight === 'items' && (
        <Card style={{ borderRadius: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StarOutlined style={{ color: '#F59E0B', fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Top Selling Items</span>
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>{selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</span>
          </div>
          {popularItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>No order data available yet</div>
          ) : (
            popularItems.map((item, idx) => (
              <div key={item.name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700, color: '#fff',
                    background: idx < 3 ? '#F59E0B' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{idx + 1}</span>
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
      )}

      {/* === STAFFING === */}
      {selectedInsight === 'staff' && (
        <Card style={{ borderRadius: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TeamOutlined style={{ color: '#3B82F6', fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Staffing Recommendations</span>
          </div>
          {totalOrders === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>Not enough data for staffing recommendations</div>
          ) : (
            <>
              {staffingSlots.map((slot, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: idx < staffingSlots.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <span style={{ width: 120, fontSize: 14 }}>{slot.timeSlot}</span>
                  <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                    {Array.from({ length: slot.recommendedStaff }, (_, i) => (
                      <TeamOutlined key={i} style={{ color: '#10B981', fontSize: 14 }} />
                    ))}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{slot.recommendedStaff} staff</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{slot.expectedOrders} orders</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
                <BulbOutlined style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>Based on {selectedPeriod} order patterns</span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Smart Recommendations (always visible) */}
      <Card style={{ borderRadius: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ThunderboltOutlined style={{ color: '#8B5CF6', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>Smart Recommendations</span>
        </div>
        {recommendations.map(rec => (
          <div key={rec.id} style={{
            display: 'flex', gap: 12, padding: 16, marginBottom: 8, borderRadius: 10,
            background: `${getPriorityColor(rec.priority)}08`,
          }}>
            <span style={{ fontSize: 20, color: getPriorityColor(rec.priority), width: 40, textAlign: 'center' }}>
              {getRecIcon(rec.icon)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{rec.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{rec.description}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#10B981' }}>{rec.impact}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Peak Hours */}
      <Card style={{ borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: '#3B82F6', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>Peak Hours</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Lunch Peak</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{formatHour(lunchPeakHour)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3B82F6' }}>
              <ShoppingOutlined style={{ fontSize: 11 }} /> {lunchOrders} orders
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, background: 'rgba(245,158,11,0.08)', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Dinner Peak</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{formatHour(dinnerPeakHour)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#F59E0B' }}>
              <ShoppingOutlined style={{ fontSize: 11 }} /> {dinnerOrders} orders
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VendorAIInsights;
