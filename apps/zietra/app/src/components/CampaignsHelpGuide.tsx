import { useState } from 'react';
import {

  EnvelopeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
  DocumentTextIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function CampaignsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      icon: EnvelopeIcon,
      title: 'Create Your First Campaign',
      description: 'Launch email campaigns to engage your contacts and drive conversions.',
      details: [
        'Click "Create Campaign" button',
        'Give your campaign a name',
        'Choose email template or create custom',
        'Select target contacts or segments',
        'Schedule or send immediately',
        'Track opens, clicks, and responses',
      ],
    },
    {
      icon: UserGroupIcon,
      title: 'Target Your Audience',
      description: 'Filter and segment contacts for targeted messaging.',
      details: [
        'Filter contacts by status, tag, or custom field',
        'Create segments for targeted messaging',
        'Import contacts from CSV',
        'Sync with CRM contact lists',
      ],
    },
  ];

  const features = [
    {
      icon: DocumentTextIcon,
      title: 'Email Templates',
      description: 'Use pre-built templates or create custom designs',
    },
    {
      icon: ClockIcon,
      title: 'Scheduling',
      description: 'Schedule campaigns for optimal send times',
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics',
      description: 'Track opens, clicks, and conversions',
    },
    {
      icon: SparklesIcon,
      title: 'Personalization',
      description: 'Use contact variables for personalized emails',
    },
  ];

  const tips = [
    {
      icon: LightBulbIcon,
      title: 'Segment Your Audience',
      description: 'Send targeted messages to specific groups for better engagement',
    },
    {
      icon: LightBulbIcon,
      title: 'Test Before Sending',
      description: 'Always send test emails to yourself before launching',
    },
    {
      icon: LightBulbIcon,
      title: 'Optimize Send Times',
      description: 'Tuesday-Thursday mornings typically get the best open rates',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Clear Subject Lines',
      description: 'Keep subject lines under 50 characters for best results',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 p-8 relative rounded-t-3xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-4xl font-bold text-white mb-3">Email Campaigns Guide</h2>
              <p className="text-lg text-white/90">Create and manage automated email campaigns to engage your contacts</p>
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
              Tips & Tricks
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'quickstart' && (
            <>
              <p className="text-lg text-white mb-6">
                Follow these steps to create and launch effective email campaigns.
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
                        <ul className="space-y-2">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-white/80">
                              <CheckCircleIcon className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
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
                Explore powerful campaign features to boost your email marketing effectiveness.
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
                Master these best practices to maximize your campaign performance.
              </p>

              {tips.map((tip, index) => {
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
