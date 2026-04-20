import { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';
import { CreateTemplateModal } from './CreateTemplateModal';
import { SendEmailModal } from './SendEmailModal';
import { EmailTemplatesHelpGuide } from '../../components/EmailTemplatesHelpGuide';
import { PreviewTemplateModal } from './PreviewTemplateModal';
import { EditTemplateModal } from './EditTemplateModal';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EmailTemplatesPage() {
  const { gradients } = useTheme();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<EmailTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/email-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/email-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      await fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template');
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowEditModal(true);
  };

  const handleSaveEditedTemplate = async (templateData: any) => {
    if (!editingTemplate) return;

    try {
      const token = localStorage.getItem('crmToken');

      console.log('📤 Sending template update request:', {
        templateId: editingTemplate.id,
        templateName: templateData.name,
        htmlContentLength: templateData.htmlContent?.length,
      });

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/email-templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Server rejected template update:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || 'Failed to update template');
      }

      const responseData = await response.json();
      console.log('📥 Server response:', {
        message: responseData.message,
        templateId: responseData.template?.id,
        templateName: responseData.template?.name,
        updatedAt: responseData.template?.updatedAt,
      });

      // Verify the response contains the updated template
      if (!responseData.template) {
        console.error('❌ Server did not return updated template');
        throw new Error('Server did not return updated template');
      }

      // Verify the template ID matches
      if (responseData.template.id !== editingTemplate.id) {
        console.error('❌ Template ID mismatch:', {
          expected: editingTemplate.id,
          received: responseData.template.id,
        });
        throw new Error('Template ID mismatch in server response');
      }

      console.log('✅ Template update verified successfully');

      // Re-fetch all templates to confirm the update persisted
      await fetchTemplates();

      setShowEditModal(false);
      setEditingTemplate(null);
    } catch (err: any) {
      console.error('❌ Error updating template:', err);
      throw err;
    }
  };

  const handleSendEmail = (template: EmailTemplate) => {
    setSendingTemplate(template);
  };

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/email-templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          isActive: template.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }

      await fetchTemplates();
    } catch (err: any) {
      console.error('Error duplicating template:', err);
      alert('Failed to duplicate template');
    }
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  const handleModalSuccess = () => {
    fetchTemplates();
    handleModalClose();
  };

  const handleSendModalClose = () => {
    setSendingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded-xl w-1/4" style={{ background: 'var(--glass-bg)' }}></div>
          <div className="h-64 rounded-xl" style={{ background: 'var(--glass-bg)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Email Templates</h1>
        <p className="text-[var(--text-muted)] mb-3">
          Create and manage reusable email templates for your campaigns
        </p>
        <div className="bg-[var(--glass-bg)] border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-[var(--text-secondary)] font-medium">
                <span className="font-bold">Use template variables</span> like {`{{firstName}}`}, {`{{companyName}}`}, {`{{email}}`} to personalize your emails. Variables will be automatically replaced when sending.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Create */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: '#161625', color: '#F1F5F9' }}
            className="w-full pl-10 pr-4 py-3 border border-[var(--border-default)] rounded-xl placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            style={{ background: 'transparent', border: '2px solid #6366F1', color: '#818CF8' }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold tracking-wide shadow-md hover:shadow-lg hover:scale-105 transition-all"
            title="View Email Templates Guide"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
            Help & Guide
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
          >
            <PlusIcon className="h-5 w-5" />
            Create Template
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-[var(--color-error-100)] border-l-4 border-red-500 p-4 rounded-r-xl">
          <p className="text-sm text-[var(--color-error-500)] font-medium">{error}</p>
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-[var(--bg-elevated)] rounded-xl shadow-md border border-[var(--border-default)]">
          <div className="p-12 text-center">
            <EnvelopeIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No templates found</h3>
            <p className="text-[var(--text-muted)] mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first email template to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
              >
                <PlusIcon className="h-5 w-5" />
                Create Template
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-[var(--bg-elevated)] rounded-xl shadow-md border border-[var(--border-default)] hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${gradients.brand.primary.gradient}`}
                    >
                      <EnvelopeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">{template.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {template.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-white bg-green-500 shadow-sm">
                            <CheckCircleIcon className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold text-[var(--text-muted)] bg-[var(--glass-bg)] border border-[var(--border-default)] shadow-sm">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Subject:</p>
                  <p className="text-sm font-medium text-[var(--text-secondary)] line-clamp-2">{template.subject}</p>
                </div>

                {/* Variables */}
                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.slice(0, 3).map((variable, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-500/15"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                      {template.variables.length > 3 && (
                        <span className="inline-block px-2 py-1 rounded-lg text-xs font-bold text-[var(--text-muted)] bg-[var(--color-gray-100)]">
                          +{template.variables.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t-2 border-[var(--border-subtle)] pt-4 flex gap-2">
                  <button
                    onClick={() => setPreviewingTemplate(template)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--glass-bg)] border-2 border-indigo-500 text-indigo-400 rounded-xl font-bold tracking-wide shadow-md hover:bg-[var(--glass-hover)] hover:shadow-lg hover:scale-105 transition-all text-sm"
                    title="Preview template"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleSendEmail(template)}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm`}
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Send
                  </button>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2.5 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--glass-hover)] rounded-xl transition-all"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="p-2.5 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--glass-hover)] rounded-xl transition-all"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--color-error-100)] rounded-xl transition-all"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTemplateModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          editingTemplate={editingTemplate}
        />
      )}

      {sendingTemplate && (
        <SendEmailModal
          isOpen={!!sendingTemplate}
          onClose={handleSendModalClose}
          template={sendingTemplate}
        />
      )}

      {/* Edit Modal */}
      {editingTemplate && showEditModal && (
        <EditTemplateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveEditedTemplate}
          template={editingTemplate}
        />
      )}

      {/* Preview Modal */}
      {previewingTemplate && (
        <PreviewTemplateModal
          isOpen={!!previewingTemplate}
          onClose={() => setPreviewingTemplate(null)}
          template={previewingTemplate}
        />
      )}

      {/* Help Guide */}
      {showGuide && (
        <EmailTemplatesHelpGuide
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}
