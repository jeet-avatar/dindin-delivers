import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  DollarSign,
  Users,
  Car,
  Utensils,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { Spin } from 'antd';
import api from '../../api/api';

interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  total_drivers: number;
  total_vendors: number;
  active_orders: number;
  active_rides: number;
  pending_vendors: number;
  orders_today: number;
  revenue_today: number;
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const Main: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivity();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/dashboard/recent-activity');
      setActivities(Array.isArray(response.data) ? response.data : response.data?.activities || []);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Orders',
      value: stats?.total_orders ?? 0,
      icon: <ShoppingBag className="h-6 w-6 text-primary-600" />,
      bg: 'bg-primary-50',
      subtitle: `${stats?.orders_today ?? 0} today`
    },
    {
      label: 'Total Revenue',
      value: `$${(stats?.total_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="h-6 w-6 text-success-600" />,
      bg: 'bg-success-50',
      subtitle: `$${(stats?.revenue_today ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today`
    },
    {
      label: 'Active Customers',
      value: stats?.total_customers ?? 0,
      icon: <Users className="h-6 w-6 text-secondary-600" />,
      bg: 'bg-secondary-50',
      subtitle: 'Registered customers'
    },
    {
      label: 'Active Drivers',
      value: stats?.total_drivers ?? 0,
      icon: <Car className="h-6 w-6 text-warning-600" />,
      bg: 'bg-warning-50',
      subtitle: 'Approved drivers'
    },
    {
      label: 'Restaurants',
      value: stats?.total_vendors ?? 0,
      icon: <Utensils className="h-6 w-6 text-error-600" />,
      bg: 'bg-error-50',
      subtitle: `${stats?.pending_vendors ?? 0} pending approval`
    },
    {
      label: 'Active Now',
      value: (stats?.active_orders ?? 0) + (stats?.active_rides ?? 0),
      icon: <TrendingUp className="h-6 w-6 text-primary-600" />,
      bg: 'bg-primary-50',
      subtitle: `${stats?.active_orders ?? 0} orders, ${stats?.active_rides ?? 0} rides`
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingBag className="h-4 w-4 text-primary-500" />;
      case 'ride': return <Car className="h-4 w-4 text-warning-500" />;
      case 'vendor': return <Utensils className="h-4 w-4 text-error-500" />;
      case 'driver': return <Users className="h-4 w-4 text-secondary-500" />;
      default: return <Activity className="h-4 w-4 text-neutral-500" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Dollor.ai Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Platform overview -- Food Delivery & Rideshare Operations
        </p>
      </div>

      {/* Stat Cards */}
      <Spin spinning={loading} size="large" tip="Loading stats...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white p-6 rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">{card.value}</p>
                  <p className="text-xs text-neutral-500">{card.subtitle}</p>
                </div>
                <div className={`p-3 ${card.bg} rounded-full`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Spin>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-medium text-neutral-900">Recent Activity</h2>
        </div>
        <Spin spinning={activityLoading} tip="Loading activity...">
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.slice(0, 20).map((activity, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-start space-x-3 py-2 border-b border-neutral-100 last:border-0"
                >
                  <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700">{activity.description}</p>
                    <p className="text-xs text-neutral-400">{formatTimestamp(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center py-8">
              No recent activity to display
            </p>
          )}
        </Spin>
      </div>
    </div>
  );
};

export default Main;
