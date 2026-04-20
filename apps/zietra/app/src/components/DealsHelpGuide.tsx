import { useState } from 'react';
import {

  CurrencyDollarIcon,
  PlusIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  TagIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  LightBulbIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function DealsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Create Your First Deal',
      icon: PlusIcon,
      description: 'Click "Add Deal" to create a new sales opportunity in your pipeline.',
      details: [
        'Enter deal title (e.g., "Acme Corp - Enterprise Plan")',
        'Set deal value (expected revenue)',
        'Assign win probability (0-100%)',
        'Link to company and primary contact',
        'Set expected close date',
        'Choose initial stage (usually "Prospecting")',
        'Add notes or description',
        'Click "Create Deal" to save',
      ],
      buttonLabel: 'Add Deal',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Move Deals Through Stages',
      icon: ArrowsRightLeftIcon,
      description: 'Drag and drop deals between stages as they progress through your sales pipeline.',
      details: [
        'Deals start in "Prospecting" stage',
        'Drag deal cards to move between stages',
        'Stages: Prospecting → Qualification → Proposal → Negotiation',
        'Update probability as deal progresses',
        'Add notes when changing stages',
        'End stages: "Closed Won" or "Closed Lost"',
        'Pipeline automatically calculates weighted value',
      ],
      buttonLabel: 'Try Drag & Drop',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Track Deal Progress',
      icon: ChartBarIcon,
      description: 'Monitor deal metrics, win probability, and expected close dates.',
      details: [
        'View deal value and weighted value (value × probability)',
        'Track days in current stage',
        'Monitor expected close dates',
        'View deal history and activity log',
        'See linked contacts and companies',
        'Track email and call interactions',
        'Identify stalled or at-risk deals',
      ],
      buttonLabel: 'View Analytics',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Set Deal Reminders',
      icon: CalendarIcon,
      description: 'Schedule follow-ups and set reminders to stay on top of your deals.',
      details: [
        'Click on a deal to view details',
        'Set expected close date',
        'Add tasks and reminders',
        'Schedule follow-up calls or meetings',
        'Get notifications for upcoming deadlines',
        'Track overdue deals',
        'Update dates as deal progresses',
      ],
      buttonLabel: 'Set Reminder',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      title: 'Collaborate with Your Team',
      icon: UserGroupIcon,
      description: 'Assign deals to team members and collaborate on closing opportunities.',
      details: [
        'Assign deal owner (primary responsible person)',
        'Add team members as collaborators',
        'Share notes and updates',
        'Track team activity on each deal',
        'Filter deals by assigned user',
        'View team pipeline and forecasts',
        'Collaborate on proposals and negotiations',
      ],
      buttonLabel: 'Assign Team',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: CurrencyDollarIcon,
      title: 'Pipeline Value Tracking',
      description: 'Automatically calculate total pipeline value, weighted value, and forecast revenue based on deal probabilities.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: ArrowsRightLeftIcon,
      title: 'Drag & Drop Pipeline',
      description: 'Visually manage your sales pipeline with intuitive drag-and-drop cards across 6 deal stages.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ChartBarIcon,
      title: 'Deal Analytics',
      description: 'Track conversion rates, average deal size, sales velocity, and win/loss ratios with built-in analytics.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: CalendarIcon,
      title: 'Close Date Management',
      description: 'Set expected close dates, track overdue deals, and get automatic reminders for upcoming deadlines.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: UserGroupIcon,
      title: 'Team Collaboration',
      description: 'Assign deals to team members, share notes, and collaborate on closing opportunities together.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: TagIcon,
      title: 'Deal Categorization',
      description: 'Tag deals by product, industry, deal type, or custom categories for better organization and reporting.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: FunnelIcon,
      title: 'Advanced Filtering',
      description: 'Filter deals by stage, value range, close date, assigned user, probability, and custom fields.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: ClipboardDocumentListIcon,
      title: 'Activity Timeline',
      description: 'Track all deal activities including emails, calls, meetings, stage changes, and notes in one timeline.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: BellAlertIcon,
      title: 'Smart Notifications',
      description: 'Get alerts for deals approaching close dates, stalled deals, and stage changes requiring action.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: SparklesIcon,
      title: 'Deal Insights',
      description: 'AI-powered insights identify at-risk deals, suggest next actions, and predict win likelihood.',
      gradient: 'from-orange-600 to-pink-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Update Probability as Deals Progress',
      description: 'Adjust win probability at each stage. Typical ranges: Prospecting 10%, Qualification 25%, Proposal 50%, Negotiation 75%, to ensure accurate forecasting.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Link Every Deal to a Company & Contact',
      description: 'Always associate deals with both a company and primary contact. This enables activity tracking, email integration, and complete relationship visibility.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Set Realistic Close Dates',
      description: 'Use expected close dates to prioritize work and generate accurate sales forecasts. Update dates as situations change to maintain forecast accuracy.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Add Notes When Changing Stages',
      description: 'Document why a deal moved stages, next steps, and key decisions. This creates valuable history and helps with handoffs or team collaboration.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Review Stalled Deals Weekly',
      description: 'Identify deals that haven\'t moved in 2+ weeks. Either advance them, close them as lost, or schedule follow-ups to keep pipeline healthy.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Weighted Value for Forecasting',
      description: 'Weighted value (deal value × probability) gives realistic revenue forecasts. Focus on high weighted-value deals for best ROI on your time.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Track Lost Reasons',
      description: 'When marking deals "Closed Lost", always note the reason (price, timing, competitor, etc.). This data improves future win rates.',
      gradient: 'from-amber-600 to-orange-600',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 p-8 relative rounded-t-3xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-4xl font-bold text-white mb-3">Deals Pipeline Guide</h2>
              <p className="text-lg text-white/90">Master your sales pipeline and close more deals</p>
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
                Follow these steps to effectively manage your sales pipeline and close deals faster.
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
                Explore the powerful features designed to help you close more deals.
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
                Master these best practices to maximize your sales effectiveness and win rates.
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
