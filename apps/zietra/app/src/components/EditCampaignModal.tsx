import { useState, useEffect } from 'react';
import { XMarkIcon, BuildingOfficeIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Company {
  id: string;
  name: string;
  industry?: string;
  addedAt?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
}

export function EditCampaignModal({ isOpen, onClose, campaignId, campaignName, onSuccess }: Props) {
  const [campaignCompanies, setCampaignCompanies] = useState<Company[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddCompanies, setShowAddCompanies] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError('');
      setSuccess('');
      setShowAddCompanies(false);
      setSearchTerm('');
    }
  }, [isOpen, campaignId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = allCompanies.filter(company =>
        !campaignCompanies.some(cc => cc.id === company.id) &&
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      const notInCampaign = allCompanies.filter(company =>
        !campaignCompanies.some(cc => cc.id === company.id)
      );
      setFilteredCompanies(notInCampaign);
    }
  }, [searchTerm, allCompanies, campaignCompanies]);

  const loadData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      // Load campaign companies
      const campaignResponse = await fetch(`${apiUrl}/api/campaigns/${campaignId}/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const campaignData = await campaignResponse.json();
      setCampaignCompanies(campaignData.companies || []);

      // Load all companies
      const allResponse = await fetch(`${apiUrl}/api/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const allData = await allResponse.json();
      setAllCompanies(allData.companies || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (companyId: string, companyName: string) => {
    try {
      setLoading(true);
      setError('');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      const response = await fetch(
        `${apiUrl}/api/campaigns/${campaignId}/companies/${companyId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      );

      if (response.ok) {
        setSuccess(`${companyName} added successfully!`);
        await loadData();
        setSearchTerm('');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add company');
      }
    } catch (err) {
      console.error('Error adding company:', err);
      setError('Failed to add company');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Remove ${companyName} from this campaign?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      const response = await fetch(
        `${apiUrl}/api/campaigns/${campaignId}/companies/${companyId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        }
      );

      if (response.ok) {
        setSuccess(`${companyName} removed successfully!`);
        await loadData();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove company');
      }
    } catch (err) {
      console.error('Error removing company:', err);
      setError('Failed to remove company');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#161625] rounded-xl shadow-2xl border-4 border-[#33335a] max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a44] bg-gradient-to-r from-indigo-600 to-purple-600">
          <div>
            <h2 className="text-2xl font-bold text-white">Edit Campaign</h2>
            <p className="text-sm text-white opacity-90 mt-1">{campaignName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#161625] hover:bg-opacity-20 transition-colors p-2 rounded-lg"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="px-6 pt-4">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-200 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-200 text-green-400 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!showAddCompanies ? (
            <>
              {/* Current Companies List */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
                    <BuildingOfficeIcon className="h-5 w-5" />
                    Companies in Campaign ({campaignCompanies.length})
                  </h3>
                  <button
                    onClick={() => setShowAddCompanies(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Companies
                  </button>
                </div>

                {loading && campaignCompanies.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                  </div>
                ) : campaignCompanies.length === 0 ? (
                  <div className="bg-[#12121f] rounded-xl p-8 text-center">
                    <BuildingOfficeIcon className="h-12 w-12 text-[#64748B] mx-auto mb-3" />
                    <p className="text-[#94A3B8] font-medium mb-4">No companies in this campaign yet</p>
                    <button
                      onClick={() => setShowAddCompanies(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add Companies Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaignCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-4 hover:shadow-md hover:border-orange-300 transition-all duration-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#F1F5F9]">{company.name}</p>
                            {company.industry && (
                              <p className="text-sm text-[#94A3B8]">{company.industry}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCompany(company.id, company.name)}
                          disabled={loading}
                          className="px-3 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Add Companies View */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#F1F5F9]">Add Companies to Campaign</h3>
                  <button
                    onClick={() => {
                      setShowAddCompanies(false);
                      setSearchTerm('');
                    }}
                    className="text-sm text-[#94A3B8] hover:text-[#E2E8F0] font-medium"
                  >
                    ← Back to Campaign
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#64748B]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search companies..."
                    className="w-full pl-10 pr-4 py-2.5 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Available Companies */}
                {loading && filteredCompanies.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <div className="bg-[#12121f] rounded-xl p-8 text-center">
                    <BuildingOfficeIcon className="h-12 w-12 text-[#64748B] mx-auto mb-3" />
                    <p className="text-[#94A3B8] font-medium">
                      {searchTerm ? 'No companies found matching your search' : 'All companies have been added to this campaign'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-4 hover:shadow-md hover:border-green-300 transition-all duration-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#F1F5F9]">{company.name}</p>
                            {company.industry && (
                              <p className="text-sm text-[#94A3B8]">{company.industry}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddCompany(company.id, company.name)}
                          disabled={loading}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[#2a2a44] bg-[#12121f]">
          <button
            onClick={() => {
              onSuccess?.();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
