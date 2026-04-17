import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../services/api';

interface KnowledgeStatus {
  status: 'ready' | 'building' | 'error' | 'not_built' | 'unknown';
  last_built: string | null;
  doc_count: number;
  custom_fields: number;
  custom_records: number;
  deployed_scripts: number;
  workflows: number;
  bootstrap_docs: number;
  error?: string;
}

const DEFAULT_STATUS: KnowledgeStatus = {
  status: 'unknown',
  last_built: null,
  doc_count: 0,
  custom_fields: 0,
  custom_records: 0,
  deployed_scripts: 0,
  workflows: 0,
  bootstrap_docs: 95,
};

export default function KnowledgeBaseTab() {
  const [status, setStatus]         = useState<KnowledgeStatus>(DEFAULT_STATUS);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const token = getAccessToken();
      const resp = await fetch('/api/admin/knowledge/status', {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: KnowledgeStatus = await resp.json();
      setStatus(data);
    } catch {
      setError('Failed to load knowledge status');
    }
  }, []);

  // Fetch on mount; re-poll every 5s while a build is in progress
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (status.status === 'building') fetchStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, status.status]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const token = getAccessToken();
      const resp = await fetch('/api/admin/knowledge/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setStatus(prev => ({ ...prev, status: 'building' }));
    } catch {
      setError('Refresh failed. Check NetSuite connection.');
    } finally {
      setRefreshing(false);
    }
  };

  const statusColor: Record<KnowledgeStatus['status'], string> = {
    ready:     'text-green-400',
    building:  'text-yellow-400',
    error:     'text-red-400',
    not_built: 'text-slate-400',
    unknown:   'text-slate-400',
  };

  const statusLabel: Record<KnowledgeStatus['status'], string> = {
    ready:     'Ready',
    building:  'Building...',
    error:     'Error',
    not_built: 'Not Built',
    unknown:   'Loading...',
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
        <p className="text-slate-400 mt-1 text-sm">
          ArthaBuild's RAG knowledge base — what it knows about your NetSuite instance.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
            <div className={`text-lg font-semibold ${statusColor[status.status]}`}>
              {statusLabel[status.status]}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || status.status === 'building'}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50
                       disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium
                       transition-colors"
          >
            {refreshing || status.status === 'building' ? 'Refreshing...' : 'Refresh Knowledge'}
          </button>
        </div>

        <div className="text-sm text-slate-400">
          Last updated: <span className="text-white">{formatDate(status.last_built)}</span>
        </div>

        {status.status === 'building' && (
          <div className="text-sm text-yellow-400">
            Pulling from your NetSuite instance... this takes 1–3 minutes.
          </div>
        )}

        {status.error && (
          <div className="text-sm text-red-400">{status.error}</div>
        )}
      </div>

      {/* Customer index stats */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Your Instance (Customer Index)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Custom Fields',   value: status.custom_fields },
            { label: 'Custom Records',  value: status.custom_records },
            { label: 'Scripts Indexed', value: status.deployed_scripts },
            { label: 'Workflows',       value: status.workflows },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bootstrap index stats */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          General Knowledge (Bootstrap Index)
        </h2>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-5">
            <div className="text-4xl font-bold text-white">{status.bootstrap_docs}</div>
            <div>
              <div className="text-sm font-medium text-white">Reference Documents</div>
              <div className="text-xs text-slate-400 mt-0.5">
                SuiteScript 2.x · All N/ modules · O2C · P2P · Manufacturing · CRM
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg p-4">
          {error}
        </div>
      )}
    </div>
  );
}
