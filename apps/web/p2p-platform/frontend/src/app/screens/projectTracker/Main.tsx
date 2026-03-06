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
} from 'lucide-react';
import { Spin, message, Select, Input, Tag, Pagination } from 'antd';
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
  version_introduced: string | null;
  build_number: string | null;
  release_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  by_test_type: Record<string, number>;
  categories: string[];
  test_types: string[];
}

interface Filters {
  search: string;
  status: string;
  priority: string;
  category: string;
  test_type: string;
}

// ==================== Constants ====================

const STATUS_OPTIONS = ['Open', 'In Progress', 'Verified', 'Released'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

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
  'unit': 'blue',
  'integration': 'purple',
  'e2e': 'green',
  'smoke': 'orange',
  'api': 'cyan',
  'other': 'default',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Open': <AlertCircle className="h-5 w-5 text-amber-500" />,
  'In Progress': <Clock className="h-5 w-5 text-blue-500" />,
  'Verified': <CheckCircle className="h-5 w-5 text-green-500" />,
  'Released': <Rocket className="h-5 w-5 text-purple-500" />,
};

// ==================== Component ====================

const ProjectTracker: React.FC = () => {
  const [cases, setCases] = useState<ProjectCase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    priority: '',
    category: '',
    test_type: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [testTypes, setTestTypes] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ caseId: string; field: string } | null>(null);

  // Expanded row edit state
  const [editForm, setEditForm] = useState<{
    version_introduced: string;
    build_number: string;
    release_notes: string;
  }>({ version_introduced: '', build_number: '', release_notes: '' });

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==================== Fetch Functions ====================

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.test_type) params.test_type = filters.test_type;
      if (filters.search) params.search = filters.search;

      const response = await api.get('/admin/project-cases/', { params });
      setCases(response.data.items);
      setTotal(response.data.total);
      setCategories(response.data.categories || []);
      setTestTypes(response.data.test_types || []);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      message.error('Failed to load project cases');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/project-cases/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ==================== Handlers ====================

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
      setPage(1);
    }, 300);
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', priority: '', category: '', test_type: '' });
    setPage(1);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const response = await api.post('/admin/project-cases/seed');
      message.success(`Seeded ${response.data.seeded} cases, skipped ${response.data.skipped}`);
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Seed failed:', error);
      message.error('Failed to seed project cases');
    } finally {
      setSeeding(false);
    }
  };

  const handleInlineUpdate = async (caseId: string, field: string, value: string) => {
    try {
      await api.put(`/admin/project-cases/${caseId}`, { [field]: value });
      setCases((prev) =>
        prev.map((c) => (c.case_id === caseId ? { ...c, [field]: value } : c))
      );
      setEditingCell(null);
      message.success(`Updated ${field}`);
      fetchStats();
    } catch (error) {
      console.error('Update failed:', error);
      message.error('Failed to update');
    }
  };

  const handleExpandedSave = async (caseId: string) => {
    try {
      await api.put(`/admin/project-cases/${caseId}`, editForm);
      setCases((prev) =>
        prev.map((c) =>
          c.case_id === caseId
            ? { ...c, ...editForm }
            : c
        )
      );
      message.success('Case updated');
    } catch (error) {
      console.error('Update failed:', error);
      message.error('Failed to update');
    }
  };

  const handleBulkUpdate = async (field: 'status' | 'priority', value: string) => {
    if (selectedRows.size === 0) return;
    try {
      await api.put('/admin/project-cases/bulk-update', {
        case_ids: Array.from(selectedRows),
        updates: { [field]: value },
      });
      message.success(`Updated ${selectedRows.size} cases`);
      setSelectedRows(new Set());
      fetchCases();
      fetchStats();
    } catch (error) {
      console.error('Bulk update failed:', error);
      message.error('Bulk update failed');
    }
  };

  const toggleRowSelection = (caseId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === cases.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(cases.map((c) => c.case_id)));
    }
  };

  const toggleExpanded = (caseId: string) => {
    if (expandedRow === caseId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(caseId);
      const c = cases.find((x) => x.case_id === caseId);
      if (c) {
        setEditForm({
          version_introduced: c.version_introduced || '',
          build_number: c.build_number || '',
          release_notes: c.release_notes || '',
        });
      }
    }
  };

  const hasActiveFilters =
    filters.search || filters.status || filters.priority || filters.category || filters.test_type;

  // ==================== Render ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Project Tracker</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {total.toLocaleString()} test cases tracked
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {seeding ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span>{seeding ? 'Seeding...' : 'Seed from Tests'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Cases"
            value={stats.total}
            icon={<ClipboardList className="h-5 w-5 text-primary-600" />}
            bgColor="bg-primary-50"
          />
          <StatsCard
            title="Open"
            value={stats.by_status['Open'] || 0}
            icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
            bgColor="bg-amber-50"
          />
          <StatsCard
            title="In Progress"
            value={stats.by_status['In Progress'] || 0}
            icon={<Clock className="h-5 w-5 text-blue-600" />}
            bgColor="bg-blue-50"
          />
          <StatsCard
            title="Verified / Released"
            value={(stats.by_status['Verified'] || 0) + (stats.by_status['Released'] || 0)}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            bgColor="bg-green-50"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search cases..."
              prefix={<Search className="h-4 w-4 text-neutral-400" />}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </div>
          <Select
            placeholder="Status"
            allowClear
            value={filters.status || undefined}
            onChange={(val) => handleFilterChange('status', val || '')}
            style={{ width: 140 }}
            options={STATUS_OPTIONS.map((s) => ({ label: s, value: s }))}
          />
          <Select
            placeholder="Priority"
            allowClear
            value={filters.priority || undefined}
            onChange={(val) => handleFilterChange('priority', val || '')}
            style={{ width: 140 }}
            options={PRIORITY_OPTIONS.map((p) => ({ label: p, value: p }))}
          />
          <Select
            placeholder="Category"
            allowClear
            showSearch
            value={filters.category || undefined}
            onChange={(val) => handleFilterChange('category', val || '')}
            style={{ width: 180 }}
            options={categories.map((c) => ({ label: c, value: c }))}
          />
          <Select
            placeholder="Test Type"
            allowClear
            value={filters.test_type || undefined}
            onChange={(val) => handleFilterChange('test_type', val || '')}
            style={{ width: 140 }}
            options={testTypes.map((t) => ({ label: t, value: t }))}
          />
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-700">
            {selectedRows.size} case{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-3">
            <Select
              placeholder="Set Status"
              size="small"
              style={{ width: 140 }}
              onChange={(val) => handleBulkUpdate('status', val)}
              options={STATUS_OPTIONS.map((s) => ({ label: s, value: s }))}
            />
            <Select
              placeholder="Set Priority"
              size="small"
              style={{ width: 140 }}
              onChange={(val) => handleBulkUpdate('priority', val)}
              options={PRIORITY_OPTIONS.map((p) => ({ label: p, value: p }))}
            />
            <button
              onClick={() => setSelectedRows(new Set())}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Deselect
            </button>
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
                    <input
                      type="checkbox"
                      checked={cases.length > 0 && selectedRows.size === cases.length}
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-300"
                    />
                  </th>
                  <th className="px-3 py-3 text-left w-6"></th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-24">Case ID</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600">Name</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-32">Category</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-24">Type</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-28">Status</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-24">Priority</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-20">Version</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-20">Build</th>
                  <th className="px-3 py-3 text-left font-medium text-neutral-600 w-28">Updated</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <React.Fragment key={c.case_id}>
                    <tr
                      className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                        selectedRows.has(c.case_id) ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(c.case_id)}
                          onChange={() => toggleRowSelection(c.case_id)}
                          className="rounded border-neutral-300"
                        />
                      </td>
                      <td className="px-1 py-2.5">
                        <button
                          onClick={() => toggleExpanded(c.case_id)}
                          className="text-neutral-400 hover:text-neutral-600"
                        >
                          {expandedRow === c.case_id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-primary-600 font-medium text-xs">
                          {c.case_id}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-neutral-800 font-medium">{c.name}</span>
                        {c.subcategory && (
                          <span className="text-neutral-400 text-xs ml-2">{c.subcategory}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag className="m-0">{c.category}</Tag>
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag color={TEST_TYPE_COLORS[c.test_type] || 'default'} className="m-0">
                          {c.test_type}
                        </Tag>
                      </td>
                      <td className="px-3 py-2.5">
                        {editingCell?.caseId === c.case_id && editingCell?.field === 'status' ? (
                          <Select
                            size="small"
                            value={c.status}
                            autoFocus
                            open
                            style={{ width: 120 }}
                            onChange={(val) => handleInlineUpdate(c.case_id, 'status', val)}
                            onBlur={() => setEditingCell(null)}
                            options={STATUS_OPTIONS.map((s) => ({ label: s, value: s }))}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell({ caseId: c.case_id, field: 'status' })}
                            className="cursor-pointer"
                          >
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                STATUS_COLORS[c.status]?.bg || 'bg-neutral-100'
                              } ${STATUS_COLORS[c.status]?.text || 'text-neutral-700'}`}
                            >
                              {c.status}
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingCell?.caseId === c.case_id && editingCell?.field === 'priority' ? (
                          <Select
                            size="small"
                            value={c.priority}
                            autoFocus
                            open
                            style={{ width: 110 }}
                            onChange={(val) => handleInlineUpdate(c.case_id, 'priority', val)}
                            onBlur={() => setEditingCell(null)}
                            options={PRIORITY_OPTIONS.map((p) => ({ label: p, value: p }))}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell({ caseId: c.case_id, field: 'priority' })}
                            className="cursor-pointer"
                          >
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                PRIORITY_COLORS[c.priority]?.bg || 'bg-neutral-100'
                              } ${PRIORITY_COLORS[c.priority]?.text || 'text-neutral-700'}`}
                            >
                              {c.priority}
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-neutral-500">
                        {c.version_introduced || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-neutral-500">
                        {c.build_number || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-neutral-400">
                        {c.updated_at
                          ? new Date(c.updated_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === c.case_id && (
                      <tr className="bg-neutral-50">
                        <td colSpan={11} className="px-6 py-4">
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-neutral-500 uppercase">
                                Full Path
                              </label>
                              <p className="font-mono text-xs text-neutral-600 mt-1 bg-neutral-100 px-3 py-2 rounded">
                                {c.full_path}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="text-xs font-medium text-neutral-500 uppercase">
                                  Version
                                </label>
                                <input
                                  type="text"
                                  value={editForm.version_introduced}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      version_introduced: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g. v1.0"
                                  className="mt-1 w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-neutral-500 uppercase">
                                  Build Number
                                </label>
                                <input
                                  type="text"
                                  value={editForm.build_number}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      build_number: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g. 1110"
                                  className="mt-1 w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={() => handleExpandedSave(c.case_id)}
                                  className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-neutral-500 uppercase">
                                Release Notes
                              </label>
                              <textarea
                                value={editForm.release_notes}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    release_notes: e.target.value,
                                  }))
                                }
                                placeholder="Add release notes..."
                                rows={3}
                                className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {cases.length === 0 && !loading && (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-neutral-400">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No cases found. Click "Seed from Tests" to populate.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
              <span className="text-sm text-neutral-500">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of{' '}
                {total.toLocaleString()}
              </span>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                pageSizeOptions={['25', '50', '100', '200']}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
                size="small"
              />
            </div>
          )}
        </Spin>
      </div>
    </div>
  );
};

// ==================== Sub-components ====================

function StatsCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`h-10 w-10 rounded-full ${bgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default ProjectTracker;
