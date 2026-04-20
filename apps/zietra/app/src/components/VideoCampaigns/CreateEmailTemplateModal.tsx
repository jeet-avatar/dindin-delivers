import { useState } from 'react';
import { XMarkIcon, EnvelopeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CreateEmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    narrationScript: string;
    videoUrl?: string;
  };
  onSuccess: (templateId: string) => void;
}

export function CreateEmailTemplateModal({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}: CreateEmailTemplateModalProps) {
  const { gradients } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [templateName, setTemplateName] = useState(`Email: ${campaign.name}`);
  const [emailSubject, setEmailSubject] = useState(`Your Personalized Video from {{companyName}}`);
  const [emailBody, setEmailBody] = useState(campaign.narrationScript);
  const [ctaText, setCtaText] = useState('Learn More');
  const [ctaLink, setCtaLink] = useState('https://zietra.com');
  const [fromName, setFromName] = useState('Zietra Team');
  const [fromEmail, setFromEmail] = useState('support@zietra.com');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('crmToken');
      const response = await axios.post(
        `${API_URL}/api/video-campaigns/${campaign.id}/create-email-template`,
        {
          templateName,
          emailSubject,
          emailBody,
          ctaText,
          ctaLink,
          fromName,
          fromEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        onSuccess(response.data.emailTemplate.id);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create email template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#161625] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div
            className="sticky top-0 z-10 px-6 py-4 border-b border-[#2a2a44] flex items-center justify-between"
            style={{ background: gradients.primary }}
          >
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-6 h-6 text-white" />
              <h2 className="text-xl font-semibold text-white">
                Create Email Template from Video
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#161625]/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-200 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="My Video Email Template"
                required
              />
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                Email Subject Line
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Personalized Video from {{companyName}}"
                required
              />
              <p className="mt-1 text-xs text-[#94A3B8]">
                Use variables: {'{{firstName}}'}, {'{{companyName}}'}, {'{{fromName}}'}
              </p>
            </div>

            {/* Email Body */}
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                Email Body Text
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Write your email message here..."
                required
              />
              <p className="mt-1 text-xs text-[#94A3B8]">
                This text will appear above the video in the email
              </p>
            </div>

            {/* Video Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <SparklesIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#F1F5F9]">
                    Video will be embedded here
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Your video will appear as an embedded player in the email with playback controls
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                  Call-to-Action Button Text
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Learn More"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                  Button Link URL
                </label>
                <input
                  type="url"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            {/* Sender Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[#2a2a44]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-[#33335a] text-[#CBD5E1] rounded-lg hover:bg-[#12121f] font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: gradients.primary }}
                disabled={loading}
              >
                {loading ? 'Creating Template...' : 'Create Email Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
