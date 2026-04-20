import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { dealsApi } from '../../services/api';
import { DocumentsTab } from './components/DocumentsTab';

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
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
  activities?: any[];
  createdAt: string;
  updatedAt?: string;
}

const stageBadgeClass: Record<string, string> = {
  PROSPECTING: 'badge badge-gray',
  QUALIFICATION: 'badge badge-warning',
  PROPOSAL: 'badge badge-warning',
  NEGOTIATION: 'badge badge-warning',
  CLOSED_WON: 'badge badge-success',
  CLOSED_LOST: 'badge badge-error',
};

const tabs = [
  { id: 'overview', name: 'Overview', icon: CurrencyDollarIcon, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'activities', name: 'Activities', icon: ClockIcon, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'documents', name: 'Documents', icon: DocumentTextIcon, gradient: 'from-green-500 to-emerald-600' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadDeal();
    }
  }, [id]);

  const loadDeal = async () => {
    try {
      setLoading(true);
      const response = await dealsApi.getById(id!);
      setDeal(response.deal);
    } catch (err) {
      setError('Failed to load deal');
      console.error('Error loading deal:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !deal) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#F1F5F9] mb-4">Deal Not Found</h1>
          <p className="text-[#94A3B8] mb-4">{error}</p>
          <button
            onClick={() => navigate('/deals')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/deals')}
            className="p-2 rounded-lg bg-[#161625] shadow-sm border border-[#2a2a44] hover:bg-[#12121f] text-[#94A3B8] transition-colors"
            title="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#F1F5F9]">{deal.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xl font-semibold text-indigo-600">
                {formatCurrency(deal.value)}
              </span>
              <span className={stageBadgeClass[deal.stage] || 'badge badge-gray'}>
                {deal.stage.replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-[#94A3B8]">{deal.probability}% probability</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative overflow-hidden rounded-xl p-4 transition-all duration-200 transform ${
                isActive
                  ? `bg-gradient-to-br ${tab.gradient} text-white shadow-lg scale-105`
                  : 'bg-[#161625] hover:bg-[#12121f] text-[#CBD5E1] shadow-sm hover:shadow-md hover:-translate-y-1'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <div className={`${isActive ? 'bg-[#161625] bg-opacity-20' : 'bg-[#1c1c30]'} rounded-lg p-2`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-[#94A3B8]'}`} />
                </div>
                <span className="font-semibold text-sm">{tab.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Deal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1]">Title</label>
              <p className="mt-1 text-sm text-[#F1F5F9]">{deal.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1]">Value</label>
              <p className="mt-1 text-sm text-[#F1F5F9] font-semibold text-indigo-600">
                {formatCurrency(deal.value)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1]">Stage</label>
              <span className={`inline-flex mt-1 ${stageBadgeClass[deal.stage] || 'badge badge-gray'}`}>
                {deal.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1]">Probability</label>
              <p className="mt-1 text-sm text-[#F1F5F9]">{deal.probability}%</p>
            </div>
            {deal.contact && (
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1]">Contact</label>
                <p className="mt-1 text-sm text-[#F1F5F9]">
                  {deal.contact.firstName} {deal.contact.lastName}
                </p>
              </div>
            )}
            {deal.company && (
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1]">Company</label>
                <p className="mt-1 text-sm text-[#F1F5F9]">{deal.company.name}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1]">Expected Close Date</label>
              <p className="mt-1 text-sm text-[#F1F5F9]">{formatDate(deal.expectedCloseDate)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CBD5E1]">Created</label>
              <p className="mt-1 text-sm text-[#F1F5F9]">{formatDate(deal.createdAt)}</p>
            </div>
            {deal.description && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#CBD5E1]">Description</label>
                <p className="mt-1 text-sm text-[#F1F5F9] whitespace-pre-wrap">{deal.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Activities</h3>
          {deal.activities && deal.activities.length > 0 ? (
            <div className="space-y-4">
              {deal.activities.map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-[#12121f] rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-[#F1F5F9]">{activity.subject || activity.type}</p>
                    {activity.description && (
                      <p className="text-sm text-[#94A3B8] mt-1">{activity.description}</p>
                    )}
                    <p className="text-xs text-[#94A3B8] mt-2">
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
              <p className="text-[#94A3B8]">No activities recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <DocumentsTab
          dealId={id!}
          deal={deal}
        />
      )}
    </div>
  );
}
