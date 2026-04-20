import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  TrendingUpIcon,
  UserGroupIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Position {
  id: string;
  title: string;
  department: string | null;
  seniority: string | null;
  hiringIntent: string | null;
  urgency: string | null;
  isLeadership: boolean;
  isReplacement: boolean;
  isExpansion: boolean;
  recentChanges: string | null;
  campaignSent: boolean;
  aiSubject: string | null;
  aiEmailContent: string | null;
  aiPitch: string | null;
  company: {
    id: string;
    name: string;
    industry: string | null;
    size: string | null;
  };
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    title: string | null;
  } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated?: () => void;
}

export function PositionCampaignBuilder({ isOpen, onClose, onCampaignCreated }: Props) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterUnsent, setFilterUnsent] = useState(true);
  const [filterLeadership, setFilterLeadership] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPositions();
    }
  }, [isOpen]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterUnsent) params.append('campaignSent', 'false');
      if (filterLeadership) params.append('isLeadership', 'true');

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/positions?${params}`);
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCampaignContent = async (positionId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/positions/${positionId}/generate-campaign-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 'professional', includeLeadershipChanges: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      // Update the position in the list
      setPositions(prev =>
        prev.map(p =>
          p.id === positionId
            ? { ...p, aiSubject: data.subject, aiEmailContent: data.emailContent, aiPitch: data.pitch }
            : p
        )
      );

      return data;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  };

  const generateAllSelected = async () => {
    setGenerating(true);
    for (const positionId of selectedPositions) {
      await generateCampaignContent(positionId);
    }
    setGenerating(false);
  };

  const togglePosition = (positionId: string) => {
    setSelectedPositions(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredPositions.map(p => p.id);
    if (selectedPositions.length === visibleIds.length) {
      setSelectedPositions([]);
    } else {
      setSelectedPositions(visibleIds);
    }
  };

  const filteredPositions = positions.filter(p => {
    const matchesSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null;
    const colors: Record<string, string> = {
      High: 'bg-red-500/15 text-red-400',
      Medium: 'bg-yellow-500/15 text-yellow-400',
      Low: 'bg-green-500/15 text-green-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${colors[urgency] || 'bg-[#1c1c30] text-[#CBD5E1]'}`}>
        <FireIcon className="h-3 w-3" />
        {urgency}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#161625] rounded-2xl shadow-2xl border-4 border-[#33335a] max-w-7xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Position-Based Campaign Builder</h2>
              <p className="text-rose-100 text-lg">Create personalized campaigns for each position</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#161625] hover:bg-opacity-20 rounded-lg transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="border-b-2 border-[#1c1c30] p-6 bg-[#161625] flex-shrink-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => { setFilterUnsent(!filterUnsent); loadPositions(); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filterUnsent
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-[#1c1c30] text-[#CBD5E1] hover:bg-[#252540]'
                }`}
              >
                Unsent Only
              </button>
              <button
                onClick={() => { setFilterLeadership(!filterLeadership); loadPositions(); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filterLeadership
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-[#1c1c30] text-[#CBD5E1] hover:bg-[#252540]'
                }`}
              >
                Leadership Only
              </button>
              <button
                onClick={toggleAllVisible}
                className="px-4 py-2 bg-orange-500/15 text-orange-400 rounded-lg text-sm font-semibold hover:bg-orange-200 transition-all"
              >
                {selectedPositions.length === filteredPositions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search positions, companies..."
                className="w-full px-4 py-2 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
              />
            </div>
          </div>

          {selectedPositions.length > 0 && (
            <div className="flex items-center justify-between bg-rose-500/10 border-2 border-rose-200 rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-rose-900">{selectedPositions.length} positions selected</p>
                <p className="text-xs text-rose-400">Generate personalized campaigns for all selected positions</p>
              </div>
              <button
                onClick={generateAllSelected}
                disabled={generating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                {generating ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Generate All Campaigns
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Positions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="text-center py-12">
              <BriefcaseIcon className="h-16 w-16 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#F1F5F9] mb-2">No positions found</h3>
              <p className="text-[#94A3B8]">Adjust your filters or add positions to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPositions.map((position) => (
                <div
                  key={position.id}
                  className={`border-2 rounded-xl p-6 transition-all cursor-pointer ${
                    selectedPositions.includes(position.id)
                      ? 'border-rose-500 bg-rose-500/10 shadow-lg'
                      : 'border-[#2a2a44] bg-[#161625] hover:border-rose-300 hover:shadow-md'
                  }`}
                  onClick={() => togglePosition(position.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedPositions.includes(position.id)}
                          onChange={() => togglePosition(position.id)}
                          className="w-5 h-5 rounded border-[#33335a] text-purple-400 focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <h3 className="text-xl font-bold text-[#F1F5F9]">{position.title}</h3>
                        {position.isLeadership && (
                          <span className="px-3 py-1 bg-orange-500/15 text-orange-400 text-xs font-semibold rounded-full">
                            Leadership
                          </span>
                        )}
                        {position.isReplacement && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/15 text-orange-400 text-xs font-semibold rounded-full">
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            Replacement
                          </span>
                        )}
                        {position.isExpansion && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/15 text-green-400 text-xs font-semibold rounded-full">
                            <TrendingUpIcon className="h-3 w-3" />
                            Expansion
                          </span>
                        )}
                        {getUrgencyBadge(position.urgency)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[#94A3B8] mb-3">
                        <div className="flex items-center gap-1">
                          <BuildingOfficeIcon className="h-4 w-4" />
                          <span className="font-medium">{position.company.name}</span>
                        </div>
                        {position.department && (
                          <>
                            <span>•</span>
                            <span>{position.department}</span>
                          </>
                        )}
                        {position.seniority && (
                          <>
                            <span>•</span>
                            <span>{position.seniority}</span>
                          </>
                        )}
                      </div>

                      {position.hiringIntent && (
                        <div className="bg-orange-500/10 border border-orange-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-orange-400 mb-1">Hiring Intent:</p>
                          <p className="text-sm text-[#CBD5E1]">{position.hiringIntent}</p>
                        </div>
                      )}

                      {position.recentChanges && (
                        <div className="bg-yellow-500/10 border border-yellow-200 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-yellow-400 mb-1">Recent Changes:</p>
                          <p className="text-sm text-[#CBD5E1]">{position.recentChanges}</p>
                        </div>
                      )}

                      {position.aiPitch && (
                        <div className="bg-rose-500/10 border border-rose-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-rose-400 mb-1 flex items-center gap-1">
                            <SparklesIcon className="h-3 w-3" />
                            AI-Generated Pitch:
                          </p>
                          <p className="text-sm text-[#CBD5E1]">{position.aiPitch}</p>
                        </div>
                      )}

                      {position.contact && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-[#94A3B8]">
                          <UserGroupIcon className="h-4 w-4" />
                          <span>
                            Decision Maker: {position.contact.firstName} {position.contact.lastName}
                            {position.contact.title && ` (${position.contact.title})`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {position.campaignSent && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/15 text-green-400 text-xs font-semibold rounded-full">
                          <CheckCircleIcon className="h-4 w-4" />
                          Campaign Sent
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateCampaignContent(position.id);
                        }}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                      >
                        <SparklesIcon className="h-4 w-4" />
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[#2a2a44] p-6 bg-[#12121f] flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-[#94A3B8]">
            {selectedPositions.length} of {filteredPositions.length} positions selected
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PositionCampaignBuilder;
