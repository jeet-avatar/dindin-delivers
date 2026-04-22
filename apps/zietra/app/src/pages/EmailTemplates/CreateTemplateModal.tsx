import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTemplate?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: string[];
    isActive: boolean;
  } | null;
}

export function CreateTemplateModal({ isOpen, onClose, onSuccess, editingTemplate }: CreateTemplateModalProps) {
  const { gradients } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true,
  });
  const [aiPrompt, setAiPrompt] = useState({
    description: '',
    tone: 'professional',
    purpose: '',
  });

  // Variable suggestions
  const commonVariables = [
    'firstName',
    'lastName',
    'email',
    'companyName',
    'position',
    'phone',
  ];

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        htmlContent: editingTemplate.htmlContent,
        textContent: editingTemplate.textContent || '',
        isActive: editingTemplate.isActive,
      });
    } else {
      setFormData({
        name: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        isActive: true,
      });
    }
    setError(null);
  }, [editingTemplate, isOpen]);

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    const variables = new Set<string>();
    for (const match of matches) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  const insertVariable = (variable: string) => {
    const variableText = `{{${variable}}}`;
    setFormData({
      ...formData,
      htmlContent: formData.htmlContent + variableText,
    });
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.description.trim()) {
      setError('Please describe what kind of email template you want');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates/generate-ai`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: aiPrompt.description,
            tone: aiPrompt.tone,
            purpose: aiPrompt.purpose,
            includeVariables: commonVariables,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate template');
      }

      // Fill form with AI-generated template
      setFormData({
        name: data.template.name,
        subject: data.template.subject,
        htmlContent: data.template.htmlContent,
        textContent: data.template.textContent,
        isActive: true,
      });

      setShowAIDialog(false);
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 8000);
      setAiPrompt({ description: '', tone: 'professional', purpose: '' });
    } catch (err: any) {
      console.error('AI generation error:', err);
      setError(err.message || 'Failed to generate template with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!formData.subject.trim()) {
      setError('Email subject is required');
      return;
    }

    if (!formData.htmlContent.trim()) {
      setError('Email content is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('crmToken');
      const variables = extractVariables(formData.htmlContent + formData.subject);

      const url = editingTemplate
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates/${editingTemplate.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/email-templates`;

      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          variables,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const detectedVariables = extractVariables(formData.htmlContent + formData.subject);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div
        style={{ background: '#161625', border: '1px solid #2a2a44' }}
        className="rounded-2xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} p-6 text-white rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {editingTemplate ? 'Edit Template' : 'Create Email Template'}
              </h2>
              <p className="text-white text-opacity-90 text-sm mt-1">
                Design reusable email templates with personalization
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!editingTemplate && (
                <button
                  type="button"
                  onClick={() => setShowAIDialog(true)}
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-bold transition-all shadow-md"
                >
                  <SparklesIcon className="w-5 h-5" />
                  AI Design
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:bg-[#161625] hover:bg-opacity-20 p-2 rounded-lg transition-all"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 border-l-4 border-red-500 p-4 rounded-r-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <p className="text-sm font-medium" style={{ color: '#F87171' }}>{error}</p>
            </div>
          )}

          {aiSuccess && (
            <div className="mb-4 border-l-4 border-green-500 p-4 rounded-r-xl" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <p className="text-sm font-bold" style={{ color: '#4ADE80' }}>
                AI generated your template! Review the content below, edit if needed, then click "Create Template" to save.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Welcome Email, Follow-up Template"
                style={{ background: '#161625', color: '#F1F5F9' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                Email Subject *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{companyName}}, {{firstName}}!"
                style={{ background: '#161625', color: '#F1F5F9' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Use {`{{variableName}}`} to insert personalized data
              </p>
            </div>

            {/* Variable Suggestions */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                <SparklesIcon className="h-4 w-4 inline mr-1" />
                Quick Insert Variables
              </label>
              <div className="flex flex-wrap gap-2">
                {commonVariables.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="px-3 py-1.5 bg-[var(--color-primary-50)] text-[var(--accent-primary)] rounded-lg text-xs font-bold hover:opacity-80 transition-all"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* HTML Content */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                Email Content (HTML) *
              </label>
              <textarea
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                placeholder="Write your email content here. You can use HTML tags and {{variables}}."
                rows={12}
                style={{ background: '#0F0F1A', color: '#A5B4FC' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              />
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Use HTML tags for formatting: &lt;h1&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;a href=""&gt;, etc.</li>
                  <li>Insert variables using double curly braces: {`{{firstName}}`}</li>
                  <li>Preview your email before sending to ensure proper formatting</li>
                </ul>
              </div>
            </div>

            {/* Plain Text Version */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                Plain Text Version (Optional)
              </label>
              <textarea
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Plain text version for email clients that don't support HTML"
                rows={4}
                style={{ background: '#161625', color: '#F1F5F9' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Detected Variables */}
            {detectedVariables.length > 0 && (
              <div className="bg-[#1c1c30] border-l-4 border-indigo-500 p-4 rounded-r-xl">
                <p className="text-sm font-bold text-[var(--text-secondary)] mb-2">
                  Detected Variables ({detectedVariables.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectedVariables.map((variable, index) => (
                    <span
                      key={index}
                      className="inline-block px-3 py-1 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-500/15"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 text-indigo-400 bg-[var(--color-gray-100)] border-[var(--border-default)] rounded focus:ring-indigo-500 focus:ring-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-[var(--text-secondary)]">
                Template is active and ready to use
              </label>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#1c1c30] text-[var(--text-secondary)] border-2 border-[var(--border-default)] rounded-xl font-bold tracking-wide hover:bg-[#252540] hover:border-[var(--border-default)] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit as any}
                disabled={isSaving}
                className={`px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Generation Dialog — fixed overlay, outside parent scroll */}
        {showAIDialog && (
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 60 }} onClick={() => setShowAIDialog(false)}>
            <div style={{ background: '#1a1a2e', border: '1px solid #2a2a44' }} className="rounded-xl shadow-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="w-8 h-8 text-indigo-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)]">AI Template Designer</h3>
                    <p className="text-sm text-[var(--text-muted)]">Describe your email and let AI create it for you</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIDialog(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg transition-all"
                  aria-label="Close AI dialog"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Example prompts */}
                <div style={{ background: '#12121f', border: '1px solid #2a2a44', borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Try these prompts:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      'ERP consulting services for enterprise clients',
                      'Cybersecurity training discount for Q2',
                      'Welcome email for new customers with onboarding steps',
                      'Follow-up after a product demo meeting',
                      'Monthly newsletter with industry insights',
                      'Re-engagement email for inactive leads',
                    ].map((prompt, i) => (
                      <button key={i} type="button"
                        onClick={() => setAiPrompt({ ...aiPrompt, description: prompt })}
                        style={{
                          fontSize: 11, padding: '5px 10px', borderRadius: 6,
                          background: '#1c1c30', color: '#A5B4FC',
                          border: '1px solid #33335a', cursor: 'pointer',
                        }}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    Describe your email *
                  </label>
                  <textarea
                    value={aiPrompt.description}
                    onChange={(e) => setAiPrompt({ ...aiPrompt, description: e.target.value })}
                    placeholder="Be specific: who is it for, what are you offering, what action should they take?"
                    rows={3}
                    style={{ background: '#161625', color: '#F1F5F9' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Tone */}
                <div>
                  <label htmlFor="ai-tone" className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    Tone
                  </label>
                  <select
                    id="ai-tone"
                    value={aiPrompt.tone}
                    onChange={(e) => setAiPrompt({ ...aiPrompt, tone: e.target.value })}
                    style={{ background: '#161625', color: '#F1F5F9' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="casual">Casual</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                    Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    value={aiPrompt.purpose}
                    onChange={(e) => setAiPrompt({ ...aiPrompt, purpose: e.target.value })}
                    placeholder="e.g., Welcome new customers, Follow up on demo, Announce new feature"
                    style={{ background: '#161625', color: '#F1F5F9' }}
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => setShowAIDialog(false)}
                    className="px-6 py-2.5 bg-[#1c1c30] text-[var(--text-secondary)] border-2 border-[var(--border-default)] rounded-xl font-bold hover:bg-[#252540] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || !aiPrompt.description.trim()}
                    className={`px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border border-indigo-500/30 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-5 h-5" />
                        Generate Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
