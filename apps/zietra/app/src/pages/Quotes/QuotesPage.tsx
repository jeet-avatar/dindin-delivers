import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { quotesApi } from '../../services/api';

interface Quote {
  id: string;
  title: string;
  status: string;
  subtotal: number;
  tax: number | null;
  total: number;
  validUntil?: string;
  createdAt: string;
  deal?: { id: string; title: string };
}

const statusBadge: Record<string, string> = {
  DRAFT: 'badge badge-gray',
  SENT: 'badge badge-warning',
  ACCEPTED: 'badge badge-success',
  REJECTED: 'badge badge-error',
  EXPIRED: 'badge badge-error',
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    quotesApi.getAll()
      .then((data: any) => setQuotes(data.quotes || data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = quotes.filter(q =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.deal?.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9]">Quotes</h1>
          <p className="text-[#94A3B8] mt-1">All quotes across your deals</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
        <input
          type="text"
          placeholder="Search quotes or deals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 w-full max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <DocumentTextIcon className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
            <p className="text-[#94A3B8] font-medium">
              {search ? 'No quotes match your search.' : 'No quotes yet. Create one from a deal\'s Documents tab.'}
            </p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Deal</th>
                <th>Total</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="cursor-pointer hover:bg-[#12121f] transition-colors" onClick={() => q.deal && navigate(`/deals/${q.deal.id}`)}>
                  <td className="font-semibold text-[#F1F5F9]">{q.title}</td>
                  <td className="text-[#94A3B8]">{q.deal?.title ?? '—'}</td>
                  <td className="font-bold text-indigo-600">{formatCurrency(q.total)}</td>
                  <td>
                    <span className={statusBadge[q.status] ?? 'badge badge-gray'}>
                      {q.status}
                    </span>
                  </td>
                  <td className="text-[#94A3B8]">{formatDate(q.validUntil)}</td>
                  <td className="text-[#94A3B8]">{formatDate(q.createdAt)}</td>
                  <td>
                    {q.deal && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/deals/${q.deal!.id}`); }}
                        className="p-1 rounded hover:bg-indigo-50 text-[#64748B] hover:text-indigo-600 transition-colors"
                        title="Open deal"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-[#94A3B8] mt-3">{filtered.length} quote{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
