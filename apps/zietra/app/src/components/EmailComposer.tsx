import { useState } from 'react';
import { XMarkIcon, EnvelopeIcon, SparklesIcon, PaperClipIcon } from '@heroicons/react/24/outline';

interface EmailComposerProps {
  recipientEmail: string;
  recipientName?: string;
  contactId?: string;
  onClose: () => void;
  onSend?: (emailData: any) => void;
}

const EMAIL_TEMPLATES = [
  { id: 'custom', name: 'Custom', subject: '', body: '' },
  {
    id: 'sales-outreach',
    name: 'Sales Outreach',
    subject: 'Exploring Partnership Opportunities',
    body: `Hi {{firstName}},

I hope this email finds you well. I came across {{companyName}} and was impressed by your work in {{industry}}.

I'd love to discuss how we can help you achieve your business goals.

Would you be open to a brief conversation this week?

Best regards,`
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    subject: 'Following Up on Our Conversation',
    body: `Hi {{firstName}},

I wanted to follow up on our recent conversation about {{topic}}.

I believe we can provide significant value to {{companyName}} by addressing {{painPoint}}.

Are you available for a quick call this week to discuss next steps?

Looking forward to hearing from you,`
  },
  {
    id: 'pain-point',
    name: 'Pain Point Solution',
    subject: 'Solution for {{painPoint}}',
    body: `Hi {{firstName}},

I noticed that {{companyName}} might be facing challenges with {{painPoint}}.

We've helped companies similar to yours increase efficiency by {{benefit}}.

I'd love to share a quick case study and explore how we can help.

Would you be interested in learning more?

Best,`
  },
];

export function EmailComposer({ recipientEmail, recipientName, contactId, onClose, onSend }: EmailComposerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleGenerateAI = async () => {
    // Simulate AI generation
    const aiSubject = `Partnership Opportunity with ${recipientName || 'your team'}`;
    const aiBody = `Hi ${recipientName || 'there'},

I hope this email finds you well. I've been following your work and I'm impressed by what you're building.

I believe there's a great opportunity for us to collaborate and create mutual value.

Would you be open to a brief conversation to explore this further?

Looking forward to connecting,`;

    setSubject(aiSubject);
    setBody(aiBody);
  };

  const handleSend = async () => {
    setSending(true);

    try {
      const emailData = {
        subject,
        htmlBody: `<p>${body.replace(/\n/g, '</p><p>')}</p>`,
        textBody: body,
        toEmails: [recipientEmail],
        ccEmails: ccEmails ? ccEmails.split(',').map(e => e.trim()) : [],
        bccEmails: bccEmails ? bccEmails.split(',').map(e => e.trim()) : [],
        contactId,
      };

      if (onSend) {
        await onSend(emailData);
      }

      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#161625] rounded-2xl shadow-2xl border-4 border-[#33335a] max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#161625]/20 rounded-xl flex items-center justify-center">
                <EnvelopeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Compose Email</h2>
                <p className="text-indigo-200 text-sm mt-1">Send a professional email</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-[#161625]/20 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">To</label>
            <div className="flex items-center gap-2">
              <input
                value={recipientEmail}
                disabled
                className="flex-1 px-4 py-3 bg-[#12121f] border-2 border-[#33335a] rounded-xl text-[#F1F5F9] font-medium"
              />
              {recipientName && (
                <span className="px-4 py-3 bg-orange-500/15 text-orange-400 font-semibold rounded-xl border-2 border-orange-200">
                  {recipientName}
                </span>
              )}
            </div>
          </div>

          {/* CC/BCC Toggle */}
          <div className="flex gap-3">
            {!showCc && (
              <button
                onClick={() => setShowCc(true)}
                className="text-sm text-indigo-400 hover:text-orange-400 font-semibold"
              >
                + Add CC
              </button>
            )}
            {!showBcc && (
              <button
                onClick={() => setShowBcc(true)}
                className="text-sm text-indigo-400 hover:text-orange-400 font-semibold"
              >
                + Add BCC
              </button>
            )}
          </div>

          {/* CC Field */}
          {showCc && (
            <div>
              <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">CC</label>
              <input
                value={ccEmails}
                onChange={(e) => setCcEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-4 py-3 bg-[#12121f] border-2 border-[#33335a] rounded-xl text-[#F1F5F9] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div>
              <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">BCC</label>
              <input
                value={bccEmails}
                onChange={(e) => setBccEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-4 py-3 bg-[#12121f] border-2 border-[#33335a] rounded-xl text-[#F1F5F9] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Email Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-3 bg-[#12121f] border-2 border-[#33335a] rounded-xl text-[#F1F5F9] font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            >
              {EMAIL_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-3 bg-[#12121f] border-2 border-[#33335a] rounded-xl text-[#F1F5F9] placeholder-[#64748B] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your message..."
              className="w-full px-4 py-3 bg-[#12121f] border-2 border-[#33335a] rounded-xl text-[#F1F5F9] placeholder-[#64748B] focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-[#2a2a44] px-8 py-6 bg-[#12121f]">
          <div className="flex justify-between items-center">
            {/* AI Generate Button */}
            <button
              onClick={handleGenerateAI}
              className="flex items-center gap-2 px-5 py-3 text-purple-400 bg-rose-500/15 border-2 border-rose-300 rounded-xl hover:bg-orange-200 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
            >
              <SparklesIcon className="w-5 h-5" />
              Generate with AI
            </button>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={sending}
                className="px-6 py-3 bg-[#161625] text-[#CBD5E1] text-sm font-semibold border-2 border-[#33335a] rounded-xl hover:bg-[#12121f] hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !subject || !body}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="w-5 h-5" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
