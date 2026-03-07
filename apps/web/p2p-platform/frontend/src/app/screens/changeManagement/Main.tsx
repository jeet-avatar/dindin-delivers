import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Select, Spin, Pagination, Input, message, Button, Modal, Table } from 'antd';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import RequestForm from './RequestForm';
import ApprovalQueue from './ApprovalQueue';
import AuditLog from './AuditLog';

// ==================== Types ====================

interface ChangeRequest {
  cr_id: string;
  title: string;
  status: string;
  change_type: string;
  priority: string;
  department_name: string | null;
  requested_by: string;
  created_at: string | null;
}

interface DepartmentOption {
  id: number;
  name: string;
}

interface ApprovalRule {
  id: number;
  department_id: number;
  department_name: string | null;
  priority: string | null;
  step_order: number;
  approver_role: string;
  approver_email: string | null;
  sla_hours: number;
}

interface Delegation {
  id: number;
  delegator_email: string;
  delegate_email: string;
  department_id: number | null;
  active_from: string | null;
  active_until: string | null;
  reason: string | null;
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

const ALL_STATUSES = Object.keys(STATUS_COLORS);

const CHANGE_TYPES = ['code', 'config', 'docs', 'infrastructure', 'manual'];

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'default',
  Medium: 'blue',
  High: 'orange',
  Critical: 'red',
};

// ==================== Tab Labels ====================

type TabKey = 'requests' | 'new' | 'approvals' | 'audit' | 'rules';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'requests', label: 'All Requests', icon: <ClipboardList size={14} /> },
  { key: 'new', label: 'New Request', icon: <Plus size={14} /> },
  { key: 'approvals', label: 'Approvals', icon: <CheckCircle size={14} /> },
  { key: 'audit', label: 'Audit Log', icon: <Clock size={14} /> },
  { key: 'rules', label: 'Approval Rules', icon: <Shield size={14} /> },
];

// ==================== Main Component ====================

const ChangeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('requests');

  // Request list state
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterDepartment, setFilterDepartment] = useState<number | undefined>(undefined);
  const [filterChangeType, setFilterChangeType] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  // Departments
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };
      if (filterStatus) params.status = filterStatus;
      if (filterDepartment) params.department_id = filterDepartment;
      if (filterChangeType) params.change_type = filterChangeType;

      const res = await api.get('/admin/change-requests/', { params });
      const data = res.data;
      setRequests(data?.items || []);
      setTotal(data?.total || 0);
    } catch {
      message.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus, filterDepartment, filterChangeType]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/admin/departments');
      setDepartments((res.data || []).map((d: { id: number; name: string }) => ({
        id: d.id,
        name: d.name,
      })));
    } catch {
      // Departments may not exist
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  // Filter requests by search text client-side
  const filteredRequests = searchText
    ? requests.filter((r) =>
        r.cr_id.toLowerCase().includes(searchText.toLowerCase()) ||
        r.title.toLowerCase().includes(searchText.toLowerCase())
      )
    : requests;

  // ==================== Render ====================

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: 24 }}>
        <ClipboardList size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Change Management
      </h2>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid #e8e8e8', marginBottom: 24,
      }}>
        {TABS.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid #1890ff' : '2px solid transparent',
              color: activeTab === tab.key ? '#1890ff' : '#666',
              fontWeight: activeTab === tab.key ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {tab.icon}
            {tab.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'requests' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input
              prefix={<Search size={14} />}
              placeholder="Search CR ID or title"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              placeholder="Status"
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setPage(1); }}
              allowClear
              style={{ width: 160 }}
              options={ALL_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              placeholder="Department"
              value={filterDepartment}
              onChange={(v) => { setFilterDepartment(v); setPage(1); }}
              allowClear
              style={{ width: 180 }}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Select
              placeholder="Change Type"
              value={filterChangeType}
              onChange={(v) => { setFilterChangeType(v); setPage(1); }}
              allowClear
              style={{ width: 160 }}
              options={CHANGE_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            />
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={fetchRequests}
                style={{
                  background: 'none', border: '1px solid #d9d9d9', borderRadius: 6,
                  padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e8e8e8', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>CR ID</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Title</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Priority</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Department</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Requested By</th>
                      <th style={{ padding: '10px 12px', fontSize: 12, color: '#999', fontWeight: 600 }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((cr) => (
                      <tr
                        key={cr.cr_id}
                        onClick={() => navigate(`/admin/change-management/${cr.cr_id}`)}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{cr.cr_id}</td>
                        <td style={{ padding: '10px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cr.title}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Tag color={STATUS_COLORS[cr.status] || 'default'}>{cr.status}</Tag>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>
                          {cr.change_type}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Tag color={PRIORITY_COLORS[cr.priority] || 'default'}>{cr.priority}</Tag>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>
                          {cr.department_name || '-'}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13 }}>
                          {cr.requested_by}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#999' }}>
                          {formatDate(cr.created_at)}
                        </td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#999' }}>
                          No change requests found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {total > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={total}
                    onChange={(p) => setPage(p)}
                    showSizeChanger={false}
                    showTotal={(t) => `${t} total`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'new' && (
        <RequestForm onSuccess={() => { setActiveTab('requests'); fetchRequests(); }} />
      )}

      {activeTab === 'approvals' && <ApprovalQueue />}

      {activeTab === 'audit' && <AuditLog />}

      {activeTab === 'rules' && (
        <ApprovalRulesTab departments={departments} />
      )}
    </div>
  );
};

// ==================== Approval Rules Tab ====================

const ApprovalRulesTab: React.FC<{ departments: DepartmentOption[] }> = ({ departments }) => {
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<number | undefined>(undefined);
  const [addRuleModalOpen, setAddRuleModalOpen] = useState(false);
  const [addDelegationModalOpen, setAddDelegationModalOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (selectedDept) params.department_id = selectedDept;
      const res = await api.get('/admin/approval-chain-rules', { params });
      setRules(res.data || []);
    } catch {
      message.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  const fetchDelegations = useCallback(async () => {
    try {
      const res = await api.get('/admin/approval-delegations');
      setDelegations(res.data || []);
    } catch {
      // Not blocking
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchDelegations();
  }, [fetchRules, fetchDelegations]);

  const handleDeleteRule = async (ruleId: number) => {
    try {
      await api.delete(`/admin/approval-chain-rules/${ruleId}`);
      message.success('Rule deleted');
      fetchRules();
    } catch {
      message.error('Failed to delete rule');
    }
  };

  const handleDeleteDelegation = async (delegationId: number) => {
    try {
      await api.delete(`/admin/approval-delegations/${delegationId}`);
      message.success('Delegation deleted');
      fetchDelegations();
    } catch {
      message.error('Failed to delete delegation');
    }
  };

  const handleAddRule = async (values: Record<string, unknown>) => {
    try {
      await api.post('/admin/approval-chain-rules', values);
      message.success('Rule created');
      setAddRuleModalOpen(false);
      fetchRules();
    } catch {
      message.error('Failed to create rule');
    }
  };

  const handleAddDelegation = async (values: Record<string, unknown>) => {
    try {
      await api.post('/admin/approval-delegations', values);
      message.success('Delegation created');
      setAddDelegationModalOpen(false);
      fetchDelegations();
    } catch {
      message.error('Failed to create delegation');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div>
      {/* Approval Chain Rules */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            <Shield size={16} style={{ marginRight: 8 }} />
            Approval Chain Rules
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select
              placeholder="Filter by Department"
              value={selectedDept}
              onChange={setSelectedDept}
              allowClear
              style={{ width: 200 }}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Button type="primary" onClick={() => setAddRuleModalOpen(true)}>Add Rule</Button>
          </div>
        </div>

        {loading ? (
          <Spin />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e8e8e8', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Department</th>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Priority Filter</th>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Step</th>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Approver Role</th>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Approver Email</th>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>SLA (hours)</th>
                <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{rule.department_name || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {rule.priority ? (
                      <Tag color={PRIORITY_COLORS[rule.priority] || 'default'}>{rule.priority}</Tag>
                    ) : (
                      <Tag>All</Tag>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{rule.step_order}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{rule.approver_role}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{rule.approver_email || '-'}</td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>{rule.sla_hours}h</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={14} />}
                      onClick={() => handleDeleteRule(rule.id)}
                    />
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                    No approval rules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delegations */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            <Users size={16} style={{ marginRight: 8 }} />
            Active Delegations
          </h3>
          <Button onClick={() => setAddDelegationModalOpen(true)}>Add Delegation</Button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e8e8e8', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Delegator</th>
              <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Delegate</th>
              <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Active From</th>
              <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Active Until</th>
              <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Reason</th>
              <th style={{ padding: '8px 12px', fontSize: 12, color: '#999' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {delegations.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{d.delegator_email}</td>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{d.delegate_email}</td>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{formatDate(d.active_from)}</td>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{formatDate(d.active_until)}</td>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{d.reason || '-'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<Trash2 size={14} />}
                    onClick={() => handleDeleteDelegation(d.id)}
                  />
                </td>
              </tr>
            ))}
            {delegations.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                  No active delegations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Rule Modal */}
      <AddRuleModal
        open={addRuleModalOpen}
        departments={departments}
        onCancel={() => setAddRuleModalOpen(false)}
        onSubmit={handleAddRule}
      />

      {/* Add Delegation Modal */}
      <AddDelegationModal
        open={addDelegationModalOpen}
        onCancel={() => setAddDelegationModalOpen(false)}
        onSubmit={handleAddDelegation}
      />
    </div>
  );
};

// ==================== Add Rule Modal ====================

const AddRuleModal: React.FC<{
  open: boolean;
  departments: DepartmentOption[];
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}> = ({ open, departments, onCancel, onSubmit }) => {
  const [deptId, setDeptId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<string | undefined>(undefined);
  const [stepOrder, setStepOrder] = useState(1);
  const [approverRole, setApproverRole] = useState('dept_lead');
  const [approverEmail, setApproverEmail] = useState('');
  const [slaHours, setSlaHours] = useState(24);

  const handleOk = () => {
    if (!deptId) {
      message.error('Department is required');
      return;
    }
    onSubmit({
      department_id: deptId,
      priority: priority || null,
      step_order: stepOrder,
      approver_role: approverRole,
      approver_email: approverEmail || null,
      sla_hours: slaHours,
    });
    // Reset
    setDeptId(undefined);
    setPriority(undefined);
    setStepOrder(1);
    setApproverRole('dept_lead');
    setApproverEmail('');
    setSlaHours(24);
  };

  return (
    <Modal title="Add Approval Chain Rule" open={open} onOk={handleOk} onCancel={onCancel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Department *</div>
          <Select
            value={deptId}
            onChange={setDeptId}
            placeholder="Select department"
            style={{ width: '100%' }}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Priority Filter (blank = all priorities)</div>
          <Select
            value={priority}
            onChange={setPriority}
            placeholder="All priorities"
            allowClear
            style={{ width: '100%' }}
            options={[
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Step Order</div>
          <Input type="number" value={stepOrder} onChange={(e) => setStepOrder(Number(e.target.value))} min={1} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Approver Role</div>
          <Select
            value={approverRole}
            onChange={setApproverRole}
            style={{ width: '100%' }}
            options={[
              { value: 'dept_lead', label: 'Dept Lead' },
              { value: 'cto', label: 'CTO' },
              { value: 'vp_engineering', label: 'VP Engineering' },
              { value: 'security_lead', label: 'Security Lead' },
            ]}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Approver Email (optional, overrides role)</div>
          <Input value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} placeholder="approver@dollor.ai" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>SLA (hours)</div>
          <Input type="number" value={slaHours} onChange={(e) => setSlaHours(Number(e.target.value))} min={1} />
        </div>
      </div>
    </Modal>
  );
};

// ==================== Add Delegation Modal ====================

const AddDelegationModal: React.FC<{
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}> = ({ open, onCancel, onSubmit }) => {
  const [delegatorEmail, setDelegatorEmail] = useState('');
  const [delegateEmail, setDelegateEmail] = useState('');
  const [reason, setReason] = useState('');

  const handleOk = () => {
    if (!delegatorEmail || !delegateEmail) {
      message.error('Both emails are required');
      return;
    }
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    onSubmit({
      delegator_email: delegatorEmail,
      delegate_email: delegateEmail,
      active_from: now.toISOString(),
      active_until: weekLater.toISOString(),
      reason: reason || null,
    });
    setDelegatorEmail('');
    setDelegateEmail('');
    setReason('');
  };

  return (
    <Modal title="Add Approval Delegation" open={open} onOk={handleOk} onCancel={onCancel}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Delegator Email (who is OOO) *</div>
          <Input value={delegatorEmail} onChange={(e) => setDelegatorEmail(e.target.value)} placeholder="lead@dollor.ai" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Delegate Email (who approves instead) *</div>
          <Input value={delegateEmail} onChange={(e) => setDelegateEmail(e.target.value)} placeholder="backup@dollor.ai" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Reason (optional)</div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="OOO vacation" />
        </div>
        <div style={{ fontSize: 11, color: '#999' }}>
          Delegation will be active for 7 days from now.
        </div>
      </div>
    </Modal>
  );
};

export default ChangeManagement;
