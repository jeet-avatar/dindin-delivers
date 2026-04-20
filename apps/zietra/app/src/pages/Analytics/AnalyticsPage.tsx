import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { AnalyticsHelpGuide } from '../../components/AnalyticsHelpGuide';

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    trend: number;
    data: Array<{ month: string; value: number }>;
  };
  deals: {
    won: number;
    lost: number;
    pending: number;
    conversionRate: number;
  };
  pipeline: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
  leadSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

export function AnalyticsPage() {
  const { gradients } = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(
        `${apiUrl}/api/analytics?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-[#252540] rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-[#252540] rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchAnalytics}
            className={`mt-4 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl hover:shadow-lg font-bold tracking-wide shadow-md`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="text-center text-[#94A3B8]">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...analytics.revenue.data.map(d => d.value), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#F1F5F9]">Analytics</h1>
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              title="Show Help Guide"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[#94A3B8] mt-1">Real-time insights from your CRM data • Click ? for help</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all tracking-wide ${
                timeRange === range
                  ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                  : 'bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] hover:bg-[#12121f] shadow-sm'
              }`}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div className={`flex items-center text-sm font-bold ${analytics.revenue.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.revenue.trend >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(analytics.revenue.trend)}%
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#F1F5F9] mb-1">{formatCurrency(analytics.revenue.current)}</h3>
          <p className="text-sm font-bold text-[#F1F5F9]">Total Revenue</p>
          <p className="text-xs font-medium text-[#CBD5E1] mt-2">Previous: {formatCurrency(analytics.revenue.previous)}</p>
        </div>

        <div className="card p-6 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradients.brand.primary.gradient.replace('to-r', 'to-br')} rounded-xl flex items-center justify-center shadow-md`}>
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-sm font-bold text-indigo-400">
              {analytics.deals.conversionRate}%
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#F1F5F9] mb-1">{analytics.deals.won}</h3>
          <p className="text-sm font-bold text-[#F1F5F9]">Deals Won</p>
          <p className="text-xs font-medium text-[#CBD5E1] mt-2">
            {analytics.deals.lost} lost • {analytics.deals.pending} pending
          </p>
        </div>

        <div className="card p-6 bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradients.brand.primary.gradient.replace('to-r', 'to-br')} rounded-xl flex items-center justify-center shadow-md`}>
              <BuildingOfficeIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#F1F5F9] mb-1">
            {formatCurrency(analytics.pipeline.reduce((sum, stage) => sum + stage.value, 0))}
          </h3>
          <p className="text-sm font-bold text-[#F1F5F9]">Pipeline Value</p>
          <p className="text-xs font-medium text-[#CBD5E1] mt-2">
            {analytics.pipeline.reduce((sum, stage) => sum + stage.count, 0)} deals in pipeline
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card mb-8">
        <div className="p-6 border-b border-[#1c1c30]">
          <h3 className="text-lg font-semibold text-[#F1F5F9]">Revenue Trend</h3>
          <p className="text-sm text-[#94A3B8]">Monthly revenue over the past year</p>
        </div>
        <div className="p-6">
          <div className="h-80 flex items-end justify-between gap-2">
            {analytics.revenue.data.map((item, index) => {
              const height = (item.value / maxRevenue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div
                      className={`w-full bg-gradient-to-t ${gradients.brand.primary.gradient.replace('to-r', 'to-t')} rounded-t-xl transition-all duration-300 hover:shadow-lg cursor-pointer`}
                      style={{ height: `${height * 2.5}px` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity font-bold">
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-2 font-medium">{item.month}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pipeline and Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pipeline Distribution */}
        <div className="card">
          <div className="p-6 border-b border-[#1c1c30]">
            <h3 className="text-lg font-semibold text-[#F1F5F9]">Pipeline Distribution</h3>
            <p className="text-sm text-[#94A3B8]">Deals by stage</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.pipeline.map((stage, index) => {
                const colors = ['bg-[#12121f]0', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600', 'bg-green-500'];
                const totalValue = analytics.pipeline.reduce((sum, s) => sum + s.value, 0);
                const percentage = totalValue > 0 ? (stage.value / totalValue) * 100 : 0;

                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-[#F1F5F9]">{stage.stage}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#F1F5F9]">{formatCurrency(stage.value)}</span>
                        <span className="text-xs text-[#94A3B8] ml-2 font-medium">({stage.count} deals)</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#252540] rounded-full h-3 shadow-inner">
                      <div
                        className={`h-3 rounded-full ${colors[index]} shadow-sm`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="card">
          <div className="p-6 border-b border-[#1c1c30]">
            <h3 className="text-lg font-semibold text-[#F1F5F9]">Lead Sources</h3>
            <p className="text-sm text-[#94A3B8]">Where your leads come from</p>
          </div>
          <div className="p-6">
            {analytics.leadSources.length > 0 ? (
              <div className="space-y-4">
                {analytics.leadSources.map((source, index) => {
                  const colors = [
                    'bg-orange-400',
                    'bg-orange-500',
                    'bg-orange-600',
                    'bg-amber-500',
                    'bg-[#12121f]0',
                  ];

                  return (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} shadow-sm`}></div>
                          <span className="text-sm font-bold text-[#F1F5F9]">{source.source}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#F1F5F9]">{source.count}</span>
                          <span className="text-xs text-[#94A3B8] ml-2 font-medium">({source.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#252540] rounded-full h-3 shadow-inner">
                        <div
                          className={`h-3 rounded-full ${colors[index % colors.length]} shadow-sm`}
                          style={{ width: `${source.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-[#94A3B8]">
                <p>No lead sources data available yet.</p>
                <p className="text-sm mt-2">Add contacts with source information to see this data.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Guide */}
      {showHelpGuide && (
        <AnalyticsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}
