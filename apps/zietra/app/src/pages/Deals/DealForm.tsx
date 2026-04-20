import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { dealsApi, contactsApi, companiesApi } from '../../services/api';

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability: number;
  expectedCloseDate?: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  company?: {
    id: string;
    name: string;
  };
  description?: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
}

interface DealFormProps {
  deal?: Deal | null;
  onClose: () => void;
}

const dealStages = [
  { value: 'PROSPECTING', label: 'Prospecting', probability: 10 },
  { value: 'QUALIFICATION', label: 'Qualification', probability: 25 },
  { value: 'PROPOSAL', label: 'Proposal', probability: 50 },
  { value: 'NEGOTIATION', label: 'Negotiation', probability: 75 },
  { value: 'CLOSED_WON', label: 'Closed Won', probability: 100 },
  { value: 'CLOSED_LOST', label: 'Closed Lost', probability: 0 },
];

export function DealForm({ deal, onClose }: DealFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage: 'PROSPECTING' as 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST',
    probability: 10,
    expectedCloseDate: '',
    contactId: '',
    companyId: '',
    description: '',
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load form data when deal changes
  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        value: deal.value.toString(),
        stage: deal.stage,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : '',
        contactId: deal.contact?.id || '',
        companyId: deal.company?.id || '',
        description: deal.description || '',
      });
    } else {
      setFormData({
        title: '',
        value: '',
        stage: 'PROSPECTING',
        probability: 10,
        expectedCloseDate: '',
        contactId: '',
        companyId: '',
        description: '',
      });
    }
  }, [deal]);

  // Load contacts and companies
  useEffect(() => {
    const loadData = async () => {
      try {
        const [contactsResponse, companiesResponse] = await Promise.all([
          contactsApi.getAll({ limit: 100 }),
          companiesApi.getAll({ limit: 100 }),
        ]);
        
        setContacts(contactsResponse.contacts || []);
        setCompanies(companiesResponse.companies || []);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        value: parseFloat(formData.value),
        expectedCloseDate: formData.expectedCloseDate || undefined,
        contactId: formData.contactId || undefined,
        companyId: formData.companyId || undefined,
        description: formData.description || undefined,
      };

      if (deal) {
        await dealsApi.update(deal.id, submitData);
      } else {
        await dealsApi.create(submitData);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save deal');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = (stage: string) => {
    const stageData = dealStages.find(s => s.value === stage);
    setFormData(prev => ({
      ...prev,
      stage: stage as any,
      probability: stageData?.probability || prev.probability,
    }));
  };

  const handleDeleteDeal = async () => {
    if (!deal || !confirm('Are you sure you want to delete this deal?')) return;
    
    try {
      setLoading(true);
      await dealsApi.delete(deal.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete deal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161625] rounded-xl shadow-2xl border-4 border-orange-300 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50">
          <h2 className="text-xl font-bold text-[#F1F5F9]">
            {deal ? 'Edit Deal' : 'Add Deal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-black/10 rounded-full p-2 transition-colors"
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

          {/* Deal Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[#CBD5E1] mb-1">
              Deal Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input-field"
              placeholder="Enter deal title"
            />
          </div>

          {/* Value and Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="value" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Deal Value *
              </label>
              <input
                type="number"
                id="value"
                required
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="stage" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Stage
              </label>
              <select
                id="stage"
                value={formData.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="input-field"
              >
                {dealStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Probability and Close Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="probability" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                id="probability"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData(prev => ({ ...prev, probability: parseInt(e.target.value) || 0 }))}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="closeDate" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Expected Close Date
              </label>
              <input
                type="date"
                id="closeDate"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          {/* Contact and Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Contact
              </label>
              <select
                id="contact"
                value={formData.contactId}
                onChange={(e) => setFormData(prev => ({ ...prev, contactId: e.target.value }))}
                className="input-field"
              >
                <option value="">Select a contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-[#CBD5E1] mb-1">
                Company
              </label>
              <select
                id="company"
                value={formData.companyId}
                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                className="input-field"
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
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
              placeholder="Deal description or notes"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2a2a44]">
            <div>
              {deal && (
                <button
                  type="button"
                  onClick={handleDeleteDeal}
                  className="text-red-600 hover:text-red-400 text-sm font-medium"
                  disabled={loading}
                >
                  Delete Deal
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
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
                <span>{loading ? 'Saving...' : (deal ? 'Update Deal' : 'Add Deal')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}