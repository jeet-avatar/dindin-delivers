import { useState, useEffect } from 'react';
import { DocumentTextIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { quotesApi, contractsApi } from '../../../services/api';
import { QuoteBuilder } from './QuoteBuilder';
import { ContractEditor } from './ContractEditor';

interface Quote {
  id: string;
  title: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

interface Contract {
  id: string;
  title: string;
  status: 'DRAFT' | 'SENT_FOR_SIGNATURE' | 'SIGNED' | 'CANCELLED';
  signedBy?: string | null;
  createdAt: string;
}

interface DocumentsTabProps {
  dealId: string;
  deal: {
    stage: string;
    title: string;
    value: number;
    contact?: any;
    company?: any;
  };
}

const quoteStatusBadge: Record<string, string> = {
  DRAFT: 'badge badge-gray',
  SENT: 'badge badge-warning',
  ACCEPTED: 'badge badge-success',
  REJECTED: 'badge badge-error',
  EXPIRED: 'badge badge-gray',
};

const contractStatusBadge: Record<string, string> = {
  DRAFT: 'badge badge-gray',
  SENT_FOR_SIGNATURE: 'badge badge-warning',
  SIGNED: 'badge badge-success',
  CANCELLED: 'badge badge-error',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function DocumentsTab({ dealId, deal }: DocumentsTabProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showContractEditor, setShowContractEditor] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      setError(null);
      const [q, c] = await Promise.all([
        quotesApi.getByDeal(dealId),
        contractsApi.getByDeal(dealId),
      ]);
      setQuotes(q.quotes || []);
      setContracts(c.contracts || []);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [dealId]);

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      await quotesApi.delete(id);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete quote:', err);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      await contractsApi.delete(id);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete contract:', err);
    }
  };

  const handleQuoteStatusChange = async (id: string, newStatus: string) => {
    try {
      await quotesApi.updateStatus(id, newStatus);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to update quote status:', err);
    }
  };

  const handleContractStatusChange = async (id: string, newStatus: string) => {
    let signedBy: string | undefined;
    if (newStatus === 'SIGNED') {
      const name = window.prompt('Signed by:');
      if (name === null) return; // User cancelled
      signedBy = name || undefined;
    }
    try {
      await contractsApi.updateStatus(id, newStatus, signedBy);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to update contract status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quotes Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-[#94A3B8]" />
            <h3 className="text-lg font-semibold text-[#F1F5F9]">Quotes</h3>
          </div>
          <div className="flex items-center gap-3">
            {deal.stage !== 'CLOSED_WON' && (
              <span className="text-xs text-[#64748B]">Available when deal is Closed Won</span>
            )}
            {deal.stage === 'CLOSED_WON' && (
              <button
                type="button"
                onClick={() => setShowQuoteBuilder(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4" />
                New Quote
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : quotes.length === 0 ? (
          <p className="text-[#94A3B8] text-sm">No quotes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c30]">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="text-sm">
                    <td className="py-3 pr-4 font-medium text-[#F1F5F9]">{quote.title}</td>
                    <td className="py-3 pr-4 text-[#CBD5E1]">{formatCurrency(quote.total)}</td>
                    <td className="py-3 pr-4">
                      <span className={quoteStatusBadge[quote.status] || 'badge badge-gray'}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[#94A3B8]">{formatDate(quote.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={quote.status}
                          onChange={(e) => handleQuoteStatusChange(quote.id, e.target.value)}
                          className="text-xs border border-[#2a2a44] rounded px-1.5 py-1 bg-[#161625] text-[#CBD5E1] hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
                          title="Change status"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="EXPIRED">Expired</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-[#64748B] hover:text-red-600 transition-colors"
                          title="Delete quote"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contracts Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-[#94A3B8]" />
            <h3 className="text-lg font-semibold text-[#F1F5F9]">Contracts</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowContractEditor(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4" />
            New Contract
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-[#94A3B8] text-sm">No contracts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Signed By</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c30]">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="text-sm">
                    <td className="py-3 pr-4 font-medium text-[#F1F5F9]">{contract.title}</td>
                    <td className="py-3 pr-4">
                      <span className={contractStatusBadge[contract.status] || 'badge badge-gray'}>
                        {contract.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[#94A3B8]">{contract.signedBy || '—'}</td>
                    <td className="py-3 pr-4 text-[#94A3B8]">{formatDate(contract.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={contract.status}
                          onChange={(e) => handleContractStatusChange(contract.id, e.target.value)}
                          className="text-xs border border-[#2a2a44] rounded px-1.5 py-1 bg-[#161625] text-[#CBD5E1] hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
                          title="Change status"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SENT_FOR_SIGNATURE">Sent for Signature</option>
                          <option value="SIGNED">Signed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteContract(contract.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-[#64748B] hover:text-red-600 transition-colors"
                          title="Delete contract"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals — rendered conditionally at the bottom of the fragment */}
      {showQuoteBuilder && (
        <QuoteBuilder
          dealId={dealId}
          onClose={() => setShowQuoteBuilder(false)}
          onSaved={fetchDocuments}
        />
      )}
      {showContractEditor && (
        <ContractEditor
          dealId={dealId}
          deal={deal}
          onClose={() => setShowContractEditor(false)}
          onSaved={fetchDocuments}
        />
      )}
    </div>
  );
}
