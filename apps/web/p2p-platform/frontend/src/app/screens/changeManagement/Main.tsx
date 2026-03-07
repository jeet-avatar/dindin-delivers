import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Select, Spin, Pagination, Input, message } from 'antd';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
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

type TabKey = 'requests' | 'new' | 'approvals' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'requests', label: 'All Requests', icon: <ClipboardList size={14} /> },
  { key: 'new', label: 'New Request', icon: <Plus size={14} /> },
  { key: 'approvals', label: 'Approvals', icon: <CheckCircle size={14} /> },
  { key: 'audit', label: 'Audit Log', icon: <Clock size={14} /> },
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
    </div>
  );
};

export default ChangeManagement;
