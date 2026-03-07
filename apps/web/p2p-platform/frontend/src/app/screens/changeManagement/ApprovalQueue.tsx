import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Button, Modal, Input, message, Spin } from 'antd';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../api/api';

const { TextArea } = Input;

interface ChangeRequest {
  cr_id: string;
  title: string;
  description: string | null;
  priority: string;
  requested_by: string;
  created_at: string | null;
  case_ids: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Critical: 'red',
};

const ApprovalQueue: React.FC = () => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalCrId, setRejectModalCrId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
      setRequests(res.data?.items || []);
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
          <Tag style={{ marginLeft: 8 }}>{requests.length}</Tag>
        </h3>
        <Button icon={<RefreshCw size={14} />} onClick={fetchQueue}>Refresh</Button>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          <CheckCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>No pending approvals</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((cr) => (
            <div
              key={cr.cr_id}
              style={{
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: 16,
                background: '#fff',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedRow(expandedRow === cr.cr_id ? null : cr.cr_id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{cr.cr_id}</span>
                  <span>{cr.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag color={PRIORITY_COLORS[cr.priority] || 'default'}>{cr.priority}</Tag>
                  <span style={{ color: '#999', fontSize: 12 }}>{formatDate(cr.created_at)}</span>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Requested by: {cr.requested_by}
                {cr.case_ids && <span style={{ marginLeft: 12 }}>Cases: {cr.case_ids}</span>}
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
          ))}
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
