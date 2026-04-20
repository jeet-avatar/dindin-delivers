import { useState, useEffect, useCallback } from 'react';
import { BuildingOfficeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { jobLeadsApi } from '../../services/api';
import type { JobLead } from '../../types';

const STREAMS = ['All', 'AI/ML', 'Cloud/DevOps', 'Full-Stack', 'Cybersecurity', 'Data/Analytics', 'Mobile', 'your ERP', 'Enterprise/ERP', 'Product/Design', 'QA/Testing', 'Web3', 'Staffing/HR', 'Other'] as const;

const STREAM_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  'AI/ML': { bg: 'rgba(168,85,247,0.18)', color: '#a855f7' },
  'Cloud/DevOps': { bg: 'rgba(59,130,246,0.18)', color: '#3b82f6' },
  'Full-Stack': { bg: 'rgba(99,102,241,0.18)', color: 'var(--accent-indigo)' },
  Cybersecurity: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  'Data/Analytics': { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
  Mobile: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  your ERP: { bg: 'rgba(99,102,241,0.18)', color: 'var(--accent-indigo)' },
  'Enterprise/ERP': { bg: 'rgba(234,179,8,0.15)', color: '#eab308' },
  'Product/Design': { bg: 'rgba(236,72,153,0.15)', color: '#ec4899' },
  'QA/Testing': { bg: 'rgba(20,184,166,0.15)', color: '#14b8a6' },
  Web3: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  'Staffing/HR': { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Other: { bg: 'rgba(107,114,128,0.15)', color: 'var(--text-secondary)' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function JobLeadsPage() {
  const [leads, setLeads] = useState<JobLead[]>([]);
  const [streams, setStreams] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [guideHidden, setGuideHidden] = useState<boolean>(
    () => localStorage.getItem('jl_guide_hidden') === 'true'
  );
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchLeads = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const stream = activeStream === 'All' ? undefined : activeStream;
      const data = await jobLeadsApi.fetch(stream, forceRefresh);
      setLeads(data.leads || []);
      setStreams(data.streams || {});
      setIsCached(data.cached || false);
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [activeStream]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const importLeads = async (leadsToImport: JobLead[]) => {
    if (leadsToImport.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const result = await jobLeadsApi.import(leadsToImport);
      setSuccessMsg(`Imported ${result.imported} lead${result.imported !== 1 ? 's' : ''} to CRM`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportSingle = (lead: JobLead) => importLeads([lead]);
  const handleImportSelected = () => {
    const toImport = leads.filter(l => selectedIds.has(l.id));
    importLeads(toImport);
  };

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Job Leads Pipeline
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Remote job postings from companies hiring — import as CRM leads
          </p>
        </div>
        {/* Hero CTA button */}
        <button
          onClick={() => fetchLeads(true)}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 28px',
            background: 'linear-gradient(135deg, var(--accent-indigo), #7c3aed)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.75 : 1,
            boxShadow: leads.length === 0 && !loading
              ? '0 0 0 0 rgba(99,102,241,0.7)'
              : 'none',
            animation: leads.length === 0 && !loading ? 'pulse-ring 2s ease-out infinite' : 'none',
            transition: 'opacity 0.2s',
          }}
        >
          <ArrowPathIcon style={{
            width: '20px',
            height: '20px',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }} />
          {loading ? 'Fetching fresh leads\u2026' : '\uD83D\uDE80 Get Fresh Leads'}
        </button>
      </div>

      {/* How-to guide panel — dismissible */}
      {!guideHidden && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          position: 'relative',
        }}>
          <button
            onClick={() => {
              setGuideHidden(true);
              localStorage.setItem('jl_guide_hidden', 'true');
            }}
            style={{
              position: 'absolute',
              top: '14px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 4px',
            }}
            title="Dismiss guide"
          >
            &times;
          </button>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700, margin: '0 0 16px' }}>
            📖 How to use this page
          </h3>
          <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { emoji: '🔍', text: 'Click the big blue button to find companies looking to hire people from India' },
              { emoji: '🏷️', text: 'Pick your stream at the top — your ERP, Cybersecurity, or Staffing' },
              { emoji: '✅', text: 'Tick the boxes next to companies you want to reach out to' },
              { emoji: '📬', text: "Click 'Add to My CRM' — they go straight into your contacts list with an email address ready to use" },
              { emoji: '📧', text: 'Go to Campaigns → create a new campaign → pick these contacts → send your email!' },
            ].map((step, i) => (
              <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <span style={{ marginRight: '8px' }}>{step.emoji}</span>
                {step.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Stream Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {STREAMS.map(stream => {
          const count = stream === 'All' ? leads.length : (streams[stream] ?? 0);
          const isActive = activeStream === stream;
          return (
            <button
              key={stream}
              onClick={() => setActiveStream(stream)}
              style={{
                padding: '8px 16px',
                borderRadius: '24px',
                border: isActive ? 'none' : '1px solid var(--border-default)',
                background: isActive ? 'var(--accent-indigo)' : 'var(--bg-elevated)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {stream}
              {count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-base)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  padding: '1px 7px',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Success message */}
      {successMsg && (
        <div style={{
          background: 'rgba(16,185,129,0.12)',
          color: 'var(--text-success, #10b981)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontWeight: 500,
          fontSize: '0.9rem',
        }}>
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          color: 'var(--text-danger, #ef4444)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontWeight: 500,
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* Lead Table */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: '12px',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 48px 1fr 200px 1fr 130px 110px 110px 140px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle, var(--border-default))',
          background: 'var(--bg-card)',
        }}>
          <div>
            <input
              type="checkbox"
              checked={leads.length > 0 && selectedIds.size === leads.length}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
            />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}></div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stream</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posted</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ArrowPathIcon style={{ width: '32px', height: '32px', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0 }}>Fetching job leads…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && leads.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <BuildingOfficeIcon style={{ width: '40px', height: '40px', margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>
              No job leads found for this stream. Try 'All' or click Get Fresh Leads.
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading && leads.map((lead, idx) => {
          const badgeStyle = STREAM_BADGE_STYLES[lead.stream] || STREAM_BADGE_STYLES['Other'];
          const isSelected = selectedIds.has(lead.id);
          return (
            <div
              key={lead.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 48px 1fr 200px 1fr 130px 110px 110px 140px',
                padding: '12px 16px',
                borderBottom: idx < leads.length - 1 ? '1px solid var(--border-subtle, var(--border-default))' : 'none',
                alignItems: 'center',
                background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {/* Checkbox */}
              <div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(lead.id)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
                />
              </div>

              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {lead.companyLogo ? (
                  <img
                    src={lead.companyLogo}
                    alt={lead.companyName}
                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <BuildingOfficeIcon style={{ width: '20px', height: '20px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                )}
              </div>

              {/* Company */}
              <div>
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => (e.target as HTMLAnchorElement).style.textDecoration = 'underline'}
                  onMouseLeave={e => (e.target as HTMLAnchorElement).style.textDecoration = 'none'}
                >
                  {lead.companyName}
                </a>
              </div>

              {/* Email pill */}
              <div>
                {lead.companyEmail ? (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lead.companyEmail!);
                      setCopiedEmail(lead.companyEmail!);
                      setTimeout(() => setCopiedEmail(null), 2000);
                    }}
                    title="Click to copy email"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      background: 'rgba(99,102,241,0.12)',
                      color: 'var(--accent-indigo)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {copiedEmail === lead.companyEmail ? '✓ Copied' : lead.companyEmail}
                  </button>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.5 }}>—</span>
                )}
              </div>

              {/* Job Title */}
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.title}
              </div>

              {/* Stream Badge */}
              <div>
                <span style={{
                  background: badgeStyle.bg,
                  color: badgeStyle.color,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  padding: '3px 10px',
                  whiteSpace: 'nowrap',
                }}>
                  {lead.stream}
                </span>
                {lead.source && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    {lead.source}
                  </span>
                )}
              </div>

              {/* Location */}
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.location}
              </div>

              {/* Posted date */}
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {formatDate(lead.postedAt)}
              </div>

              {/* Actions */}
              <div>
                <button
                  onClick={() => handleImportSingle(lead)}
                  disabled={importing}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--accent-indigo)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: importing ? 'not-allowed' : 'pointer',
                    opacity: importing ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Add to CRM
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk import sticky bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          zIndex: 50,
        }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleImportSelected}
            disabled={importing}
            style={{
              padding: '8px 20px',
              background: 'var(--accent-indigo)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: importing ? 'not-allowed' : 'pointer',
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? 'Importing\u2026' : `Add ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''} to CRM`}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
          70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
      `}</style>
    </div>
  );
}
