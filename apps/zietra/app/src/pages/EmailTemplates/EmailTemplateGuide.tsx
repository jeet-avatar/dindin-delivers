import { useState } from 'react';
import {
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface GuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailTemplateGuide({ isOpen, onClose }: GuideProps) {
  const [activeTab, setActiveTab] = useState<'basics' | 'variables' | 'tips' | 'ai'>('basics');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 relative">
          <div className="flex items-center gap-3 mb-3">
            <DocumentTextIcon className="w-12 h-12 text-white" />
            <h2 className="text-4xl font-bold text-white">
              Email Templates Guide
            </h2>
          </div>
          <p className="text-lg text-white/90 mb-6">
            Learn how to create powerful, personalized email templates
          </p>

          {/* Tab Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('basics')}
              className={activeTab === 'basics'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg "
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              📚 Basics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('variables')}
              className={activeTab === 'variables'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg "
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              🔤 Variables
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={activeTab === 'tips'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg "
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              💡 Tips
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={activeTab === 'ai'
                ? "bg-[#161625] text-white font-bold px-6 py-3 rounded-xl shadow-lg "
                : "bg-[#161625]/40 text-white/70 hover:bg-[#161625]/60 px-6 py-3 rounded-xl transition-all"
              }
            >
              🤖 AI Helper
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-320px)]">
          {activeTab === 'basics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                  <SparklesIcon className="w-6 h-6 text-indigo-400" />
                  Getting Started with Email Templates
                </h3>
                <p className="text-[#CBD5E1] mb-4">
                  Email templates help you save time by creating reusable email messages. Once created, you can use them anywhere in the CRM.
                </p>
              </div>

              <div className="bg-orange-500/10 border-l-4 border-indigo-500 p-4 rounded-r-xl">
                <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Step-by-Step: Create Your First Template
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-orange-900 text-sm">
                  <li><strong>Click "Create Template"</strong> button at the top</li>
                  <li><strong>Enter a template name</strong> (e.g., "Welcome Email", "Follow-up")</li>
                  <li><strong>Write your email subject</strong> (you can use variables here!)</li>
                  <li><strong>Compose your email</strong> in the content area</li>
                  <li><strong>Add variables</strong> by typing <code className="bg-orange-500/15 px-1 rounded">{"{{variableName}}"}</code></li>
                  <li><strong>Click "Create Template"</strong> to save</li>
                </ol>
              </div>

              <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-r-xl">
                <h4 className="font-bold text-green-900 mb-2">✅ What You Can Do</h4>
                <ul className="list-disc list-inside space-y-1 text-green-900 text-sm">
                  <li>Create unlimited templates</li>
                  <li>Use templates in Activities and Campaigns</li>
                  <li>Send to multiple contacts at once</li>
                  <li>Test templates before sending</li>
                  <li>Edit and duplicate existing templates</li>
                  <li>Turn templates on/off with Active status</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'variables' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                  <code className="text-indigo-400">{"{{ }}"}</code>
                  Understanding Variables
                </h3>
                <p className="text-[#CBD5E1] mb-4">
                  Variables are placeholders that automatically get replaced with real contact data when you send emails.
                </p>
              </div>

              <div className="bg-rose-500/10 border-2 border-rose-200 rounded-xl p-6">
                <h4 className="font-bold text-rose-900 mb-4 text-lg">📝 How to Use Variables</h4>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-rose-900 mb-2">✅ CORRECT Format:</p>
                    <div className="bg-[#161625] border-2 border-green-500 rounded-lg p-3 font-mono text-sm">
                      {"{{firstName}}"} ← Two curly braces on each side
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-red-900 mb-2">❌ INCORRECT Formats:</p>
                    <div className="space-y-2">
                      <div className="bg-[#161625] border-2 border-red-500 rounded-lg p-3 font-mono text-sm">
                        {"{firstName}"} ← Only one curly brace (wrong!)
                      </div>
                      <div className="bg-[#161625] border-2 border-red-500 rounded-lg p-3 font-mono text-sm">
                        {"{{ firstName }}"} ← Spaces inside braces (wrong!)
                      </div>
                      <div className="bg-[#161625] border-2 border-red-500 rounded-lg p-3 font-mono text-sm">
                        {"{{First Name}}"} ← Spaces in variable name (wrong!)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-500/10 border-l-4 border-indigo-500 p-4 rounded-r-xl">
                <h4 className="font-bold text-orange-900 mb-3">🎯 Available Variables</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#161625] rounded-lg p-3 border border-orange-200">
                    <code className="text-orange-400 font-bold">{"{{firstName}}"}</code>
                    <p className="text-xs text-[#94A3B8] mt-1">Contact's first name</p>
                  </div>
                  <div className="bg-[#161625] rounded-lg p-3 border border-orange-200">
                    <code className="text-orange-400 font-bold">{"{{lastName}}"}</code>
                    <p className="text-xs text-[#94A3B8] mt-1">Contact's last name</p>
                  </div>
                  <div className="bg-[#161625] rounded-lg p-3 border border-orange-200">
                    <code className="text-orange-400 font-bold">{"{{email}}"}</code>
                    <p className="text-xs text-[#94A3B8] mt-1">Contact's email</p>
                  </div>
                  <div className="bg-[#161625] rounded-lg p-3 border border-orange-200">
                    <code className="text-orange-400 font-bold">{"{{phone}}"}</code>
                    <p className="text-xs text-[#94A3B8] mt-1">Contact's phone</p>
                  </div>
                  <div className="bg-[#161625] rounded-lg p-3 border border-orange-200">
                    <code className="text-orange-400 font-bold">{"{{companyName}}"}</code>
                    <p className="text-xs text-[#94A3B8] mt-1">Company name</p>
                  </div>
                  <div className="bg-[#161625] rounded-lg p-3 border border-orange-200">
                    <code className="text-orange-400 font-bold">{"{{position}}"}</code>
                    <p className="text-xs text-[#94A3B8] mt-1">Job title/position</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-2 border-orange-300 rounded-xl p-6">
                <h4 className="font-bold text-orange-900 mb-3 text-lg">📧 Example Template</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-orange-400 mb-1">Subject:</p>
                    <div className="bg-[#161625] rounded-lg p-3 border-2 border-orange-200 font-mono text-sm">
                      Hi {"{{firstName}}"}, let's connect!
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-400 mb-1">Body:</p>
                    <div className="bg-[#161625] rounded-lg p-3 border-2 border-orange-200 font-mono text-sm whitespace-pre-wrap">
                      {`Dear {{firstName}} {{lastName}},

I hope this email finds you well. I wanted to reach out to you at {{companyName}} regarding...

Best regards`}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-400 mb-1">Result (when sent to John Doe at Acme Corp):</p>
                    <div className="bg-green-500/10 rounded-lg p-3 border-2 border-green-200 text-sm">
                      {`Dear John Doe,

I hope this email finds you well. I wanted to reach out to you at Acme Corp regarding...

Best regards`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                  <LightBulbIcon className="w-6 h-6 text-yellow-600" />
                  Pro Tips & Best Practices
                </h3>
              </div>

              <div className="grid gap-4">
                <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded-r-xl">
                  <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    DO: Best Practices
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-green-900 text-sm">
                    <li><strong>Use descriptive template names</strong> like "Follow-up - Day 3" instead of "Template 1"</li>
                    <li><strong>Test templates</strong> before sending to all contacts</li>
                    <li><strong>Keep subject lines short</strong> (under 50 characters for best open rates)</li>
                    <li><strong>Use HTML sparingly</strong> - keep emails simple and readable</li>
                    <li><strong>Add a plain text version</strong> for email clients that don't support HTML</li>
                    <li><strong>Review auto-detected variables</strong> before saving</li>
                    <li><strong>Use proper capitalization</strong> in variable names: <code>{"{{firstName}}"}</code> not <code>{"{{firstname}}"}</code></li>
                  </ul>
                </div>

                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-xl">
                  <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    DON'T: Common Mistakes
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-red-900 text-sm">
                    <li><strong>Don't use single braces</strong> - {"{firstName}"} won't work</li>
                    <li><strong>Don't add spaces</strong> inside braces - {"{{ firstName }}"} is incorrect</li>
                    <li><strong>Don't use invalid variable names</strong> - {"{{first name}}"} won't work (no spaces)</li>
                    <li><strong>Don't forget to test</strong> - always send a test email first</li>
                    <li><strong>Don't over-personalize</strong> - too many variables can look spammy</li>
                    <li><strong>Don't use undefined variables</strong> - {"{{randomVar}}"} will show as-is if not in contact data</li>
                    <li><strong>Don't forget capitalization</strong> - {"{{FirstName}}"} is different from {"{{firstName}}"}</li>
                  </ul>
                </div>

                <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                  <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5" />
                    Quick Tips
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-yellow-900 text-sm">
                    <li>Use the <strong>"Quick Insert Variables"</strong> buttons to avoid typos</li>
                    <li>Variables are <strong>case-sensitive</strong>: use exactly <code>{"{{firstName}}"}</code></li>
                    <li>Check the <strong>"Detected Variables"</strong> section before saving</li>
                    <li>Templates can be used in <strong>Activities</strong> and <strong>Campaigns</strong></li>
                    <li>Inactive templates won't appear in selection lists</li>
                    <li>You can duplicate templates to create variations</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-[#F1F5F9] mb-4 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-400" />
                  AI Template Assistant
                </h3>
                <p className="text-[#CBD5E1] mb-4">
                  Need help creating the perfect email template? Follow this step-by-step guide:
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-2 border-rose-300 rounded-xl p-6">
                  <h4 className="font-bold text-rose-900 mb-4 text-lg flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    Step-by-Step Template Creation
                  </h4>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-rose-900 mb-1">Define Your Purpose</h5>
                        <p className="text-sm text-rose-800 mb-2">What is this email for?</p>
                        <div className="bg-[#161625] rounded-lg p-3 border border-rose-200 text-sm">
                          Examples: Welcome new contacts, Follow up after meeting, Schedule demo, etc.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-rose-900 mb-1">Craft Your Subject Line</h5>
                        <p className="text-sm text-rose-800 mb-2">Make it personal and engaging</p>
                        <div className="bg-[#161625] rounded-lg p-3 border border-rose-200 space-y-2">
                          <div className="text-sm">
                            <span className="text-green-600 font-bold">✓ Good:</span> <code>Hi {"{{firstName}}"}, let's schedule your demo</code>
                          </div>
                          <div className="text-sm">
                            <span className="text-red-600 font-bold">✗ Bad:</span> <code>Demo Invitation</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-rose-900 mb-1">Write Your Message</h5>
                        <p className="text-sm text-rose-800 mb-2">Structure: Greeting → Body → Call-to-Action → Signature</p>
                        <div className="bg-[#161625] rounded-lg p-3 border border-rose-200 text-sm font-mono whitespace-pre-wrap">
                          {`Hi {{firstName}},

[Your message here...]

What do you think? Let's schedule a call.

Best regards,
Your Name`}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-rose-900 mb-1">Add Personalization</h5>
                        <p className="text-sm text-rose-800 mb-2">Insert variables using Quick Insert buttons</p>
                        <div className="bg-[#161625] rounded-lg p-3 border border-rose-200">
                          <p className="text-sm mb-2">Click these buttons to insert variables:</p>
                          <div className="flex flex-wrap gap-2">
                            {['firstName', 'lastName', 'companyName', 'position'].map(v => (
                              <span key={v} className="px-2 py-1 bg-orange-500/15 text-orange-400 rounded text-xs font-mono">
                                {"{{" + v + "}}"}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        5
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-rose-900 mb-1">Review & Test</h5>
                        <p className="text-sm text-rose-800 mb-2">Check detected variables and send a test</p>
                        <div className="bg-[#161625] rounded-lg p-3 border border-rose-200 text-sm">
                          ✓ Verify all variables are correct<br />
                          ✓ Send test email to yourself<br />
                          ✓ Check how it looks on mobile
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-2 border-orange-300 rounded-xl p-6">
                  <h4 className="font-bold text-orange-900 mb-3 text-lg">💬 Template Recipes</h4>
                  <div className="space-y-3">
                    <details className="bg-[#161625] rounded-lg border border-orange-200">
                      <summary className="p-3 font-bold text-orange-900 cursor-pointer hover:bg-orange-500/10">
                        🎉 Welcome Email Template
                      </summary>
                      <div className="p-3 border-t border-orange-200 font-mono text-sm whitespace-pre-wrap">
                        {`Subject: Welcome to [Your Company], {{firstName}}!

Hi {{firstName}},

Welcome aboard! We're thrilled to have you.

I'm here to help you get started. Feel free to reach out if you have any questions.

Best regards,
[Your Name]`}
                      </div>
                    </details>

                    <details className="bg-[#161625] rounded-lg border border-orange-200">
                      <summary className="p-3 font-bold text-orange-900 cursor-pointer hover:bg-orange-500/10">
                        📅 Meeting Follow-up Template
                      </summary>
                      <div className="p-3 border-t border-orange-200 font-mono text-sm whitespace-pre-wrap">
                        {`Subject: Great meeting you, {{firstName}}!

Hi {{firstName}},

Thanks for taking the time to meet today. I enjoyed learning about {{companyName}}.

As discussed, I'll send over the proposal by Friday.

Looking forward to our next steps!

Best,
[Your Name]`}
                      </div>
                    </details>

                    <details className="bg-[#161625] rounded-lg border border-orange-200">
                      <summary className="p-3 font-bold text-orange-900 cursor-pointer hover:bg-orange-500/10">
                        🔔 Follow-up Reminder Template
                      </summary>
                      <div className="p-3 border-t border-orange-200 font-mono text-sm whitespace-pre-wrap">
                        {`Subject: Following up, {{firstName}}

Hi {{firstName}},

I wanted to follow up on my previous email about [topic].

Have you had a chance to review it?

Let me know if you have any questions!

Best regards,
[Your Name]`}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#12121f] p-6">
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
