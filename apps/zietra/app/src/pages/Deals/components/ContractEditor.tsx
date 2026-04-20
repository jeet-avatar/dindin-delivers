import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { contractsApi } from '../../../services/api';

interface ContractEditorProps {
  dealId: string;
  deal: {
    title: string;
    value: number;
    contact?: { name?: string; full_name?: string; firstName?: string; lastName?: string };
    company?: { name?: string };
  };
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_TEMPLATE = `This Agreement is entered into on {{date}} between {{company_name}} ("Client") and [Your Company Name] ("Service Provider").

Deal: {{deal_name}}
Value: {{deal_value}}
Contact: {{contact_name}}

Terms and Conditions:
[Enter your contract terms here]

Signatures:
Client: ___________________   Date: ___________
Service Provider: ___________   Date: ___________`;

export function ContractEditor({ dealId, deal, onClose, onSaved }: ContractEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive contact name from whatever shape the deal.contact has
  const contactName =
    deal.contact?.name ??
    deal.contact?.full_name ??
    (deal.contact?.firstName && deal.contact?.lastName
      ? `${deal.contact.firstName} ${deal.contact.lastName}`
      : '');

  const VARIABLES: Record<string, string> = {
    '{{deal_name}}': deal.title ?? '',
    '{{deal_value}}': deal.value ? `$${Number(deal.value).toFixed(2)}` : '',
    '{{contact_name}}': contactName,
    '{{company_name}}': deal.company?.name ?? '',
    '{{date}}': new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };

  const resolveVariables = (template: string): string =>
    template.replace(/\{\{[\w_]+\}\}/g, (match) => VARIABLES[match] ?? match);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await contractsApi.create({
        dealId,
        title,
        content: resolveVariables(content), // Store resolved content
        variables: VARIABLES,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161625] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a44]">
          <h2 className="text-xl font-bold text-[#F1F5F9]">New Contract</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#1c1c30] text-[#94A3B8] transition-colors"
            title="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="contract-title" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Contract Title *
            </label>
            <input
              id="contract-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Service Agreement — Q2 2026"
            />
          </div>

          {/* Variable chips */}
          <div>
            <p className="text-xs text-[#94A3B8] mb-2 font-medium uppercase tracking-wide">
              Click to insert variable
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(VARIABLES).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setContent((prev) => prev + v)}
                  className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-500/15 transition-colors font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Edit / Preview toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !preview
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1c1c30] text-[#94A3B8] hover:bg-[#252540]'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preview
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#1c1c30] text-[#94A3B8] hover:bg-[#252540]'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Content area — edit or preview */}
          {preview ? (
            <div className="card p-4 whitespace-pre-wrap text-sm text-[#E2E8F0] min-h-[280px]">
              {resolveVariables(content)}
            </div>
          ) : (
            <textarea
              className="input-field font-mono text-sm"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter contract content..."
            />
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2a2a44]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[#33335a] rounded-lg hover:bg-[#12121f] transition-colors font-medium text-[#CBD5E1]"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
