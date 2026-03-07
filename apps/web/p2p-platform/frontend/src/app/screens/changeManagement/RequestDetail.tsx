import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Tag, Button, Modal, Input, Spin, message } from 'antd';
import {
  ArrowLeft,
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  FileText,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import api from '../../api/api';

const { TextArea } = Input;

// ==================== Types ====================

interface AuditEntry {
  id: number;
  action: string;
  actor_email: string;
  old_value: string | null;
  new_value: string | null;
  metadata_json: string | null;
  created_at: string | null;
}

interface ChangeRequestDetail {
  cr_id: string;
  title: string;
  description: string | null;
  status: string;
  change_type: string;
  priority: string;
  department_name: string | null;
  department_id: number | null;
  requested_by: string;
  case_ids: string | null;
  pr_url: string | null;
  pr_branch: string | null;
  ci_status: string | null;
  staging_deployed_at: string | null;
  production_deployed_at: string | null;
  rollback_of_cr_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  audit_entries: AuditEntry[];
}

// ==================== Constants ====================

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'default',
  'Submitted': 'blue',
  'Under Review': 'orange',
  'Approved': 'green',
  'In Progress': 'cyan',
  'PR Created': 'purple',
  'CI Running': 'geekblue',
  'Staging': 'gold',
  'Production': 'lime',
  'Verified': 'success',
  'Closed': 'default',
  'Rejected': 'error',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Critical: 'red',
};

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
  rollback_created: <RotateCcw size={14} style={{ color: '#f5222d' }} />,
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

// ==================== Component ====================

