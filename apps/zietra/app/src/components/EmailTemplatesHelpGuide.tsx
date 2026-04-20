import React, { useState } from 'react';
import {
  XMarkIcon,
  EnvelopeIcon,
  SparklesIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  CodeBracketIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface EmailTemplatesHelpGuideProps {
  onClose: () => void;
}

export function EmailTemplatesHelpGuide({ onClose }: EmailTemplatesHelpGuideProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', name: 'Overview', icon: EnvelopeIcon },
    { id: 'creating', name: 'Creating Templates', icon: DocumentTextIcon },
    { id: 'personalization', name: 'Personalization', icon: SparklesIcon },
    { id: 'variables', name: 'Template Variables', icon: CodeBracketIcon },
    { id: 'sending', name: 'Sending Emails', icon: PaperAirplaneIcon },
    { id: 'testing', name: 'Testing Templates', icon: CheckCircleIcon },
    { id: 'bestpractices', name: 'Best Practices', icon: UserGroupIcon },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161625] rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b-2 border-[#1c1c30] bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <EnvelopeIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Email Templates Help
                </h2>
                <p className="text-[#94A3B8] mt-1">
                  Master email templates for powerful campaigns
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1c1c30] rounded-xl transition-all"
              aria-label="Close help guide"
            >
              <XMarkIcon className="w-6 h-6 text-[#94A3B8]" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r-2 border-[#1c1c30] bg-[#12121f] p-4 overflow-y-auto">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-[#CBD5E1] hover:bg-[#161625] hover:shadow-md'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{section.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <EnvelopeIcon className="w-8 h-8 text-purple-600" />
                  Email Templates Overview
                </h3>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                  <p className="text-[#CBD5E1] leading-relaxed text-lg">
                    Email templates help you create professional, consistent emails quickly.
                    Save time by creating reusable templates with dynamic personalization.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30] hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-500/15 rounded-xl">
                        <SparklesIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Dynamic Personalization</h4>
                        <p className="text-[#94A3B8] text-sm">
                          Insert contact names, company details, and custom fields automatically
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30] hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-pink-100 rounded-xl">
                        <DocumentTextIcon className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Reusable Templates</h4>
                        <p className="text-[#94A3B8] text-sm">
                          Create once, use many times for consistent messaging
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30] hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/15 rounded-xl">
                        <PaperAirplaneIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Campaign Ready</h4>
                        <p className="text-[#94A3B8] text-sm">
                          Use templates in bulk campaigns to reach multiple contacts
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30] hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-500/15 rounded-xl">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Test Before Sending</h4>
                        <p className="text-[#94A3B8] text-sm">
                          Preview and send test emails to ensure perfect delivery
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'creating' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-purple-600" />
                  Creating Email Templates
                </h3>

                <div className="space-y-4">
                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Click "Create Template"</h4>
                        <p className="text-[#94A3B8]">
                          Click the "+ Create Template" button in the top right corner to start creating a new email template.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Enter Template Details</h4>
                        <ul className="space-y-2 text-[#94A3B8] mt-2">
                          <li className="flex items-start gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Name:</strong> Give your template a descriptive name (e.g., "Welcome Email", "Follow-up")</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Subject:</strong> Write an engaging subject line (supports variables)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Category:</strong> Organize templates by category (Optional)</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Write Your Email Body</h4>
                        <p className="text-[#94A3B8] mb-3">
                          Compose your email content in the body field. Use template variables for personalization.
                        </p>
                        <div className="bg-[#12121f] p-4 rounded-xl border border-[#2a2a44] font-mono text-sm">
                          <p className="text-[#E2E8F0]">Hi {'{{firstName}}'}, </p>
                          <p className="text-[#E2E8F0] mt-2">Thank you for your interest in {'{{companyName}}'}...</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#F1F5F9] mb-2">Save Your Template</h4>
                        <p className="text-[#94A3B8]">
                          Click "Create Template" to save. Your template will be ready to use in campaigns or individual emails.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'personalization' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <SparklesIcon className="w-8 h-8 text-purple-600" />
                  Email Personalization
                </h3>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-100">
                  <p className="text-[#CBD5E1] leading-relaxed">
                    Personalization increases open rates by up to 26% and improves engagement.
                    Use template variables to automatically insert contact-specific information.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                      <CodeBracketIcon className="w-5 h-5 text-purple-600" />
                      Why Personalization Matters
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-[#F1F5F9]">Higher Open Rates</p>
                          <p className="text-sm text-[#94A3B8]">Personalized subject lines increase opens</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-[#F1F5F9]">Better Engagement</p>
                          <p className="text-sm text-[#94A3B8]">Recipients feel valued and connected</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-[#F1F5F9]">More Conversions</p>
                          <p className="text-sm text-[#94A3B8]">Relevant content drives action</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-[#F1F5F9]">Professional Touch</p>
                          <p className="text-sm text-[#94A3B8]">Shows attention to detail</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4">Example: Before & After</h4>

                    <div className="space-y-4">
                      <div className="bg-red-500/10 p-4 rounded-xl border-2 border-red-200">
                        <p className="text-sm font-semibold text-red-400 mb-2">❌ Without Personalization</p>
                        <div className="bg-[#161625] p-3 rounded-lg text-sm text-[#CBD5E1]">
                          <p className="font-semibold mb-1">Subject: Check out our new product</p>
                          <p>Dear Customer,</p>
                          <p className="mt-2">We have a new product that might interest you...</p>
                        </div>
                      </div>

                      <div className="bg-green-500/10 p-4 rounded-xl border-2 border-green-200">
                        <p className="text-sm font-semibold text-green-400 mb-2">✅ With Personalization</p>
                        <div className="bg-[#161625] p-3 rounded-lg text-sm text-[#CBD5E1]">
                          <p className="font-semibold mb-1">Subject: John, check out this solution for TechCorp</p>
                          <p>Hi John,</p>
                          <p className="mt-2">I noticed TechCorp is in the software industry. We have a solution specifically designed for companies like yours...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'variables' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <CodeBracketIcon className="w-8 h-8 text-purple-600" />
                  Template Variables
                </h3>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border-2 border-blue-100">
                  <p className="text-[#CBD5E1] leading-relaxed">
                    Variables are placeholders that automatically fill in with contact or company information.
                    Use the format <code className="bg-[#161625] px-2 py-1 rounded font-mono text-sm">{'{{variableName}}'}</code>
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5 text-blue-600" />
                      Contact Variables
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{firstName}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Contact's first name</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{lastName}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Contact's last name</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{email}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Contact's email address</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{phone}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Contact's phone number</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{role}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Contact's job title</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                      <EnvelopeIcon className="w-5 h-5 text-pink-600" />
                      Company Variables
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{companyName}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Company name</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{industry}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Company industry</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{website}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Company website</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{location}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Company location</span>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-[#12121f] rounded-lg">
                        <code className="text-sm font-mono text-purple-600 bg-[#161625] px-2 py-1 rounded">{'{{size}}'}</code>
                        <span className="text-sm text-[#94A3B8]">Company size</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                  <h4 className="font-bold text-[#F1F5F9] mb-4">Full Template Example</h4>
                  <div className="bg-[#12121f] p-4 rounded-xl border border-[#2a2a44] font-mono text-sm space-y-2">
                    <p className="text-[#94A3B8]">Subject: {'{{firstName}}'}, let's discuss {'{{companyName}}'}'s growth</p>
                    <p className="text-[#94A3B8] mt-4">---</p>
                    <p className="text-[#E2E8F0] mt-2">Hi {'{{firstName}}'},</p>
                    <p className="text-[#E2E8F0] mt-2">I hope this email finds you well at {'{{companyName}}'}.</p>
                    <p className="text-[#E2E8F0] mt-2">I noticed that {'{{companyName}}'} is in the {'{{industry}}'} industry, and I have some ideas that could help with your growth strategy.</p>
                    <p className="text-[#E2E8F0] mt-2">As {'{{role}}'}, you might be interested in our solutions specifically designed for companies in {'{{location}}'}.</p>
                    <p className="text-[#E2E8F0] mt-2">Would you be available for a quick call this week?</p>
                    <p className="text-[#E2E8F0] mt-4">Best regards,<br/>Your Name</p>
                  </div>
                  <div className="mt-4 p-4 bg-green-500/10 rounded-xl border border-green-200">
                    <p className="text-sm font-semibold text-green-400 mb-2">✅ Result (with real data):</p>
                    <p className="text-[#E2E8F0] text-sm">Hi John, I hope this email finds you well at TechCorp. I noticed that TechCorp is in the Software industry...</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'sending' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <PaperAirplaneIcon className="w-8 h-8 text-purple-600" />
                  Sending Emails
                </h3>

                <div className="space-y-4">
                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4">Method 1: Send to Individual Contact</h4>
                    <ol className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        <span className="text-[#CBD5E1]">Click "Send Email" button on any template</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        <span className="text-[#CBD5E1]">Select a contact from the dropdown</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        <span className="text-[#CBD5E1]">Review the personalized email preview</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                        <span className="text-[#CBD5E1]">Click "Send Email" to deliver</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4">Method 2: Use in Campaigns</h4>
                    <ol className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        <span className="text-[#CBD5E1]">Go to Campaigns page</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        <span className="text-[#CBD5E1]">Create a new campaign</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        <span className="text-[#CBD5E1]">Select your email template</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                        <span className="text-[#CBD5E1]">Choose recipients (companies/contacts)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                        <span className="text-[#CBD5E1]">Send to all at once or schedule</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'testing' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <CheckCircleIcon className="w-8 h-8 text-purple-600" />
                  Testing Templates
                </h3>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border-2 border-yellow-200">
                  <p className="text-[#CBD5E1] leading-relaxed font-semibold">
                    ⚠️ Always test your templates before sending to contacts!
                  </p>
                  <p className="text-[#94A3B8] mt-2">
                    Testing helps you catch typos, check formatting, and ensure variables are working correctly.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4">How to Send Test Emails</h4>
                    <ol className="space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        <div>
                          <p className="text-[#CBD5E1] font-medium">Click "Send Test" Button</p>
                          <p className="text-sm text-[#94A3B8] mt-1">Find this button on your template</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        <div>
                          <p className="text-[#CBD5E1] font-medium">Enter Test Email Address</p>
                          <p className="text-sm text-[#94A3B8] mt-1">Use your own email to receive the test</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                        <div>
                          <p className="text-[#CBD5E1] font-medium">Select a Test Contact</p>
                          <p className="text-sm text-[#94A3B8] mt-1">Choose a contact to pull data from for variables</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                        <div>
                          <p className="text-[#CBD5E1] font-medium">Review and Send</p>
                          <p className="text-sm text-[#94A3B8] mt-1">Check the preview and click "Send Test Email"</p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                    <h4 className="font-bold text-[#F1F5F9] mb-4">Testing Checklist</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[#CBD5E1]">All variables are replaced with actual data</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[#CBD5E1]">No typos or grammatical errors</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[#CBD5E1]">Subject line is compelling</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[#CBD5E1]">Formatting looks correct (line breaks, spacing)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[#CBD5E1]">Links work correctly (if any)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[#CBD5E1]">Email displays well on mobile devices</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'bestpractices' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] flex items-center gap-3">
                  <UserGroupIcon className="w-8 h-8 text-purple-600" />
                  Best Practices
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
                    <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                      ✅ DO These Things
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-900">Keep subject lines under 50 characters</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-900">Personalize with first name at minimum</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-900">Test emails before sending campaigns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-900">Use clear call-to-action</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-900">Keep emails concise and focused</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-green-900">Proofread carefully</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl border-2 border-red-200">
                    <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                      ❌ DON'T Do These Things
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-red-900">Use ALL CAPS or excessive punctuation!!!</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-red-900">Send generic "Dear Sir/Madam" emails</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-red-900">Write super long emails (keep under 200 words)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-red-900">Forget to include unsubscribe option</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-red-900">Send without testing first</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span className="text-red-900">Use spammy words like "FREE" or "BUY NOW"</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-[#161625] p-6 rounded-2xl border-2 border-[#1c1c30]">
                  <h4 className="font-bold text-[#F1F5F9] mb-4">Pro Tips for High Performance</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-500/15 rounded-xl flex-shrink-0">
                        <ClockIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#F1F5F9]">Send at Optimal Times</p>
                        <p className="text-sm text-[#94A3B8]">Tuesday-Thursday, 10am-11am or 2pm-3pm typically perform best</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-pink-100 rounded-xl flex-shrink-0">
                        <SparklesIcon className="w-6 h-6 text-pink-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#F1F5F9]">A/B Test Subject Lines</p>
                        <p className="text-sm text-[#94A3B8]">Test different subject lines to see what resonates with your audience</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/15 rounded-xl flex-shrink-0">
                        <UserGroupIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#F1F5F9]">Segment Your Audience</p>
                        <p className="text-sm text-[#94A3B8]">Create different templates for different industries or roles</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-500/15 rounded-xl flex-shrink-0">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#F1F5F9]">Track and Optimize</p>
                        <p className="text-sm text-[#94A3B8]">Monitor open rates and adjust your approach based on results</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t-2 border-[#1c1c30] bg-[#12121f]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#94A3B8]">
              Need more help? Contact support or check our documentation.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/30"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
