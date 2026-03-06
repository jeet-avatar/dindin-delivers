import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle,
  Rocket,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  Database,
  GitCommit,
  Link,
  AlertTriangle,
  FileText,
  Download,
  Users,
  BarChart3,
  Plus,
  Trash2,
  Edit3,
  Zap,
  Building2,
  UserPlus,
  Settings,
} from 'lucide-react';
import { Spin, message, Select, Input, Tag, Pagination, Modal } from 'antd';
import api from '../../api/api';

// ==================== Types ====================

interface ProjectCase {
  id: number;
  case_id: string;
  name: string;
  full_path: string;
  category: string;
  subcategory: string | null;
  test_type: string;
  status: string;
  priority: string;
  platform: string | null;
  version_introduced: string | null;
  build_number: string | null;
  release_notes: string | null;
  reason: string | null;
  commit_ref: string | null;
  dependencies: string | null;
  impact_analysis: string | null;
  last_activity: string | null;
  department_id: number | null;
  department_name: string | null;
  department_color: string | null;
  assigned_to: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  by_test_type: Record<string, number>;
  by_platform?: Record<string, number>;
  categories: string[];
  test_types: string[];
  platforms?: string[];
}

interface Filters {
  search: string;
  status: string;
  priority: string;
  category: string;
  test_type: string;
  platform: string;
  department_id: string;
}

interface DepartmentInfo {
  id: number;
  code: string;
  name: string;
  description: string | null;
  lead_name: string | null;
  lead_email: string | null;
  color: string | null;
  case_count: number;
  member_count: number;
  rule_count: number;
  created_at: string | null;
}

interface TeamMemberInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number;
}

interface AssignmentRuleInfo {
  id: number;
  department_id: number;
  department_name: string | null;
  match_field: string;
  match_pattern: string;
  priority: number;
}

interface DashboardData {
  total_cases: number;
  unassigned: number;
  departments: {
    id: number;
    code: string;
    name: string;
    color: string | null;
    lead_name: string | null;
    lead_email: string | null;
    total: number;
    by_status: Record<string, number>;
    member_count: number;
  }[];
}

// ==================== Constants ====================

const STATUS_OPTIONS = ['Open', 'In Progress', 'Verified', 'Released'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const ROLE_OPTIONS = ['engineer', 'qa', 'lead', 'manager'];
const MATCH_FIELD_OPTIONS = ['category', 'platform', 'test_type', 'name'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Open': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Verified': { bg: 'bg-green-100', text: 'text-green-700' },
  'Released': { bg: 'bg-purple-100', text: 'text-purple-700' },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  'Critical': { bg: 'bg-red-100', text: 'text-red-700' },
  'High': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Medium': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Low': { bg: 'bg-green-100', text: 'text-green-700' },
};

const TEST_TYPE_COLORS: Record<string, string> = {
  'unit': 'blue', 'integration': 'purple', 'e2e': 'green', 'smoke': 'orange', 'api': 'cyan', 'other': 'default',
};

const PLATFORM_COLORS: Record<string, string> = {
  'backend': 'blue', 'ios': 'geekblue', 'android': 'green', 'microservice': 'purple', 'frontend': 'orange',
};

// ==================== Main Component ====================

const ProjectTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cases' | 'departments' | 'dashboard'>('cases');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Project Tracker</h1>
          <p className="text-sm text-neutral-500 mt-1">Department management & case tracking</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          {[
            { key: 'cases' as const, label: 'Cases', icon: <ClipboardList className="h-4 w-4" /> },
            { key: 'departments' as const, label: 'Departments', icon: <Building2 className="h-4 w-4" /> },
            { key: 'dashboard' as const, label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'cases' && <CasesTab />}
      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'dashboard' && <DashboardTab />}
    </div>
  );
};

// ==================== Cases Tab ====================

