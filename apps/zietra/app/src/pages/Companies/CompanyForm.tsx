import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { companiesApi } from '../../services/api';

interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  description?: string;
}

interface CompanyFormProps {
  company?: Company | null;
  onClose: () => void;
}

const companySizes = [
  'Startup (1-10)',
  'Small (11-50)',
  'Medium (51-200)',
  'Large (201-1000)',
  'Enterprise (1000+)',
];

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Consulting',
  'Marketing',
  'Non-profit',
  'Government',
  'Other',
];

export function CompanyForm({ company, onClose }: CompanyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load form data when company changes
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        domain: company.domain || '',
        industry: company.industry || '',
        size: company.size || '',
        description: company.description || '',
      });
    } else {
      setFormData({
        name: '',
        domain: '',
        industry: '',
        size: '',
        description: '',
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        domain: formData.domain || undefined,
        industry: formData.industry || undefined,
        size: formData.size || undefined,
        description: formData.description || undefined,
      };

      if (company) {
        await companiesApi.update(company.id, submitData);
      } else {
        await companiesApi.create(submitData);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.8)" }} className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="bg-[#161625] rounded-xl shadow-2xl  max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50">
          <h2 className="text-xl font-bold text-[#F1F5F9]">
            {company ? 'Edit Company' : 'Add Company'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-[#161625]/20 rounded-full p-2 transition-colors"
            title="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Company Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input-field"
              placeholder="Enter company name"
            />
          </div>

          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Website Domain
            </label>
            <input
              type="text"
              id="domain"
              value={formData.domain}
              onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
              className="input-field"
              placeholder="example.com"
            />
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Industry
            </label>
            <select
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              className="input-field"
            >
              <option value="">Select an industry</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          {/* Company Size */}
          <div>
            <label htmlFor="size" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Company Size
            </label>
            <select
              id="size"
              value={formData.size}
              onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
              className="input-field"
            >
              <option value="">Select company size</option>
              {companySizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Brief description of the company"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-orange-200">
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
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              disabled={loading}
            >
              <span>{loading ? 'Saving...' : (company ? 'Update Company' : 'Add Company')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}