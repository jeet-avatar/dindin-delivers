import { useState } from 'react';
import {

  VideoCameraIcon,
  SparklesIcon,
  PlayIcon,
  CloudArrowUpIcon,
  UserGroupIcon,
  ChartBarIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function VideoCampaignsHelpGuide({ onClose }: HelpGuideProps) {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      icon: VideoCameraIcon,
      title: 'Create Your First Video Campaign',
      description: 'Generate personalized AI-powered video campaigns at scale.',
      details: [
        'Click "Create Video Campaign" button',
        'Upload your base video template',
        'Add text overlays with contact variables',
        'Select voice for AI personalization',
        'Choose target contacts',
        'Generate and send personalized videos',
      ],
    },
    {
      icon: SparklesIcon,
      title: 'AI Personalization',
      description: 'Leverage AI to create unique videos for each contact.',
      details: [
        'Use variables like {firstName}, {company}',
        'AI generates unique videos for each contact',
        'Personalized audio narration',
        'Custom text overlays per recipient',
      ],
    },
  ];

  const features = [
    {
      icon: CloudArrowUpIcon,
      title: 'Video Upload',
      description: 'Upload MP4 videos as templates for personalization',
    },
    {
      icon: PlayIcon,
      title: 'Preview',
      description: 'Preview generated videos before sending',
    },
    {
      icon: UserGroupIcon,
      title: 'Contact Selection',
      description: 'Target specific contacts or segments',
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics',
      description: 'Track video views and engagement',
    },
  ];

  const tips = [
    {
      icon: LightBulbIcon,
      title: 'Keep Videos Short',
      description: '30-60 second videos get the best engagement',
    },
    {
      icon: LightBulbIcon,
      title: 'Test First',
      description: 'Send test videos to yourself before bulk campaigns',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Clear CTAs',
      description: 'Include clear call-to-actions in your videos',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4">
      <div className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 p-8 relative rounded-t-3xl">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-4xl font-bold text-white mb-3">Video Campaigns Guide</h2>
              <p className="text-lg text-white/90">Create and manage AI-powered personalized video campaigns</p>
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
                Follow these steps to create personalized video campaigns that engage and convert.
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
                Explore powerful video campaign features to personalize at scale.
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
                Master these best practices to maximize your video campaign effectiveness.
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
