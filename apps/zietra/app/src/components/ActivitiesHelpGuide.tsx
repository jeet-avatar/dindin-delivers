import { useState } from 'react';
import {

  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  BellAlertIcon,
  ClockIcon,
  UserGroupIcon,
  PaperClipIcon,
  LightBulbIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface HelpGuideProps {
  onClose: () => void;
}

export function ActivitiesHelpGuide({ onClose }: HelpGuideProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  const quickStartSteps = [
    {
      title: 'Log Your First Activity',
      icon: PlusIcon,
      description: 'Click "Log Activity" to record emails, calls, meetings, notes, or tasks.',
      details: [
        'Choose activity type: Email, Call, Meeting, Note, or Task',
        'Link to contact or deal (recommended)',
        'Add subject and description',
        'For emails: Track sent/received, add attachments',
        'For calls: Record duration, outcome, next steps',
        'For meetings: Set date, time, and meeting link',
        'For tasks: Set due date and priority',
        'Click "Save" to log activity',
      ],
      buttonLabel: 'Log Activity',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Send Emails from CRM',
      icon: EnvelopeIcon,
      description: 'Send tracked emails directly from the CRM with templates and scheduling.',
      details: [
        'Click "Log Activity" → Select "Email"',
        'Choose email template or write custom',
        'Add recipient (To, CC, BCC)',
        'Personalize with contact variables',
        'Add attachments if needed',
        'Preview before sending',
        'Email is logged automatically',
        'Track opens and clicks (if enabled)',
      ],
      buttonLabel: 'Send Email',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      title: 'Log and Track Calls',
      icon: PhoneIcon,
      description: 'Record call details, outcomes, and follow-ups for every customer conversation.',
      details: [
        'Click "Log Activity" → Select "Call"',
        'Enter phone number (auto-filled from contact)',
        'Set call direction (Inbound/Outbound)',
        'Record call duration',
        'Note call outcome (Connected, Voicemail, No Answer)',
        'Add detailed notes and action items',
        'Set follow-up tasks if needed',
        'All calls appear in contact timeline',
      ],
      buttonLabel: 'Log Call',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      title: 'Schedule and Track Meetings',
      icon: CalendarIcon,
      description: 'Create meetings with calendar integration and automatic reminders.',
      details: [
        'Click "Log Activity" → Select "Meeting"',
        'Set meeting title and description',
        'Choose date and time',
        'Add meeting link (Zoom, Teams, Google Meet)',
        'Link to contact and deal',
        'Set reminder notifications',
        'Meeting syncs to calendar',
        'Log meeting notes after completion',
      ],
      buttonLabel: 'Schedule Meeting',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      title: 'Filter and Search Activities',
      icon: FunnelIcon,
      description: 'Quickly find specific activities by type, date, contact, or deal.',
      details: [
        'Use filter buttons: All, Email, Call, Meeting, Note, Task',
        'Search by contact name or deal title',
        'Filter by date range',
        'Filter by activity status (completed/pending)',
        'Sort by newest or oldest first',
        'View activity timeline by contact',
        'Export filtered activities to CSV',
      ],
      buttonLabel: 'Apply Filters',
      gradient: 'from-orange-500 to-amber-500',
    },
  ];

  const features = [
    {
      icon: EnvelopeIcon,
      title: 'Email Tracking',
      description: 'Send tracked emails with templates, personalization, and delivery tracking. See opens, clicks, and replies.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: PhoneIcon,
      title: 'Call Logging',
      description: 'Record call details, duration, outcomes, and notes. Integrate with phone systems for automatic logging.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: CalendarIcon,
      title: 'Meeting Management',
      description: 'Schedule meetings with calendar sync, video conferencing links, and automatic reminders for attendees.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: 'Task Management',
      description: 'Create tasks with due dates, priorities, and assignments. Track completion and get reminders.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: DocumentTextIcon,
      title: 'Notes & Documentation',
      description: 'Add rich text notes with formatting, attachments, and tags. Keep detailed records of interactions.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: ClockIcon,
      title: 'Activity Timeline',
      description: 'View chronological activity history per contact, deal, or company. See complete relationship context.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: BellAlertIcon,
      title: 'Smart Reminders',
      description: 'Get notifications for upcoming meetings, overdue tasks, and follow-ups. Never miss an important action.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: SparklesIcon,
      title: 'Email Templates',
      description: 'Use pre-built templates with variable substitution for consistent, personalized communication at scale.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: PaperClipIcon,
      title: 'File Attachments',
      description: 'Attach documents, images, and files to emails, notes, and activities for complete context.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: UserGroupIcon,
      title: 'Team Collaboration',
      description: 'Share activities with team members, assign tasks, and collaborate on customer interactions.',
      gradient: 'from-orange-600 to-pink-600',
    },
  ];

  const proTips = [
    {
      icon: LightBulbIcon,
      title: 'Always Link Activities to Contacts',
      description: 'Every activity should be linked to a contact or deal. This creates a complete relationship timeline and ensures no interaction is lost.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Log Activities Immediately',
      description: 'Record calls, meetings, and conversations right after they happen. Details are fresh, accuracy is higher, and follow-ups are faster.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Email Templates for Common Scenarios',
      description: 'Create templates for frequent emails (introductions, follow-ups, proposals). Saves time while maintaining quality and consistency.',
      gradient: 'from-rose-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Set Follow-Up Tasks During Calls',
      description: 'While logging a call, immediately create follow-up tasks. Set due dates and reminders so nothing falls through the cracks.',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: LightBulbIcon,
      title: 'Add Detailed Notes',
      description: 'Include specific details in notes: customer pain points, objections, next steps, budget discussed. Future you (or team) will thank you.',
      gradient: 'from-orange-600 to-pink-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Review Activity History Before Outreach',
      description: 'Always check contact\'s activity timeline before calling or emailing. Context from past interactions makes conversations more meaningful.',
      gradient: 'from-indigo-600 to-purple-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Track Meeting Outcomes',
      description: 'After every meeting, log what was discussed, decisions made, and next actions. Update deal stage if needed. Keeps pipeline accurate.',
      gradient: 'from-amber-600 to-orange-600',
    },
    {
      icon: LightBulbIcon,
      title: 'Use Activity Filters for Reporting',
      description: 'Filter activities by type and date to analyze team performance. Track call volume, email response rates, meeting-to-deal conversion.',
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
              <h2 className="text-4xl font-bold text-white mb-3">Activities Guide</h2>
              <p className="text-lg text-white/90">Track every customer interaction in one place</p>
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
                Learn how to log and track all customer interactions in your CRM.
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
                Explore powerful activity tracking features to never miss a customer interaction.
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
                Master these best practices to maximize your activity tracking effectiveness.
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