function CasesTab() {
  const [cases, setCases] = useState<ProjectCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '', status: '', priority: '', category: '', test_type: '', platform: '', department_id: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ caseId: string; field: string } | null>(null);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editForm, setEditForm] = useState({
    version_introduced: '', build_number: '', release_notes: '', reason: '', commit_ref: '', dependencies: '', impact_analysis: '',
  });
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: pageSize };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.test_type) params.test_type = filters.test_type;
      if (filters.search) params.search = filters.search;
      if (filters.platform) params.platform = filters.platform;
      if (filters.department_id) params.department_id = filters.department_id;
      if (sortBy) { params.sort_by = sortBy; params.sort_order = sortOrder; }
      const response = await api.get('/admin/project-cases/', { params });
      setCases(response.data.items);
      setTotal(response.data.total);
      setCategories(response.data.categories || []);
      setTestTypes(response.data.test_types || []);
      setPlatforms(response.data.platforms || []);
    } catch { message.error('Failed to load project cases'); }
    finally { setLoading(false); }
  }, [page, pageSize, filters, sortBy, sortOrder]);

  const fetchStats = useCallback(async () => {
    try { const r = await api.get('/admin/project-cases/stats'); setStats(r.data); } catch {}
  }, []);

  const fetchDepts = useCallback(async () => {
    try { const r = await api.get('/admin/departments/'); setDepartments(r.data); } catch {}
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { fetchStats(); fetchDepts(); }, [fetchStats, fetchDepts]);

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setFilters(p => ({ ...p, search: value })); setPage(1); }, 300);
  };

  const handleFilterChange = (field: keyof Filters, value: string) => { setFilters(p => ({ ...p, [field]: value })); setPage(1); };
  const clearFilters = () => { setFilters({ search: '', status: '', priority: '', category: '', test_type: '', platform: '', department_id: '' }); setPage(1); };

  const handleSort = (column: string) => {
    if (sortBy === column) { sortOrder === 'asc' ? setSortOrder('desc') : (setSortBy(''), setSortOrder('asc')); }
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const r = await api.get('/admin/project-cases/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'project-cases.csv'; a.click(); URL.revokeObjectURL(url);
    } catch { message.error('Failed to export CSV'); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try { const r = await api.post('/admin/project-cases/seed'); message.success(`Seeded ${r.data.seeded || 'all'} cases`); fetchCases(); fetchStats(); }
    catch { message.error('Failed to seed'); }
    finally { setSeeding(false); }
  };

  const handleInlineUpdate = async (caseId: string, field: string, value: string) => {
    try {
      await api.put(`/admin/project-cases/${caseId}`, { [field]: value });
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, [field]: value } : c));
      setEditingCell(null); message.success(`Updated ${field}`); fetchStats();
    } catch { message.error('Failed to update'); }
  };

  const handleExpandedSave = async (caseId: string) => {
    try {
      await api.put(`/admin/project-cases/${caseId}`, editForm);
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, ...editForm } : c));
      message.success('Case updated');
    } catch { message.error('Failed to update'); }
  };

  const handleBulkUpdate = async (field: string, value: string | number) => {
    if (selectedRows.size === 0) return;
    try {
      await api.put('/admin/project-cases/bulk-update', { case_ids: Array.from(selectedRows), updates: { [field]: value } });
      message.success(`Updated ${selectedRows.size} cases`); setSelectedRows(new Set()); fetchCases(); fetchStats();
    } catch { message.error('Bulk update failed'); }
  };

  const toggleRowSelection = (caseId: string) => { setSelectedRows(prev => { const n = new Set(prev); n.has(caseId) ? n.delete(caseId) : n.add(caseId); return n; }); };
  const toggleSelectAll = () => { selectedRows.size === cases.length ? setSelectedRows(new Set()) : setSelectedRows(new Set(cases.map(c => c.case_id))); };

  const toggleExpanded = (caseId: string) => {
    if (expandedRow === caseId) { setExpandedRow(null); return; }
    setExpandedRow(caseId);
    const c = cases.find(x => x.case_id === caseId);
    if (c) setEditForm({ version_introduced: c.version_introduced || '', build_number: c.build_number || '', release_notes: c.release_notes || '', reason: c.reason || '', commit_ref: c.commit_ref || '', dependencies: c.dependencies || '', impact_analysis: c.impact_analysis || '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  const SORTABLE_COLUMNS = ['case_id', 'name', 'category', 'platform', 'status', 'priority', 'test_type', 'updated_at'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Cases" value={stats.total} icon={<ClipboardList className="h-5 w-5 text-primary-600" />} bgColor="bg-primary-50"
            subtitle={stats.by_platform ? Object.entries(stats.by_platform).sort(([,a],[,b]) => b - a).map(([p,c]) => `${p}: ${c}`).join(' | ') : undefined} />
          <StatsCard title="Open" value={stats.by_status['Open'] || 0} icon={<AlertCircle className="h-5 w-5 text-amber-600" />} bgColor="bg-amber-50" />
          <StatsCard title="In Progress" value={stats.by_status['In Progress'] || 0} icon={<Clock className="h-5 w-5 text-blue-600" />} bgColor="bg-blue-50" />
          <StatsCard title="Verified / Released" value={(stats.by_status['Verified'] || 0) + (stats.by_status['Released'] || 0)} icon={<CheckCircle className="h-5 w-5 text-green-600" />} bgColor="bg-green-50" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="Search cases..." prefix={<Search className="h-4 w-4 text-neutral-400" />} onChange={e => handleSearch(e.target.value)} allowClear />
          </div>
          <Select placeholder="Department" allowClear value={filters.department_id || undefined} onChange={val => handleFilterChange('department_id', val || '')} style={{ width: 180 }}
            options={departments.map(d => ({ label: d.name, value: String(d.id) }))} />
          <Select placeholder="Status" allowClear value={filters.status || undefined} onChange={val => handleFilterChange('status', val || '')} style={{ width: 140 }}
            options={STATUS_OPTIONS.map(s => ({ label: s, value: s }))} />
          <Select placeholder="Priority" allowClear value={filters.priority || undefined} onChange={val => handleFilterChange('priority', val || '')} style={{ width: 140 }}
            options={PRIORITY_OPTIONS.map(p => ({ label: p, value: p }))} />
          <Select placeholder="Platform" allowClear value={filters.platform || undefined} onChange={val => handleFilterChange('platform', val || '')} style={{ width: 140 }}
            options={platforms.map(p => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))} />
          <Select placeholder="Category" allowClear showSearch value={filters.category || undefined} onChange={val => handleFilterChange('category', val || '')} style={{ width: 180 }}
            options={categories.map(c => ({ label: c, value: c }))} />
          <Select placeholder="Test Type" allowClear value={filters.test_type || undefined} onChange={val => handleFilterChange('test_type', val || '')} style={{ width: 140 }}
            options={testTypes.map(t => ({ label: t, value: t }))} />
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center space-x-1 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-md">
              <X className="h-3 w-3" /><span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">{total.toLocaleString()} cases</span>
        <div className="flex items-center space-x-3">
          <button onClick={handleExport} className="flex items-center space-x-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-sm font-medium">
            <Download className="h-4 w-4" /><span>Export CSV</span>
          </button>
          <button onClick={handleSeed} disabled={seeding} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
            {seeding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            <span>{seeding ? 'Seeding...' : 'Seed from Tests'}</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-700">{selectedRows.size} selected</span>
          <div className="flex items-center space-x-3">
            <Select placeholder="Set Status" size="small" style={{ width: 140 }} onChange={val => handleBulkUpdate('status', val)} options={STATUS_OPTIONS.map(s => ({ label: s, value: s }))} />
            <Select placeholder="Set Priority" size="small" style={{ width: 140 }} onChange={val => handleBulkUpdate('priority', val)} options={PRIORITY_OPTIONS.map(p => ({ label: p, value: p }))} />
            <Select placeholder="Assign Dept" size="small" style={{ width: 180 }} onChange={val => handleBulkUpdate('department_id', Number(val))} options={departments.map(d => ({ label: d.name, value: String(d.id) }))} />
            <button onClick={() => setSelectedRows(new Set())} className="text-sm text-neutral-500 hover:text-neutral-700">Deselect</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <Spin spinning={loading}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-3 py-3 text-left w-10">
                    <input type="checkbox" checked={cases.length > 0 && selectedRows.size === cases.length} onChange={toggleSelectAll} className="rounded border-neutral-300" />
                  </th>
                  <th className="px-3 py-3 text-left w-6"></th>
                  {[
                    { key: 'case_id', label: 'Case ID', w: 'w-24' },
                    { key: 'platform', label: 'Platform', w: 'w-24' },
                    { key: '', label: 'Dept', w: 'w-28' },
                    { key: 'name', label: 'Name', w: '' },
                    { key: 'category', label: 'Category', w: 'w-32' },
                    { key: 'test_type', label: 'Type', w: 'w-24' },
                    { key: 'status', label: 'Status', w: 'w-28' },
                    { key: 'priority', label: 'Priority', w: 'w-24' },
                    { key: '', label: 'Assigned', w: 'w-32' },
                    { key: 'updated_at', label: 'Updated', w: 'w-28' },
                  ].map((col, i) => (
                    <th key={i} className={`px-3 py-3 text-left font-medium text-neutral-600 ${col.w} ${col.key && SORTABLE_COLUMNS.includes(col.key) ? 'cursor-pointer select-none hover:text-neutral-900' : ''}`}
                      onClick={() => col.key && SORTABLE_COLUMNS.includes(col.key) && handleSort(col.key)}>
                      <span className="inline-flex items-center gap-1">{col.label} {sortBy === col.key && (sortOrder === 'asc' ? '\u2191' : '\u2193')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <React.Fragment key={c.case_id}>
                    <tr className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${selectedRows.has(c.case_id) ? 'bg-primary-50/50' : ''}`}>
                      <td className="px-3 py-2.5"><input type="checkbox" checked={selectedRows.has(c.case_id)} onChange={() => toggleRowSelection(c.case_id)} className="rounded border-neutral-300" /></td>
                      <td className="px-1 py-2.5">
                        <button onClick={() => toggleExpanded(c.case_id)} className="text-neutral-400 hover:text-neutral-600">
                          {expandedRow === c.case_id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2.5"><span className="font-mono text-primary-600 font-medium text-xs">{c.case_id}</span></td>
                      <td className="px-3 py-2.5"><Tag color={PLATFORM_COLORS[c.platform || 'backend'] || 'default'} className="m-0">{c.platform || 'backend'}</Tag></td>
                      <td className="px-3 py-2.5">
                        {c.department_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: c.department_color || '#6b7280' }}>
                            {c.department_name.length > 15 ? c.department_name.slice(0, 15) + '...' : c.department_name}
                          </span>
                        ) : <span className="text-xs text-neutral-400">Unassigned</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-neutral-800 font-medium">{c.name}</span>
                        {c.subcategory && <span className="text-neutral-400 text-xs ml-2">{c.subcategory}</span>}
                      </td>
                      <td className="px-3 py-2.5"><Tag className="m-0">{c.category}</Tag></td>
                      <td className="px-3 py-2.5"><Tag color={TEST_TYPE_COLORS[c.test_type] || 'default'} className="m-0">{c.test_type}</Tag></td>
                      <td className="px-3 py-2.5">
                        {editingCell?.caseId === c.case_id && editingCell?.field === 'status' ? (
                          <Select size="small" value={c.status} autoFocus open style={{ width: 120 }} onChange={val => handleInlineUpdate(c.case_id, 'status', val)} onBlur={() => setEditingCell(null)} options={STATUS_OPTIONS.map(s => ({ label: s, value: s }))} />
                        ) : (
                          <button onClick={() => setEditingCell({ caseId: c.case_id, field: 'status' })} className="cursor-pointer">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]?.bg || 'bg-neutral-100'} ${STATUS_COLORS[c.status]?.text || 'text-neutral-700'}`}>{c.status}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingCell?.caseId === c.case_id && editingCell?.field === 'priority' ? (
                          <Select size="small" value={c.priority} autoFocus open style={{ width: 110 }} onChange={val => handleInlineUpdate(c.case_id, 'priority', val)} onBlur={() => setEditingCell(null)} options={PRIORITY_OPTIONS.map(p => ({ label: p, value: p }))} />
                        ) : (
                          <button onClick={() => setEditingCell({ caseId: c.case_id, field: 'priority' })} className="cursor-pointer">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[c.priority]?.bg || 'bg-neutral-100'} ${PRIORITY_COLORS[c.priority]?.text || 'text-neutral-700'}`}>{c.priority}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-neutral-500">{c.assigned_to || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-neutral-400">{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '-'}</td>
                    </tr>
                    {expandedRow === c.case_id && (
                      <tr className="bg-neutral-50">
                        <td colSpan={13} className="px-6 py-4">
                          <ExpandedCaseRow c={c} editForm={editForm} setEditForm={setEditForm} onSave={() => handleExpandedSave(c.case_id)} departments={departments}
                            onDeptChange={async (deptId) => { await api.put(`/admin/project-cases/${c.case_id}`, { department_id: deptId }); fetchCases(); message.success('Department updated'); }}
                            onAssigneeChange={async (email) => { await api.put(`/admin/project-cases/${c.case_id}`, { assigned_to: email }); fetchCases(); message.success('Assignee updated'); }} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {cases.length === 0 && !loading && (
                  <tr><td colSpan={13} className="px-6 py-12 text-center text-neutral-400">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No cases found.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
              <span className="text-sm text-neutral-500">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total.toLocaleString()}</span>
              <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger pageSizeOptions={['25', '50', '100', '200']}
                onChange={(p, ps) => { setPage(p); setPageSize(ps); }} size="small" />
            </div>
          )}
        </Spin>
      </div>
    </div>
  );
}

// ==================== Departments Tab ====================

function DepartmentsTab() {
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [rules, setRules] = useState<AssignmentRuleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentInfo | null>(null);
  const [expandedDept, setExpandedDept] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newDept, setNewDept] = useState({ code: '', name: '', description: '', lead_name: '', lead_email: '', color: '#3b82f6' });
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'engineer' });
  const [newRule, setNewRule] = useState({ department_id: 0, match_field: 'category', match_pattern: '', priority: 100 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, rRes] = await Promise.all([api.get('/admin/departments/'), api.get('/admin/departments/rules')]);
      setDepartments(dRes.data);
      setRules(rRes.data);
    } catch { message.error('Failed to load departments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchMembers = async (deptId: number) => {
    try { const r = await api.get(`/admin/departments/${deptId}/members`); setMembers(r.data); } catch {}
  };

  const createDept = async () => {
    try { await api.post('/admin/departments/', newDept); message.success('Department created'); setShowCreateModal(false); setNewDept({ code: '', name: '', description: '', lead_name: '', lead_email: '', color: '#3b82f6' }); fetchAll(); }
    catch (e: any) { message.error(e.response?.data?.detail || 'Failed to create'); }
  };

  const updateDept = async () => {
    if (!editDept) return;
    try { await api.put(`/admin/departments/${editDept.id}`, { name: editDept.name, description: editDept.description, lead_name: editDept.lead_name, lead_email: editDept.lead_email, color: editDept.color }); message.success('Updated'); setEditDept(null); fetchAll(); }
    catch { message.error('Failed to update'); }
  };

  const deleteDept = async (id: number) => {
    try { await api.delete(`/admin/departments/${id}`); message.success('Deleted'); fetchAll(); } catch { message.error('Failed to delete'); }
  };

  const addMember = async (deptId: number) => {
    try { await api.post(`/admin/departments/${deptId}/members`, newMember); message.success('Member added'); setShowAddMember(false); setNewMember({ name: '', email: '', role: 'engineer' }); fetchMembers(deptId); fetchAll(); }
    catch { message.error('Failed to add member'); }
  };

  const removeMember = async (memberId: number, deptId: number) => {
    try { await api.delete(`/admin/departments/members/${memberId}`); message.success('Removed'); fetchMembers(deptId); fetchAll(); } catch { message.error('Failed'); }
  };

  const addRule = async () => {
    try { await api.post('/admin/departments/rules', newRule); message.success('Rule added'); setShowAddRule(false); setNewRule({ department_id: 0, match_field: 'category', match_pattern: '', priority: 100 }); fetchAll(); }
    catch (e: any) { message.error(e.response?.data?.detail || 'Failed'); }
  };

  const deleteRule = async (ruleId: number) => {
    try { await api.delete(`/admin/departments/rules/${ruleId}`); message.success('Rule deleted'); fetchAll(); } catch { message.error('Failed'); }
  };

  return (
    <Spin spinning={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">{departments.length} Departments</h2>
          <div className="flex space-x-3">
            <button onClick={() => setShowAddRule(true)} className="flex items-center space-x-2 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 text-sm font-medium">
              <Settings className="h-4 w-4" /><span>Add Rule</span>
            </button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
              <Plus className="h-4 w-4" /><span>New Department</span>
            </button>
          </div>
        </div>

        {/* Department Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map(d => (
            <div key={d.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: d.color || '#6b7280' }}>
                    {d.code.split('-').map(w => w[0]?.toUpperCase()).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{d.name}</h3>
                    <p className="text-xs text-neutral-500 font-mono">{d.code}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setEditDept(d)} className="text-neutral-400 hover:text-neutral-600"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => deleteDept(d.id)} className="text-neutral-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {d.description && <p className="text-sm text-neutral-600 mt-2">{d.description}</p>}
              <div className="flex items-center space-x-4 mt-3 text-sm text-neutral-500">
                <span className="flex items-center space-x-1"><ClipboardList className="h-3.5 w-3.5" /><span>{d.case_count} cases</span></span>
                <span className="flex items-center space-x-1"><Users className="h-3.5 w-3.5" /><span>{d.member_count} members</span></span>
                <span className="flex items-center space-x-1"><Settings className="h-3.5 w-3.5" /><span>{d.rule_count} rules</span></span>
              </div>
              {d.lead_name && <p className="text-xs text-neutral-400 mt-2">Lead: {d.lead_name} ({d.lead_email})</p>}
              <button onClick={() => { if (expandedDept === d.id) { setExpandedDept(null); } else { setExpandedDept(d.id); fetchMembers(d.id); } }}
                className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
                {expandedDept === d.id ? 'Hide details' : 'Show team & rules'}
              </button>

              {expandedDept === d.id && (
                <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
                  {/* Team Members */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-neutral-400 uppercase">Team Members</h4>
                      <button onClick={() => setShowAddMember(true)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center space-x-1">
                        <UserPlus className="h-3 w-3" /><span>Add</span>
                      </button>
                    </div>
                    {members.length === 0 ? <p className="text-xs text-neutral-400">No members yet</p> : (
                      <div className="space-y-1">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-sm py-1">
                            <div><span className="font-medium text-neutral-700">{m.name}</span> <span className="text-neutral-400">({m.email})</span></div>
                            <div className="flex items-center space-x-2">
                              <Tag className="m-0">{m.role}</Tag>
                              <button onClick={() => removeMember(m.id, d.id)} className="text-neutral-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAddMember && expandedDept === d.id && (
                      <div className="mt-2 p-3 bg-neutral-50 rounded-lg space-y-2">
                        <Input placeholder="Name" size="small" value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} />
                        <Input placeholder="Email" size="small" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} />
                        <Select size="small" value={newMember.role} onChange={val => setNewMember(p => ({ ...p, role: val }))} style={{ width: '100%' }} options={ROLE_OPTIONS.map(r => ({ label: r, value: r }))} />
                        <div className="flex space-x-2">
                          <button onClick={() => addMember(d.id)} className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700">Add</button>
                          <button onClick={() => setShowAddMember(false)} className="px-3 py-1 text-xs text-neutral-500 hover:text-neutral-700">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assignment Rules for this dept */}
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Assignment Rules</h4>
                    {rules.filter(r => r.department_id === d.id).length === 0 ? <p className="text-xs text-neutral-400">No rules</p> : (
                      <div className="space-y-1">
                        {rules.filter(r => r.department_id === d.id).map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs py-1">
                            <div className="font-mono">
                              <Tag color="blue" className="m-0">{r.match_field}</Tag> <span className="text-neutral-600">{r.match_pattern}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-neutral-400">P{r.priority}</span>
                              <button onClick={() => deleteRule(r.id)} className="text-neutral-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Department Modal */}
        <Modal title="Create Department" open={showCreateModal} onOk={createDept} onCancel={() => setShowCreateModal(false)} okText="Create">
          <div className="space-y-3 mt-4">
            <Input placeholder="Code (e.g. backend-platform)" value={newDept.code} onChange={e => setNewDept(p => ({ ...p, code: e.target.value }))} />
            <Input placeholder="Name" value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} />
            <Input.TextArea placeholder="Description" value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description: e.target.value }))} rows={2} />
            <Input placeholder="Lead Name" value={newDept.lead_name} onChange={e => setNewDept(p => ({ ...p, lead_name: e.target.value }))} />
            <Input placeholder="Lead Email" value={newDept.lead_email} onChange={e => setNewDept(p => ({ ...p, lead_email: e.target.value }))} />
            <div className="flex items-center space-x-3">
              <span className="text-sm text-neutral-600">Color:</span>
              <input type="color" value={newDept.color} onChange={e => setNewDept(p => ({ ...p, color: e.target.value }))} className="h-8 w-12 rounded border" />
            </div>
          </div>
        </Modal>

        {/* Edit Department Modal */}
        <Modal title="Edit Department" open={!!editDept} onOk={updateDept} onCancel={() => setEditDept(null)} okText="Save">
          {editDept && (
            <div className="space-y-3 mt-4">
              <Input placeholder="Name" value={editDept.name} onChange={e => setEditDept({ ...editDept, name: e.target.value })} />
              <Input.TextArea placeholder="Description" value={editDept.description || ''} onChange={e => setEditDept({ ...editDept, description: e.target.value })} rows={2} />
              <Input placeholder="Lead Name" value={editDept.lead_name || ''} onChange={e => setEditDept({ ...editDept, lead_name: e.target.value })} />
              <Input placeholder="Lead Email" value={editDept.lead_email || ''} onChange={e => setEditDept({ ...editDept, lead_email: e.target.value })} />
              <div className="flex items-center space-x-3">
                <span className="text-sm text-neutral-600">Color:</span>
                <input type="color" value={editDept.color || '#3b82f6'} onChange={e => setEditDept({ ...editDept, color: e.target.value })} className="h-8 w-12 rounded border" />
              </div>
            </div>
          )}
        </Modal>

        {/* Add Rule Modal */}
        <Modal title="Add Assignment Rule" open={showAddRule} onOk={addRule} onCancel={() => setShowAddRule(false)} okText="Add Rule">
          <div className="space-y-3 mt-4">
            <Select placeholder="Department" value={newRule.department_id || undefined} onChange={val => setNewRule(p => ({ ...p, department_id: val }))} style={{ width: '100%' }}
              options={departments.map(d => ({ label: d.name, value: d.id }))} />
            <Select placeholder="Match Field" value={newRule.match_field} onChange={val => setNewRule(p => ({ ...p, match_field: val }))} style={{ width: '100%' }}
              options={MATCH_FIELD_OPTIONS.map(f => ({ label: f, value: f }))} />
            <Input placeholder="Match Pattern (regex, e.g. ^test_auth)" value={newRule.match_pattern} onChange={e => setNewRule(p => ({ ...p, match_pattern: e.target.value }))} />
            <Input placeholder="Priority (lower = first)" type="number" value={newRule.priority} onChange={e => setNewRule(p => ({ ...p, priority: parseInt(e.target.value) || 100 }))} />
            <p className="text-xs text-neutral-400">Rules are evaluated in priority order. The first matching rule assigns the case to that department.</p>
          </div>
        </Modal>
      </div>
    </Spin>
  );
}

// ==================== Dashboard Tab ====================

function DashboardTab() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/admin/departments/dashboard'); setDashboard(r.data); }
    catch { message.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      const r = await api.post('/admin/departments/auto-assign');
      message.success(`Assigned ${r.data.assigned} cases. ${r.data.still_unassigned} still unassigned.`);
      fetchDashboard();
    } catch (e: any) { message.error(e.response?.data?.detail || 'Auto-assign failed'); }
    finally { setAssigning(false); }
  };

  if (!dashboard) return <Spin spinning={loading}><div className="h-48" /></Spin>;

  const maxCases = Math.max(...dashboard.departments.map(d => d.total), 1);

  return (
    <Spin spinning={loading}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard title="Total Cases" value={dashboard.total_cases} icon={<ClipboardList className="h-5 w-5 text-primary-600" />} bgColor="bg-primary-50" />
          <StatsCard title="Assigned" value={dashboard.total_cases - dashboard.unassigned} icon={<CheckCircle className="h-5 w-5 text-green-600" />} bgColor="bg-green-50" />
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Unassigned</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{dashboard.unassigned}</p>
              </div>
              <button onClick={handleAutoAssign} disabled={assigning || dashboard.unassigned === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">
                {assigning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                <span>{assigning ? 'Assigning...' : 'Auto-Assign'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Department Workload Bars */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Department Workload</h3>
          <div className="space-y-4">
            {dashboard.departments.sort((a, b) => b.total - a.total).map(d => (
              <div key={d.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color || '#6b7280' }} />
                    <span className="text-sm font-medium text-neutral-700">{d.name}</span>
                    {d.lead_name && <span className="text-xs text-neutral-400">({d.lead_name})</span>}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-neutral-500">
                    <span>{d.total} cases</span>
                    <span>{d.member_count} members</span>
                  </div>
                </div>
                <div className="h-6 bg-neutral-100 rounded-full overflow-hidden flex">
                  {['Open', 'In Progress', 'Verified', 'Released'].map(status => {
                    const count = d.by_status[status] || 0;
                    if (count === 0) return null;
                    const pct = (count / dashboard.total_cases) * 100;
                    const colors: Record<string, string> = { 'Open': '#f59e0b', 'In Progress': '#3b82f6', 'Verified': '#10b981', 'Released': '#8b5cf6' };
                    return <div key={status} style={{ width: `${pct}%`, backgroundColor: colors[status] }} className="h-full" title={`${status}: ${count}`} />;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-4 mt-4 text-xs text-neutral-500">
            {['Open', 'In Progress', 'Verified', 'Released'].map(s => (
              <span key={s} className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: { 'Open': '#f59e0b', 'In Progress': '#3b82f6', 'Verified': '#10b981', 'Released': '#8b5cf6' }[s] }} />
                <span>{s}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Department</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-600">Lead</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Total</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Open</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">In Progress</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Verified</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Released</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-600">Members</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.departments.sort((a, b) => b.total - a.total).map(d => (
                <tr key={d.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color || '#6b7280' }} />
                      <span className="font-medium text-neutral-800">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{d.lead_name || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{d.total}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{d.by_status['Open'] || 0}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{d.by_status['In Progress'] || 0}</td>
                  <td className="px-4 py-3 text-right text-green-600">{d.by_status['Verified'] || 0}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{d.by_status['Released'] || 0}</td>
                  <td className="px-4 py-3 text-right">{d.member_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Spin>
  );
}

// ==================== Sub-components ====================

function StatsCard({ title, value, icon, bgColor, subtitle }: { title: string; value: number; icon: React.ReactNode; bgColor: string; subtitle?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`h-10 w-10 rounded-full ${bgColor} flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  );
}

function ExpandedCaseRow({ c, editForm, setEditForm, onSave, departments, onDeptChange, onAssigneeChange }: {
  c: ProjectCase;
  editForm: any;
  setEditForm: (fn: any) => void;
  onSave: () => void;
  departments: DepartmentInfo[];
  onDeptChange: (deptId: number) => void;
  onAssigneeChange: (email: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Assignment */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Assignment</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase">Department</label>
            <Select value={c.department_id || undefined} onChange={val => onDeptChange(val)} placeholder="Select department" style={{ width: '100%' }} className="mt-1"
              options={departments.map(d => ({ label: d.name, value: d.id }))} allowClear onClear={() => onDeptChange(0)} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase">Assigned To</label>
            <Input value={c.assigned_to || ''} placeholder="email@example.com" className="mt-1"
              onPressEnter={e => onAssigneeChange((e.target as HTMLInputElement).value)}
              onBlur={e => { if (e.target.value !== (c.assigned_to || '')) onAssigneeChange(e.target.value); }} />
          </div>
        </div>
      </div>

      {/* Context & Lineage */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Context & Lineage</h4>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 uppercase"><FileText className="h-3.5 w-3.5" />Reason / Context</label>
          <textarea value={editForm.reason} onChange={e => setEditForm((p: any) => ({ ...p, reason: e.target.value }))} placeholder="Why was this built?" rows={2}
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 uppercase"><GitCommit className="h-3.5 w-3.5" />Commit Reference</label>
          <input type="text" value={editForm.commit_ref} onChange={e => setEditForm((p: any) => ({ ...p, commit_ref: e.target.value }))} placeholder="e.g. abc123"
            className="mt-1 w-full px-3 py-1.5 text-sm font-mono border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500 uppercase">Full Path</label>
          <p className="font-mono text-xs text-neutral-600 mt-1 bg-neutral-100 px-3 py-2 rounded">{c.full_path}</p>
        </div>
      </div>

      {/* Dependencies & Impact */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dependencies & Impact</h4>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 uppercase"><Link className="h-3.5 w-3.5" />Dependencies</label>
          <textarea value={editForm.dependencies} onChange={e => setEditForm((p: any) => ({ ...p, dependencies: e.target.value }))} placeholder="What does this depend on?" rows={2}
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 uppercase"><AlertTriangle className="h-3.5 w-3.5" />Impact Analysis</label>
          <textarea value={editForm.impact_analysis} onChange={e => setEditForm((p: any) => ({ ...p, impact_analysis: e.target.value }))} placeholder="What breaks if changed?" rows={3}
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
      </div>

      {/* Release Info + Save */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Release Info</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase">Version</label>
            <input type="text" value={editForm.version_introduced} onChange={e => setEditForm((p: any) => ({ ...p, version_introduced: e.target.value }))} placeholder="e.g. v1.0"
              className="mt-1 w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase">Build Number</label>
            <input type="text" value={editForm.build_number} onChange={e => setEditForm((p: any) => ({ ...p, build_number: e.target.value }))} placeholder="e.g. 1110"
              className="mt-1 w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div className="flex items-end">
            <button onClick={onSave} className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors">Save</button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-500 uppercase">Release Notes</label>
          <textarea value={editForm.release_notes} onChange={e => setEditForm((p: any) => ({ ...p, release_notes: e.target.value }))} placeholder="Add release notes..." rows={3}
            className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
      </div>

      {c.last_activity && (
        <div className="mt-3 pt-3 border-t border-neutral-200">
          <p className="text-xs text-neutral-400"><Clock className="h-3 w-3 inline mr-1" />Last Activity: {c.last_activity}</p>
        </div>
      )}
    </div>
  );
}

export default ProjectTracker;
