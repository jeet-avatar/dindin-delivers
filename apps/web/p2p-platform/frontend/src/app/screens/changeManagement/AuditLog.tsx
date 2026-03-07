import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, Spin, Tag, Select, message } from 'antd';
import {
  Download,
  Search,
  RefreshCw,
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  FileText,
} from 'lucide-react';
import api from '../../api/api';

interface AuditEntry {
  id: number;
  cr_id: string;
  action: string;
  actor_email: string;
  old_value: string | null;
  new_value: string | null;
  metadata_json: string | null;
  created_at: string | null;
}

interface ChangeRequestWithAudit {
  cr_id: string;
  title: string;
  audit_entries: AuditEntry[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  pr_created: <GitBranch size={14} />,
  approved: <CheckCircle size={14} style={{ color: '#52c41a' }} />,
  rejected: <XCircle size={14} style={{ color: '#f5222d' }} />,
  status_changed: <Clock size={14} style={{ color: '#1890ff' }} />,
  deployed_staging: <Rocket size={14} style={{ color: '#faad14' }} />,
  deployed_production: <Rocket size={14} style={{ color: '#52c41a' }} />,
  created: <FileText size={14} style={{ color: '#722ed1' }} />,
  submitted: <FileText size={14} style={{ color: '#1890ff' }} />,
  updated: <FileText size={14} style={{ color: '#999' }} />,
  rollback_created: <GitBranch size={14} style={{ color: '#f5222d' }} />,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'purple',
  submitted: 'blue',
  approved: 'green',
  rejected: 'red',
  status_changed: 'cyan',
  pr_created: 'geekblue',
  deployed_staging: 'gold',
  deployed_production: 'lime',
  updated: 'default',
  rollback_created: 'volcano',
};

const AuditLog: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCrId, setSearchCrId] = useState('');
  const [searchActor, setSearchActor] = useState('');
  const [searchAction, setSearchAction] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const fetchAuditEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all CRs and flatten their audit entries
      const res = await api.get('/admin/change-requests/', { params: { page_size: 200 } });
      const items: ChangeRequestWithAudit[] = [];

      // For each CR, fetch detail with audit
      const crList = res.data?.items || [];
      const detailPromises = crList.slice(0, 50).map(async (cr: { cr_id: string }) => {
        try {
          const detail = await api.get(`/admin/change-requests/${cr.cr_id}`);
          return detail.data;
        } catch {
          return null;
        }
      });

      const details = await Promise.all(detailPromises);
      details.forEach((d: ChangeRequestWithAudit | null) => {
        if (d) items.push(d);
      });

      // Flatten and tag with cr_id
      const allEntries: AuditEntry[] = [];
      items.forEach((cr) => {
        (cr.audit_entries || []).forEach((entry) => {
          allEntries.push({ ...entry, cr_id: cr.cr_id });
        });
      });

      // Sort by created_at descending
      allEntries.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });

      setEntries(allEntries);
    } catch {
      message.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditEntries();
  }, [fetchAuditEntries]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/change-requests/audit/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'change-audit-log.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Audit log exported');
    } catch {
      message.error('Failed to export audit log');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter entries
  const filtered = entries.filter((e) => {
    if (searchCrId && !e.cr_id.toLowerCase().includes(searchCrId.toLowerCase())) return false;
    if (searchActor && !e.actor_email.toLowerCase().includes(searchActor.toLowerCase())) return false;
    if (searchAction && e.action !== searchAction) return false;
    return true;
  });

  const uniqueActions = [...new Set(entries.map((e) => e.action))].sort();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Global Audit Log</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<RefreshCw size={14} />} onClick={fetchAuditEntries}>Refresh</Button>
          <Button
            type="primary"
            icon={<Download size={14} />}
            loading={exporting}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          prefix={<Search size={14} />}
          placeholder="Search by CR ID"
          value={searchCrId}
          onChange={(e) => setSearchCrId(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />
        <Input
          prefix={<Search size={14} />}
          placeholder="Search by actor email"
          value={searchActor}
          onChange={(e) => setSearchActor(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="Action type"
          value={searchAction}
          onChange={(v) => setSearchAction(v)}
          allowClear
          style={{ width: 180 }}
          options={uniqueActions.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          <Clock size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>No audit entries found</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: '#e8e8e8',
          }} />

          {filtered.map((entry, idx) => (
            <div key={`${entry.cr_id}-${entry.id || idx}`} style={{ position: 'relative', marginBottom: 16 }}>
              {/* Timeline dot */}
              <div style={{
                position: 'absolute', left: -20, top: 4, width: 16, height: 16,
                borderRadius: '50%', background: '#fff', border: '2px solid #d9d9d9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {ACTION_ICONS[entry.action] || <Clock size={10} />}
              </div>

              <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag style={{ fontSize: 11, margin: 0 }}>{entry.cr_id}</Tag>
                  <Tag color={ACTION_COLORS[entry.action] || 'default'} style={{ fontSize: 11, margin: 0 }}>
                    {entry.action.replace(/_/g, ' ')}
                  </Tag>
                  <span style={{ fontSize: 12, color: '#666' }}>{entry.actor_email}</span>
                  <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
                    {formatDate(entry.created_at)}
                  </span>
                </div>

                {(entry.old_value || entry.new_value) && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {entry.old_value && <span>From: <strong>{entry.old_value}</strong></span>}
                    {entry.old_value && entry.new_value && <span> &rarr; </span>}
                    {entry.new_value && <span>To: <strong>{entry.new_value}</strong></span>}
                  </div>
                )}

                {entry.metadata_json && (
                  <details style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    <summary style={{ cursor: 'pointer' }}>Metadata</summary>
                    <pre style={{ fontSize: 10, background: '#fafafa', padding: 8, borderRadius: 4, overflow: 'auto' }}>
                      {typeof entry.metadata_json === 'string'
                        ? entry.metadata_json
                        : JSON.stringify(entry.metadata_json, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLog;
