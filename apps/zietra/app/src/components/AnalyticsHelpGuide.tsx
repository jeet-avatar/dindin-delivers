import { useState } from 'react';
import {

  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  BellAlertIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function AnalyticsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Understanding Key Metrics',
      icon: ChartBarIcon,
      description: 'Learn what each metric card represents and how to interpret the data.',
      details: [
        'Total Revenue: Sum of all closed-won deals in selected period',
        'Trend percentage: Compares current period to previous period',
        'Green up arrow = growth, Red down arrow = decline',
        'Deals Won: Number of successfully closed deals',
        'Conversion Rate: Percentage of deals won vs total deals',
        'Pipeline Value: Total value of all active deals',
        'All metrics update in real-time as data changes',
      ],
      buttonLabel: 'View Metrics',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Select Time Ranges',
      icon: CalendarIcon,
      description: 'Filter analytics by different time periods to track performance trends.',
      details: [
        'Click time range buttons: 7d, 30d, 90d, or 1y',
        'Default view: Last 30 Days',
        'All charts and metrics update automatically',
        'Compare current period to previous period',
        'Use longer ranges (90d, 1y) for trend analysis',
        'Use shorter ranges (7d) for daily performance',
        'Historical data preserved for year-over-year comparison',
      ],
      buttonLabel: 'Change Range',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Read Revenue Trends',
      icon: ArrowTrendingUpIcon,
      description: 'Analyze monthly revenue patterns with the interactive revenue chart.',
      details: [
        'Bar chart shows monthly revenue over time',
        'Hover over bars to see exact revenue amounts',
        'Taller bars = higher revenue that month',
        'Identify seasonal patterns and trends',
        'Compare month-over-month growth',
        'Use for forecasting future revenue',
        'Export data for deeper analysis',
      ],
      buttonLabel: 'View Chart',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Analyze Pipeline Stages',
      icon: FunnelIcon,
      description: 'Monitor how deals are distributed across your sales pipeline stages.',
      details: [
        'View deal count and total value per stage',
        'Prospecting → Qualification → Proposal → Negotiation',
        'Identify bottlenecks (stages with many deals)',
        'Monitor stage-to-stage conversion rates',
        'Track deals moving through pipeline',
        'Optimize stages with low conversion',
        'Use to forecast closing deals',
      ],
      buttonLabel: 'View Pipeline',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      title: 'Track Lead Sources',
      icon: DocumentChartBarIcon,
      description: 'Understand where your best leads come from to optimize marketing spend.',
      details: [
        'See percentage breakdown by lead source',
        'Sources: Website, Referral, Cold Outreach, Events, etc.',
        'Identify highest-performing channels',
        'Track source-to-revenue conversion',
        'Optimize marketing budget allocation',
        'Focus on channels with best ROI',
        'Compare source performance over time',
      ],
      buttonLabel: 'View Sources',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: ArrowTrendingUpIcon,
      title: 'Real-Time Metrics',
      description: 'All analytics update automatically as data changes. No manual refresh needed - see revenue, deals, and pipeline instantly.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: CalendarIcon,
      title: 'Flexible Time Ranges',
      description: 'View analytics for 7 days, 30 days, 90 days, or 1 year. Compare current performance to previous periods automatically.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ChartBarIcon,
      title: 'Revenue Tracking',
      description: 'Monitor total revenue, growth trends, and month-over-month changes with visual charts and percentage indicators.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: FunnelIcon,
      title: 'Pipeline Analytics',
      description: 'Track deals by stage, identify bottlenecks, and monitor conversion rates across your entire sales funnel.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Deal Performance',
      description: 'Track won/lost/pending deals, conversion rates, average deal size, and sales velocity for performance insights.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: DocumentChartBarIcon,
      title: 'Lead Source Analysis',
      description: 'Identify which marketing channels generate the most leads and revenue to optimize your marketing strategy.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: PresentationChartLineIcon,
      title: 'Visual Dashboards',
      description: 'Beautiful, easy-to-read charts and graphs make complex data simple to understand at a glance.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: TableCellsIcon,
      title: 'Detailed Breakdowns',
      description: 'Drill down into metrics with detailed tables showing counts, values, percentages, and trends.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: ArrowPathIcon,
      title: 'Trend Comparisons',
      description: 'Automatically compare current period to previous period with percentage change indicators (growth/decline).',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: AdjustmentsHorizontalIcon,
      title: 'Customizable Views',
      description: 'Filter and segment data by time range, team member, product, or custom fields for targeted insights.',
      gradient: 'from-orange-600 to-pink-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Check Analytics Daily',
      description: 'Review key metrics every morning to spot trends early. Use the 7-day view to track daily performance and quickly identify issues or opportunities.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Compare Time Periods',
      description: 'Always look at trend percentages to understand growth or decline. Compare this month vs last month, this quarter vs last quarter for context.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Monitor Pipeline Health',
      description: 'A healthy pipeline has deals evenly distributed across stages. Too many in one stage = bottleneck. Too few in early stages = future revenue risk.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Optimize Lead Sources',
      description: 'Double down on lead sources with highest conversion rates. Cut spending on low-performing channels. Track ROI per source monthly.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Set Revenue Goals',
      description: 'Use historical data to set realistic revenue targets. Track progress daily. Adjust sales tactics if trending below goal mid-month.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Identify Seasonal Patterns',
      description: 'Use 1-year view to spot seasonal trends. Plan inventory, staffing, and marketing campaigns around high/low revenue months.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Share Reports with Team',
      description: 'Export analytics for team meetings. Celebrate wins, analyze losses, and align everyone on goals using real data.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Track Conversion Rates',
      description: 'Conversion rate is your most important metric. Industry average is 20-30%. Below 15% = fix pipeline. Above 40% = increase lead volume.',
      gradient: 'from-rose-600 to-pink-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 p-8 relative rounded-t-3xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-4xl font-bold text-white mb-3">Analytics Guide</h2>
              <p className="text-lg text-white/90">Make data-driven decisions with powerful insights</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setActiveTab('quickstart')}
              className={`px-6 py-3 rounded-xl transition-all ${
                activeTab === 'quickstart'
                  ? 'bg-[#161625] text-white font-bold shadow-lg border border-indigo-500/30'
                  : 'bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60'
              }`}
            >
              Quick Start
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`px-6 py-3 rounded-xl transition-all ${
                activeTab === 'features'
                  ? 'bg-[#161625] text-white font-bold shadow-lg border border-indigo-500/30'
                  : 'bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60'
              }`}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={`px-6 py-3 rounded-xl transition-all ${
                activeTab === 'tips'
                  ? 'bg-[#161625] text-white font-bold shadow-lg border border-indigo-500/30'
                  : 'bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60'
              }`}
            >
              Pro Tips
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'quickstart' && (
            <>
              <p className="text-lg text-white mb-6">
                Learn how to read and interpret your CRM analytics for better business decisions.
              </p>

              {quickStartSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-white/80 mb-4">{step.description}</p>
                        <ul className="space-y-2 mb-6">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-white/80">
                              <CheckCircleIcon className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all"
                        >
                          {step.buttonLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {activeTab === 'features' && (
            <>
              <p className="text-lg text-white mb-6">
                Discover powerful analytics features to track performance and grow your business.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                          <p className="text-white/80">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'tips' && (
            <>
              <p className="text-lg text-white mb-6">
                Master analytics best practices to drive revenue growth and business success.
              </p>

              {proTips.map((tip, index) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-orange-100 via-rose-50 to-orange-50 border-3 border-black rounded-3xl shadow-xl p-6 hover:shadow-2xl transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{tip.title}</h3>
                        <p className="text-white/80">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#12121f] border-t-2 border-black p-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
