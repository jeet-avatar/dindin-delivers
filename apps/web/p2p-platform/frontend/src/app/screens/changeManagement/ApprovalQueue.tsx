import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Button, Modal, Input, message, Spin, Switch } from 'antd';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Clock, Shield } from 'lucide-react';
import api from '../../api/api';

const { TextArea } = Input;

interface ApprovalStepData {
  id: number;
  step_order: number;
  approver_role: string;
  approver_email: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  sla_deadline: string | null;
  comments: string | null;
}

interface ChangeRequest {
  cr_id: string;
  title: string;
  description: string | null;
  priority: string;
  requested_by: string;
  department_name: string | null;
  created_at: string | null;
  case_ids: string | null;
  approval_steps?: ApprovalStepData[];
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Critical: 'red',
};

const ROLE_LABELS: Record<string, string> = {
  dept_lead: 'Dept Lead',
  cto: 'CTO',
  vp_engineering: 'VP Eng',
  security_lead: 'Security',
};

const ApprovalQueue: React.FC = () => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalCrId, setRejectModalCrId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [myApprovalsOnly, setMyApprovalsOnly] = useState(false);

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

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/change-requests/', {
        params: { status: 'Under Review', page_size: 100 },
      });
      const items: ChangeRequest[] = res.data?.items || [];

      // Fetch approval steps for each CR
      const enriched = await Promise.all(
        items.map(async (cr) => {
          try {
            const stepsRes = await api.get(`/admin/change-requests/${cr.cr_id}/approval-steps`);
            return { ...cr, approval_steps: stepsRes.data || [] };
          } catch {
            return cr;
          }
        })
      );

      setRequests(enriched);
    } catch {
      message.error('Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleApprove = async (crId: string) => {
    Modal.confirm({
      title: 'Approve Change Request',
      content: `Are you sure you want to approve ${crId}?`,
      okText: 'Approve',
      okType: 'primary',
      onOk: async () => {
        setActionLoading(crId);
        try {
          await api.post(`/admin/change-requests/${crId}/approve`, {
            approver_email: getAdminEmail(),
          });
          message.success(`${crId} approved`);
          fetchQueue();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to approve';
          message.error(msg);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleReject = async () => {
    if (!rejectModalCrId) return;
    setActionLoading(rejectModalCrId);
    try {
      await api.post(`/admin/change-requests/${rejectModalCrId}/reject`, {
        rejector_email: getAdminEmail(),
        reason: rejectReason || undefined,
      });
      message.success(`${rejectModalCrId} rejected`);
      setRejectModalCrId(null);
      setRejectReason('');
      fetchQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject';
      message.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const getSlaInfo = (steps: ApprovalStepData[] | undefined) => {
    if (!steps || steps.length === 0) return null;
    const pendingStep = steps.find((s) => s.status === 'pending');
    if (!pendingStep || !pendingStep.sla_deadline) return null;

    const deadline = new Date(pendingStep.sla_deadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMs < 0) {
      return { text: `OVERDUE by ${Math.abs(diffHours)}h`, color: '#f5222d', isOverdue: true, sortKey: diffMs };
    }
    if (diffHours <= 4) {
      return { text: `Due in ${diffHours}h`, color: '#faad14', isOverdue: false, sortKey: diffMs };
    }
    return { text: `Due in ${diffHours}h`, color: '#52c41a', isOverdue: false, sortKey: diffMs };
  };

  const getStepProgress = (steps: ApprovalStepData[] | undefined) => {
    if (!steps || steps.length === 0) return null;
    const approved = steps.filter((s) => s.status === 'approved').length;
    return { approved, total: steps.length };
  };

  const getCurrentPendingStep = (steps: ApprovalStepData[] | undefined) => {
    if (!steps) return null;
    return steps.find((s) => s.status === 'pending') || null;
  };

  // Filter and sort
  const adminEmail = getAdminEmail();
  let filteredRequests = [...requests];

  if (myApprovalsOnly) {
    filteredRequests = filteredRequests.filter((cr) => {
      const pendingStep = getCurrentPendingStep(cr.approval_steps);
      return pendingStep && (
        pendingStep.approver_email === adminEmail ||
        !pendingStep.approver_email // role-based, anyone can approve
      );
    });
  }

  // Sort: overdue first, then by SLA deadline ascending
  filteredRequests.sort((a, b) => {
    const slaA = getSlaInfo(a.approval_steps);
    const slaB = getSlaInfo(b.approval_steps);
    const keyA = slaA?.sortKey ?? Infinity;
    const keyB = slaB?.sortKey ?? Infinity;
    return keyA - keyB;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>
          Approval Queue
          <Tag style={{ marginLeft: 8 }}>{filteredRequests.length}</Tag>
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Switch
              size="small"
              checked={myApprovalsOnly}
              onChange={setMyApprovalsOnly}
            />
            <span style={{ fontSize: 13 }}>My Approvals</span>
          </div>
          <Button icon={<RefreshCw size={14} />} onClick={fetchQueue}>Refresh</Button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          <CheckCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>No pending approvals</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRequests.map((cr) => {
            const sla = getSlaInfo(cr.approval_steps);
            const progress = getStepProgress(cr.approval_steps);
            const pendingStep = getCurrentPendingStep(cr.approval_steps);

            return (
              <div
                key={cr.cr_id}
                style={{
                  border: `1px solid ${sla?.isOverdue ? '#ffa39e' : '#e8e8e8'}`,
                  borderRadius: 8,
                  padding: 16,
                  background: sla?.isOverdue ? '#fff2f0' : '#fff',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedRow(expandedRow === cr.cr_id ? null : cr.cr_id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, marginRight: 8 }}>{cr.cr_id}</span>
                    <span>{cr.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {progress && (
                      <Tag color="blue" style={{ fontSize: 11 }}>
                        <Shield size={10} style={{ marginRight: 2 }} />
                        Step {progress.approved + 1}/{progress.total}
                      </Tag>
                    )}
                    {sla && (
                      <Tag
                        color={sla.isOverdue ? 'error' : undefined}
                        style={{ fontSize: 11, color: !sla.isOverdue ? sla.color : undefined }}
                      >
                        {sla.isOverdue && <AlertTriangle size={10} style={{ marginRight: 2 }} />}
                        {!sla.isOverdue && <Clock size={10} style={{ marginRight: 2 }} />}
                        {sla.text}
                      </Tag>
                    )}
                    <Tag color={PRIORITY_COLORS[cr.priority] || 'default'}>{cr.priority}</Tag>
                    <span style={{ color: '#999', fontSize: 12 }}>{formatDate(cr.created_at)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#666', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>Requested by: {cr.requested_by}</span>
                  {cr.department_name && <span>Dept: {cr.department_name}</span>}
                  {pendingStep && (
                    <span>
                      Waiting: {ROLE_LABELS[pendingStep.approver_role] || pendingStep.approver_role}
                      {pendingStep.approver_email && ` (${pendingStep.approver_email})`}
                    </span>
                  )}
                  {cr.case_ids && <span>Cases: {cr.case_ids}</span>}
                </div>

                {expandedRow === cr.cr_id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                    {cr.description && (
                      <p style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{cr.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        type="primary"
                        icon={<CheckCircle size={14} />}
                        loading={actionLoading === cr.cr_id}
                        onClick={(e) => { e.stopPropagation(); handleApprove(cr.cr_id); }}
                      >
                        Approve
                      </Button>
                      <Button
                        danger
                        icon={<XCircle size={14} />}
                        loading={actionLoading === cr.cr_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectModalCrId(cr.cr_id);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title={
          <span>
            <AlertTriangle size={16} style={{ marginRight: 8, color: '#faad14' }} />
            Reject {rejectModalCrId}
          </span>
        }
        open={!!rejectModalCrId}
        onOk={handleReject}
        onCancel={() => { setRejectModalCrId(null); setRejectReason(''); }}
        okText="Reject"
        okButtonProps={{ danger: true, loading: !!actionLoading }}
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

export default ApprovalQueue;
