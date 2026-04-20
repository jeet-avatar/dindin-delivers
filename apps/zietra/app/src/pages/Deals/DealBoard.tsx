import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, CurrencyDollarIcon, QuestionMarkCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { dealsApi } from '../../services/api';
import { DealForm } from './DealForm';
import { DealsHelpGuide } from '../../components/DealsHelpGuide';
import { useTheme } from '../../contexts/ThemeContext';

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
  createdAt: string;
}

const dealStages = [
  { id: 'PROSPECTING', name: 'Prospecting', color: 'bg-orange-500/10 border-orange-200' },
  { id: 'QUALIFICATION', name: 'Qualification', color: 'bg-orange-500/10 border-orange-300' },
  { id: 'PROPOSAL', name: 'Proposal', color: 'bg-amber-50 border-amber-300' },
  { id: 'NEGOTIATION', name: 'Negotiation', color: 'bg-orange-500/15 border-orange-400' },
  { id: 'CLOSED_WON', name: 'Closed Won', color: 'bg-green-500/10 border-green-400' },
  { id: 'CLOSED_LOST', name: 'Closed Lost', color: 'bg-red-500/10 border-red-300' },
];

export function DealBoard() {
  const { gradients } = useTheme();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const response = await dealsApi.getAll();
      setDeals(response.deals || []);
    } catch (err) {
      setError('Failed to load deals');
      console.error('Error loading deals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const handleAddDeal = () => {
    setEditingDeal(null);
    setShowModal(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingDeal(null);
    loadDeals();
  };

  const handleStageChange = async (dealId: string, newStage: string) => {
    try {
      await dealsApi.updateStage(dealId, newStage);
      loadDeals();
    } catch (err) {
      setError('Failed to update deal stage');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter(deal => deal.stage === stage);
  };

  const getTotalValue = (stage: string) => {
    return getDealsByStage(stage).reduce((sum, deal) => sum + deal.value, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#F1F5F9]">Deals Pipeline</h1>
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              title="Show Help Guide"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[#94A3B8] mt-1">Track and manage your sales opportunities • Click ? for help</p>
        </div>
        <button
          type="button"
          onClick={handleAddDeal}
          className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 tracking-wide`}
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Deal</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {dealStages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          const totalValue = getTotalValue(stage.id);

          return (
            <div key={stage.id} className={`card p-6 ${stage.color} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${
                  stage.id === 'CLOSED_WON' ? 'from-green-500 to-green-600' :
                  stage.id === 'CLOSED_LOST' ? 'from-red-500 to-red-600' :
                  `from-orange-500 to-orange-600`
                } rounded-xl flex items-center justify-center shadow-md`}>
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-[#F1F5F9]">{stageDeals.length}</div>
              </div>
              <p className="text-sm font-bold text-[#F1F5F9] mb-1">{stage.name}</p>
              <p className="text-sm font-medium text-[#CBD5E1]">{formatCurrency(totalValue)}</p>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {dealStages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          
          return (
            <div key={stage.id} className="flex flex-col">
              {/* Stage Header */}
              <div className={`p-4 rounded-t-xl border-2 ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#F1F5F9]">{stage.name}</h3>
                  <span className="text-sm text-[#94A3B8] font-medium">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="text-sm text-[#94A3B8] mt-1 font-medium">
                  {formatCurrency(getTotalValue(stage.id))}
                </div>
              </div>

              {/* Deal Cards */}
              <div className={`flex-1 p-3 bg-[#12121f] rounded-b-xl border-x-2 border-b-2 ${stage.color.replace('bg-', 'border-').split(' ')[1]} min-h-96`}>
                <div className="space-y-3">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-[#161625] p-4 rounded-xl shadow-md border-2 border-[#2a2a44] cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-[#F1F5F9] text-sm leading-tight">
                          {deal.title}
                        </h4>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <div className="text-xs text-[#94A3B8]">{deal.probability}%</div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDeal(deal);
                            }}
                            className="p-1 rounded hover:bg-indigo-50 text-[#64748B] hover:text-indigo-600 transition-colors"
                            title="Edit deal"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center text-indigo-400 mb-2">
                        <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                        <span className="font-bold text-sm">
                          {formatCurrency(deal.value)}
                        </span>
                      </div>

                      {deal.contact && (
                        <div className="text-xs text-[#94A3B8] mb-1">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </div>
                      )}

                      {deal.company && (
                        <div className="text-xs text-[#94A3B8] mb-2">
                          {deal.company.name}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-[#94A3B8]">
                          Close: {formatDate(deal.expectedCloseDate)}
                        </div>
                        
                        {/* Stage Change Dropdown */}
                        <select
                          value={deal.stage}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStageChange(deal.id, e.target.value);
                          }}
                          className="text-xs border-0 bg-transparent text-[#94A3B8] cursor-pointer hover:text-[#CBD5E1]"
                          title="Change stage"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {dealStages.map((stageOption) => (
                            <option key={stageOption.id} value={stageOption.id}>
                              {stageOption.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-[#64748B] text-sm">No deals in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Form Modal */}
      {showModal && (
        <DealForm
          deal={editingDeal}
          onClose={handleModalClose}
        />
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <DealsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}