const RequestDetail: React.FC = () => {
  const { crId } = useParams<{ crId: string }>();
  const navigate = useNavigate();
  const [cr, setCr] = useState<ChangeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getAdminEmail = (): string => {
    try {
      const userData = globalThis.localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email || 'admin@dollor.ai';
      }
    } catch { /* ignore */ }
    return 'admin@dollor.ai';
  };

  const fetchCr = useCallback(async () => {
    if (!crId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/change-requests/${crId}`);
      setCr(res.data);
    } catch {
      message.error('Failed to load change request');
    } finally {
      setLoading(false);
    }
  }, [crId]);

  useEffect(() => {
    fetchCr();
  }, [fetchCr]);

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!cr) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/change-requests/${cr.cr_id}/${action}`, payload || {});
      message.success(`Action "${action}" completed`);
      fetchCr();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${action}`;
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransition = async (newStatus: string) => {
    if (!cr) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/change-requests/${cr.cr_id}/transition`, {
        new_status: newStatus,
        actor_email: getAdminEmail(),
      });
      message.success(`Transitioned to ${newStatus}`);
      fetchCr();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to transition to ${newStatus}`;
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!cr) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/change-requests/${cr.cr_id}/reject`, {
        rejector_email: getAdminEmail(),
        reason: rejectReason || undefined,
      });
      message.success('Rejected');
      setRejectModalOpen(false);
      setRejectReason('');
      fetchCr();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!cr) return;
    Modal.confirm({
      title: 'Create Rollback',
      content: `This will create a new change request to roll back ${cr.cr_id}. Continue?`,
      okText: 'Create Rollback',
      okType: 'primary',
      onOk: async () => {
        setActionLoading(true);
        try {
          const res = await api.post(`/admin/change-requests/${cr.cr_id}/rollback`, {
            actor_email: getAdminEmail(),
          });
          message.success(`Rollback CR created: ${res.data?.cr_id || 'success'}`);
          fetchCr();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to create rollback';
          message.error(msg);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatRelative = (dateStr: string | null) => {
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
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!cr) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Change request not found</p>
        <Button onClick={() => navigate('/admin/change-management')}>Back to list</Button>
      </div>
    );
  }

  // ==================== Action Buttons ====================

  const renderActions = () => {
    const status = cr.status;
    const buttons: React.ReactNode[] = [];

    if (status === 'Draft') {
      buttons.push(
        <Button
          key="submit"
          type="primary"
          loading={actionLoading}
          onClick={() => handleAction('submit')}
        >
          Submit for Review
        </Button>
      );
    }

    if (status === 'Under Review') {
      buttons.push(
        <Button
          key="approve"
          type="primary"
          icon={<CheckCircle size={14} />}
          loading={actionLoading}
          onClick={() => handleAction('approve', { approver_email: getAdminEmail() })}
        >
          Approve
        </Button>,
        <Button
          key="reject"
          danger
          icon={<XCircle size={14} />}
          loading={actionLoading}
          onClick={() => setRejectModalOpen(true)}
        >
          Reject
        </Button>
      );
    }

    if (status === 'Approved') {
      buttons.push(
        <Button
          key="start"
          type="primary"
          loading={actionLoading}
          onClick={() => handleTransition('In Progress')}
        >
          Start Implementation
        </Button>
      );
    }

    if (status === 'Staging') {
      buttons.push(
        <Button
          key="deploy-prod"
          type="primary"
          loading={actionLoading}
          onClick={() => {
            Modal.confirm({
              title: 'Deploy to Production',
              content: 'This marks the CR as deployed to production. Ensure CI/CD has completed.',
              icon: <AlertTriangle size={20} style={{ color: '#faad14' }} />,
              okText: 'Confirm Deploy',
              onOk: () => handleTransition('Production'),
            });
          }}
        >
          <Rocket size={14} style={{ marginRight: 4 }} />
          Deploy to Production
        </Button>
      );
    }

    if (status === 'Production') {
      buttons.push(
        <Button
          key="verify"
          type="primary"
          icon={<CheckCircle size={14} />}
          loading={actionLoading}
          onClick={() => handleTransition('Verified')}
        >
          Mark Verified
        </Button>,
        <Button
          key="rollback-prod"
          danger
          icon={<RotateCcw size={14} />}
          loading={actionLoading}
          onClick={handleRollback}
        >
          Rollback
        </Button>
      );
    }

    if (status === 'Verified') {
      buttons.push(
        <Button
          key="close"
          loading={actionLoading}
          onClick={() => handleTransition('Closed')}
        >
          Close
        </Button>,
        <Button
          key="rollback-verified"
          danger
          icon={<RotateCcw size={14} />}
          loading={actionLoading}
          onClick={handleRollback}
        >
          Rollback
        </Button>
      );
    }

    if (buttons.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {buttons}
      </div>
    );
  };

  // ==================== Render ====================

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Back nav */}
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/admin/change-management')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        Back to Change Management
      </Button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Tag style={{ fontSize: 14, padding: '2px 10px', fontWeight: 700 }}>{cr.cr_id}</Tag>
          <h2 style={{ margin: 0, flex: 1 }}>{cr.title}</h2>
          <Tag color={STATUS_COLORS[cr.status] || 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
            {cr.status}
          </Tag>
        </div>
        {cr.description && (
          <p style={{ color: '#666', whiteSpace: 'pre-wrap', marginTop: 8 }}>{cr.description}</p>
        )}
      </div>

      {/* Info grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16, marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Change Type</div>
          <div style={{ fontWeight: 500 }}>{cr.change_type}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Priority</div>
          <Tag color={PRIORITY_COLORS[cr.priority] || 'default'}>{cr.priority}</Tag>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Department</div>
          <div>{cr.department_name || '-'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Requested By</div>
          <div>{cr.requested_by}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Created</div>
          <div>{formatDate(cr.created_at)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Updated</div>
          <div>{formatDate(cr.updated_at)}</div>
        </div>
        {cr.approved_by && (
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Approved By</div>
            <div>{cr.approved_by} ({formatDate(cr.approved_at)})</div>
          </div>
        )}
        {cr.case_ids && (
          <div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>Linked Cases</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {cr.case_ids.split(',').map((cid) => (
                <Tag key={cid.trim()} style={{ fontSize: 11 }}>{cid.trim()}</Tag>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rollback link */}
      {cr.rollback_of_cr_id && (
        <div style={{ padding: 12, background: '#fff2e8', borderRadius: 8, marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ marginRight: 4, color: '#fa541c' }} />
          Rollback of:{' '}
          <Link to={`/admin/change-management/${cr.rollback_of_cr_id}`}>
            {cr.rollback_of_cr_id}
          </Link>
        </div>
      )}

      {/* PR section */}
      {cr.pr_url && (
        <div style={{ padding: 12, background: '#f6f8fa', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            <GitBranch size={14} style={{ marginRight: 4 }} />
            Pull Request
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href={cr.pr_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              View PR <ExternalLink size={12} />
            </a>
            {cr.pr_branch && <span>Branch: <code>{cr.pr_branch}</code></span>}
            {cr.ci_status && <Tag color={cr.ci_status === 'success' ? 'green' : cr.ci_status === 'failure' ? 'red' : 'blue'}>{cr.ci_status}</Tag>}
          </div>
        </div>
      )}

      {/* Deploy section */}
      {(cr.staging_deployed_at || cr.production_deployed_at) && (
        <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            <Rocket size={14} style={{ marginRight: 4 }} />
            Deployments
          </div>
          {cr.staging_deployed_at && (
            <div>Staging: {formatDate(cr.staging_deployed_at)}</div>
          )}
          {cr.production_deployed_at && (
            <div>Production: {formatDate(cr.production_deployed_at)}</div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {renderActions()}

      {/* Audit Timeline */}
      <div style={{ marginTop: 32 }}>
        <h3>Audit Timeline</h3>
        {(!cr.audit_entries || cr.audit_entries.length === 0) ? (
          <p style={{ color: '#999' }}>No audit entries yet</p>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 24, marginTop: 16 }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: '#e8e8e8',
            }} />

            {cr.audit_entries.map((entry, idx) => (
              <div key={entry.id || idx} style={{ position: 'relative', marginBottom: 20 }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -20, top: 4, width: 16, height: 16,
                  borderRadius: '50%', background: '#fff', border: '2px solid #d9d9d9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {ACTION_ICONS[entry.action] || <Clock size={10} />}
                </div>

                <div style={{ paddingLeft: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Tag color={ACTION_COLORS[entry.action] || 'default'} style={{ fontSize: 11, margin: 0 }}>
                      {entry.action.replace(/_/g, ' ')}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#666' }}>{entry.actor_email}</span>
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
                      {formatRelative(entry.created_at)}
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
                    <details style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      <summary style={{ cursor: 'pointer' }}>Details</summary>
                      <pre style={{ fontSize: 10, background: '#fafafa', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 200 }}>
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

      {/* Reject Modal */}
      <Modal
        title={
          <span>
            <AlertTriangle size={16} style={{ marginRight: 8, color: '#faad14' }} />
            Reject {cr.cr_id}
          </span>
        }
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
        okText="Reject"
        okButtonProps={{ danger: true, loading: actionLoading }}
      >
        <p>Provide a reason for rejection:</p>
        <TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (optional)"
        />
      </Modal>
    </div>
  );
};

export default RequestDetail;
