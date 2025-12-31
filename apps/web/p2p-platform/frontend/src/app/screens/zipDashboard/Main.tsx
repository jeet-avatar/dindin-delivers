import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Building,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  Globe,
  Utensils,
  ClipboardCheck
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import Button from '../../components/ui/Button';
import { Spin, message, Modal, Tabs, Tag, Badge, Empty, Input, Select, Table, Descriptions, Popconfirm, Alert } from 'antd';
import * as htmlToImage from "html-to-image";
import { saveAs } from 'file-saver';
import * as api from '../../api/api';
import type { Vendor, PublishChecklist } from '../../api/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  suspended: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

// Phase labels
const PHASE_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  documents_pending: 'Documents Pending',
  under_review: 'Under Review',
  compliance_check: 'Compliance Check',
  completed: 'Completed',
};

const Main: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<PublishChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Fetch vendors and stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsData, statsData] = await Promise.all([
        api.getVendors(),
        api.getVendorStats()
      ]);
      setVendors(vendorsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch vendor data:', error);
      message.error('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter vendors based on tab, search, and status
  const filteredVendors = vendors.filter(vendor => {
    // Tab filter
    if (activeTab === 'pending' && vendor.onboarding_status !== 'pending' && vendor.onboarding_status !== 'in_review') {
      return false;
    }
    if (activeTab === 'approved' && vendor.onboarding_status !== 'approved') {
      return false;
    }
    if (activeTab === 'rejected' && vendor.onboarding_status !== 'rejected') {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && vendor.onboarding_status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        vendor.restaurant_name?.toLowerCase().includes(search) ||
        vendor.company_name?.toLowerCase().includes(search) ||
        vendor.contact_name?.toLowerCase().includes(search) ||
        vendor.contact_email?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Check if vendor has all required documents
  const checkDocuments = (vendor: Vendor) => {
    const docs = {
      food_license: Boolean(vendor.food_license && vendor.food_license_url),
      health_permit: Boolean(vendor.health_permit && vendor.health_permit_url),
      w9_form: Boolean(vendor.w9_form && vendor.w9_form_url),
      insurance: Boolean(vendor.insurance && vendor.insurance_url),
    };
    const completed = Object.values(docs).filter(Boolean).length;
    const total = 4;
    return { docs, completed, total, allComplete: completed === total };
  };

  // Fetch publish checklist for a vendor
  const fetchChecklist = async (vendorId: number) => {
    setChecklistLoading(true);
    try {
      const data = await api.getVendorPublishChecklist(vendorId);
      setChecklist(data);
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
      setChecklist(null);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Open vendor modal and fetch checklist
  const openVendorModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsModalVisible(true);
    fetchChecklist(vendor.id);
  };

  // Handle approve vendor
  const handleApprove = async (vendorId: number, skipCheck: boolean = false) => {
    setActionLoading(vendorId);
    try {
      await api.updateVendorStatus(vendorId, 'approved', skipCheck);

      // Show detailed success message
      Modal.success({
        title: '🎉 Restaurant Published Successfully!',
        content: (
          <div className="space-y-3 mt-4">
            <p><strong>{selectedVendor?.restaurant_name}</strong> is now live on:</p>
            <div className="flex gap-2 flex-wrap">
              <Tag color="blue" className="flex items-center gap-1">📱 iOS Customer App</Tag>
              <Tag color="green" className="flex items-center gap-1">🤖 Android Customer App</Tag>
              <Tag color="purple" className="flex items-center gap-1">🌐 Web Platform</Tag>
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-700 text-sm">
                ✉️ Approval email has been sent to <strong>{selectedVendor?.contact_email}</strong>
              </p>
            </div>
          </div>
        ),
        okText: 'Great!',
        width: 500,
      });

      fetchData();
      setIsModalVisible(false);
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      if (detail?.missing_documents) {
        Modal.confirm({
          title: '📄 Missing Documents',
          content: (
            <div>
              <p className="mb-2">Cannot approve vendor - the following documents are missing:</p>
              <ul className="list-disc pl-5">
                {detail.missing_documents.map((doc: string) => (
                  <li key={doc} className="text-red-600">{doc}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-gray-500">
                Do you want to approve anyway? (Admin override)
              </p>
            </div>
          ),
          okText: 'Approve Anyway',
          okType: 'danger',
          cancelText: 'Cancel',
          onOk: () => handleApprove(vendorId, true),
        });
      } else if (detail?.checklist_errors) {
        // Show checklist errors (menu items, etc.)
        Modal.error({
          title: '⚠️ Pre-Publish Checklist Incomplete',
          content: (
            <div className="mt-4">
              <p className="mb-3 text-gray-600">Cannot publish restaurant - the following items need attention:</p>
              <div className="space-y-2">
                {detail.checklist_errors.map((err: any, idx: number) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-red-500" />
                      <span className="font-medium text-red-700">{err.item}</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1 ml-6">{err.message}</p>
                  </div>
                ))}
              </div>
              {detail.menu_items_count === 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-700 text-sm">
                    💡 <strong>Tip:</strong> Ask the restaurant to add their menu items through the Vendor Portal,
                    or use the Menu Review screen to add items on their behalf.
                  </p>
                </div>
              )}
            </div>
          ),
          okText: 'Got it',
          width: 500,
        });
      } else {
        message.error(detail?.message || 'Failed to approve vendor');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject vendor
  const handleReject = async (vendorId: number) => {
    setActionLoading(vendorId);
    try {
      await api.updateVendorStatus(vendorId, 'rejected');
      message.success('Vendor application rejected and unpublished from all platforms');
      fetchData();
      setIsModalVisible(false);
    } catch (error) {
      message.error('Failed to reject vendor');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle set to in_review
  const handleStartReview = async (vendorId: number) => {
    setActionLoading(vendorId);
    try {
      await api.updateVendorStatus(vendorId, 'in_review');
      message.success('Vendor moved to review');
      fetchData();
    } catch (error) {
      message.error('Failed to update vendor status');
    } finally {
      setActionLoading(null);
    }
  };

  // Export dashboard
  const exportData = () => {
    setLoading(true);
    const node = document.getElementById("main-section");
    if (node) {
      htmlToImage.toBlob(node).then((blob) => {
        if (blob) {
          saveAs(blob, "ZIP-Vendor-Dashboard.png");
        }
        setLoading(false);
        message.success("Dashboard exported successfully.");
      });
    }
  };

  // Chart data
  const statusChartData = {
    labels: ['Pending', 'In Review', 'Approved', 'Rejected', 'Suspended'],
    datasets: [{
      data: [
        stats.byStatus?.pending || 0,
        stats.byStatus?.in_review || 0,
        stats.byStatus?.approved || 0,
        stats.byStatus?.rejected || 0,
        stats.byStatus?.suspended || 0,
      ],
      backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#6b7280'],
      borderWidth: 0
    }]
  };

  const phaseChartData = {
    labels: ['Not Started', 'Docs Pending', 'Under Review', 'Compliance', 'Completed'],
    datasets: [{
      label: 'Vendors',
      data: [
        stats.byPhase?.not_started || 0,
        stats.byPhase?.documents_pending || 0,
        stats.byPhase?.under_review || 0,
        stats.byPhase?.compliance_check || 0,
        stats.byPhase?.completed || 0,
      ],
      backgroundColor: ['#6b7280', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };

  // Table columns
  const columns = [
    {
      title: 'Restaurant',
      key: 'restaurant',
      render: (record: Vendor) => (
        <div>
          <div className="font-medium text-gray-900">
            {record.restaurant_name || record.company_name || 'Unnamed'}
          </div>
          <div className="text-sm text-gray-500">{record.cuisine_type || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Vendor) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Mail size={12} /> {record.contact_email || 'N/A'}
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Phone size={12} /> {record.contact_phone || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (record: Vendor) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            {record.city && record.state ? `${record.city}, ${record.state}` : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: Vendor) => {
        const status = record.onboarding_status || 'pending';
        const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
        return (
          <Tag className={`${colors.bg} ${colors.text} ${colors.border} border`}>
            {status.replace('_', ' ').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Documents',
      key: 'documents',
      render: (record: Vendor) => {
        const { completed, total, allComplete } = checkDocuments(record);
        return (
          <div className="flex items-center gap-2">
            <Badge
              status={allComplete ? 'success' : 'warning'}
              text={`${completed}/${total}`}
            />
            {allComplete && <CheckCircle size={14} className="text-green-500" />}
          </div>
        );
      },
    },
    {
      title: 'Published',
      key: 'published',
      render: (record: Vendor) => {
        const isPublished = record.is_published;
        // Handle both JSON array format and comma-separated string format
        let platforms: string[] = [];
        if (record.published_platforms) {
          try {
            platforms = JSON.parse(record.published_platforms);
          } catch {
            // Fallback for comma-separated format like "android,ios,web"
            platforms = record.published_platforms.split(',').map(p => p.trim());
          }
        }

        if (!isPublished) {
          return (
            <Tag color="default" className="flex items-center gap-1">
              <XCircle size={12} /> Not Published
            </Tag>
          );
        }

        return (
          <div className="flex flex-col gap-1">
            <Tag color="green" className="flex items-center gap-1">
              <CheckCircle size={12} /> Live
            </Tag>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {platforms.includes('ios') && <Smartphone size={10} title="iOS" />}
              {platforms.includes('android') && <Smartphone size={10} title="Android" />}
              {platforms.includes('web') && <Globe size={10} title="Web" />}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Applied',
      key: 'created_at',
      render: (record: Vendor) => (
        <span className="text-sm text-gray-500">
          {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Vendor) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openVendorModal(record)}
          >
            <Eye size={14} className="mr-1" /> View
          </Button>
          {record.onboarding_status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStartReview(record.id)}
              loading={actionLoading === record.id}
            >
              Start Review
            </Button>
          )}
          {record.onboarding_status === 'in_review' && (
            <>
              <Popconfirm
                title="Approve this vendor?"
                description="This will create their account and send approval email."
                onConfirm={() => handleApprove(record.id)}
                okText="Approve"
                cancelText="Cancel"
              >
                <Button
                  variant="success"
                  size="sm"
                  loading={actionLoading === record.id}
                >
                  <ThumbsUp size={14} />
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this application?"
                description="The vendor will be notified of rejection."
                onConfirm={() => handleReject(record.id)}
                okText="Reject"
                okType="danger"
                cancelText="Cancel"
              >
                <Button
                  variant="danger"
                  size="sm"
                  loading={actionLoading === record.id}
                >
                  <ThumbsDown size={14} />
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  // Document status component
  const DocumentStatus = ({ vendor }: { vendor: Vendor }) => {
    const { docs } = checkDocuments(vendor);
    const docItems = [
      { key: 'food_license', label: 'Food Service License', url: vendor.food_license_url, value: vendor.food_license },
      { key: 'health_permit', label: 'Health Permit', url: vendor.health_permit_url, value: vendor.health_permit },
      { key: 'w9_form', label: 'W-9 / Business License', url: vendor.w9_form_url, value: vendor.w9_form },
      { key: 'insurance', label: 'Liability Insurance', url: vendor.insurance_url, value: vendor.insurance },
    ];

    return (
      <div className="space-y-3">
        {docItems.map(doc => (
          <div
            key={doc.key}
            className={`p-3 rounded-lg border ${
              docs[doc.key as keyof typeof docs]
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className={docs[doc.key as keyof typeof docs] ? 'text-green-600' : 'text-red-600'} />
                <span className="font-medium">{doc.label}</span>
              </div>
              {docs[doc.key as keyof typeof docs] ? (
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600" />
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle size={16} />
                  <span className="text-sm">Missing</span>
                </div>
              )}
            </div>
            {doc.value && (
              <div className="mt-1 text-sm text-gray-600">
                Reference: {doc.value}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">ZIP Vendor Approval</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Restaurant onboarding and approval management - All platforms connected
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={16} />}
            onClick={fetchData}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={16} />}
            onClick={exportData}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Alert for pending approvals */}
      {stats.pendingApproval > 0 && (
        <Alert
          message={`${stats.pendingApproval} vendor application(s) awaiting review`}
          description="Review and approve vendors to allow them to go live on iOS, Android, and Web."
          type="warning"
          showIcon
          icon={<Clock size={20} />}
        />
      )}

      <div id="main-section">
        {/* Key Metrics */}
        <Spin spinning={loading}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalVendors || 0}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-full">
                  <Building className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active (Live)</p>
                  <p className="mt-1 text-2xl font-semibold text-green-700">{stats.activeVendors || 0}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">Pending Review</p>
                  <p className="mt-1 text-2xl font-semibold text-yellow-700">{stats.pendingApproval || 0}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">In Onboarding</p>
                  <p className="mt-1 text-2xl font-semibold text-blue-700">{stats.inOnboarding || 0}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  <p className="mt-1 text-2xl font-semibold text-red-700">{stats.rejectedApplications || 0}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.completedOnboarding || 0}</p>
                </div>
                <div className="p-2 bg-gray-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Vendor Status Distribution</h2>
              <div className="h-64">
                <Doughnut data={statusChartData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Onboarding Pipeline</h2>
              <div className="h-64">
                <Bar data={phaseChartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Vendor Applications Table */}
          <div className="bg-white rounded-lg shadow-sm border mt-6">
            <div className="p-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: 'pending',
                      label: (
                        <span className="flex items-center gap-2">
                          <Clock size={14} />
                          Pending Review
                          {stats.pendingApproval > 0 && (
                            <Badge count={stats.pendingApproval} style={{ backgroundColor: '#f59e0b' }} />
                          )}
                        </span>
                      ),
                    },
                    {
                      key: 'approved',
                      label: (
                        <span className="flex items-center gap-2">
                          <CheckCircle size={14} />
                          Approved
                        </span>
                      ),
                    },
                    {
                      key: 'rejected',
                      label: (
                        <span className="flex items-center gap-2">
                          <XCircle size={14} />
                          Rejected
                        </span>
                      ),
                    },
                    {
                      key: 'all',
                      label: (
                        <span className="flex items-center gap-2">
                          <Users size={14} />
                          All Vendors
                        </span>
                      ),
                    },
                  ]}
                />
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Search vendors..."
                    prefix={<Search size={14} className="text-gray-400" />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: 200 }}
                  />
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 150 }}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'in_review', label: 'In Review' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' },
                      { value: 'suspended', label: 'Suspended' },
                    ]}
                  />
                </div>
              </div>
            </div>
            <Table
              dataSource={filteredVendors}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      activeTab === 'pending'
                        ? 'No pending vendor applications'
                        : `No ${activeTab} vendors found`
                    }
                  />
                ),
              }}
            />
          </div>

          {/* Onboarding Requirements Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ZIP Compliance Requirements</h2>
            <p className="text-sm text-gray-600 mb-4">
              Before a restaurant can go live on iOS, Android, or Web, they must provide the following documents:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {api.REQUIRED_VENDOR_DOCUMENTS.map((doc) => (
                <div key={doc.key} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="text-primary-600" />
                    <span className="font-medium">{doc.label}</span>
                  </div>
                  <p className="text-sm text-gray-500">{doc.description}</p>
                  <Tag color="red" className="mt-2">Required</Tag>
                </div>
              ))}
            </div>
          </div>
        </Spin>
      </div>

      {/* Vendor Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Building size={20} />
            <span>{selectedVendor?.restaurant_name || selectedVendor?.company_name || 'Vendor Details'}</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        footer={
          selectedVendor?.onboarding_status === 'in_review' || selectedVendor?.onboarding_status === 'pending' ? (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Popconfirm
                title="Reject this application?"
                onConfirm={() => selectedVendor && handleReject(selectedVendor.id)}
              >
                <Button
                  variant="danger"
                  leftIcon={<ThumbsDown size={14} />}
                  loading={actionLoading === selectedVendor?.id}
                >
                  Reject
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Approve this vendor?"
                description="This will create their account and send approval email."
                onConfirm={() => selectedVendor && handleApprove(selectedVendor.id)}
              >
                <Button
                  variant="success"
                  leftIcon={<ThumbsUp size={14} />}
                  loading={actionLoading === selectedVendor?.id}
                >
                  Approve
                </Button>
              </Popconfirm>
            </div>
          ) : null
        }
      >
        {selectedVendor && (
          <Tabs
            items={[
              {
                key: 'info',
                label: 'Business Info',
                children: (
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Restaurant Name" span={2}>
                      {selectedVendor.restaurant_name || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Company Name">
                      {selectedVendor.company_name || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cuisine Type">
                      {selectedVendor.cuisine_type || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact Name">
                      {selectedVendor.contact_name || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact Email">
                      {selectedVendor.contact_email || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact Phone">
                      {selectedVendor.contact_phone || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Address" span={2}>
                      {[selectedVendor.address, selectedVendor.city, selectedVendor.state, selectedVendor.zip_code]
                        .filter(Boolean)
                        .join(', ') || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag className={`${STATUS_COLORS[selectedVendor.onboarding_status]?.bg} ${STATUS_COLORS[selectedVendor.onboarding_status]?.text}`}>
                        {selectedVendor.onboarding_status?.replace('_', ' ').toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Phase">
                      {PHASE_LABELS[selectedVendor.onboarding_phase] || selectedVendor.onboarding_phase}
                    </Descriptions.Item>
                    <Descriptions.Item label="Published Status" span={2}>
                      {selectedVendor.is_published ? (
                        <div className="flex items-center gap-3">
                          <Tag color="green" className="flex items-center gap-1">
                            <CheckCircle size={12} /> Live on All Platforms
                          </Tag>
                          <div className="flex items-center gap-2 text-sm">
                            {(() => {
                              let platforms: string[] = [];
                              if (selectedVendor.published_platforms) {
                                try {
                                  platforms = JSON.parse(selectedVendor.published_platforms);
                                } catch {
                                  platforms = selectedVendor.published_platforms.split(',').map(p => p.trim());
                                }
                              }
                              return (
                                <>
                                  {platforms.includes('ios') && <Tag icon={<Smartphone size={10} />}>iOS</Tag>}
                                  {platforms.includes('android') && <Tag icon={<Smartphone size={10} />}>Android</Tag>}
                                  {platforms.includes('web') && <Tag icon={<Globe size={10} />}>Web</Tag>}
                                </>
                              );
                            })()}
                          </div>
                          {selectedVendor.published_at && (
                            <span className="text-xs text-gray-500">
                              Since {new Date(selectedVendor.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Tag color="default" className="flex items-center gap-1">
                          <XCircle size={12} /> Not Published
                        </Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Applied">
                      {selectedVendor.created_at ? new Date(selectedVendor.created_at).toLocaleDateString() : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Activity">
                      {selectedVendor.last_activity ? new Date(selectedVendor.last_activity).toLocaleDateString() : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description" span={2}>
                      {selectedVendor.description || 'No description provided'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'documents',
                label: (
                  <span className="flex items-center gap-2">
                    <FileText size={14} />
                    Documents
                    {!checkDocuments(selectedVendor).allComplete && (
                      <Badge status="warning" />
                    )}
                  </span>
                ),
                children: <DocumentStatus vendor={selectedVendor} />,
              },
              {
                key: 'checklist',
                label: (
                  <span className="flex items-center gap-2">
                    <ClipboardCheck size={14} />
                    Publish Checklist
                    {checklist && !checklist.ready_to_publish && (
                      <Badge status="error" />
                    )}
                    {checklist?.ready_to_publish && (
                      <Badge status="success" />
                    )}
                  </span>
                ),
                children: (
                  <div className="space-y-4">
                    {checklistLoading ? (
                      <div className="flex justify-center py-8">
                        <Spin />
                      </div>
                    ) : checklist ? (
                      <>
                        {/* Summary */}
                        <div className={`p-4 rounded-lg border ${
                          checklist.ready_to_publish
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {checklist.ready_to_publish ? (
                                <CheckCircle size={24} className="text-green-600" />
                              ) : (
                                <AlertCircle size={24} className="text-amber-600" />
                              )}
                              <div>
                                <p className={`font-semibold ${
                                  checklist.ready_to_publish ? 'text-green-700' : 'text-amber-700'
                                }`}>
                                  {checklist.ready_to_publish
                                    ? 'Ready to Publish!'
                                    : 'Not Ready - Items Need Attention'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {checklist.summary.complete} of {checklist.summary.total} items complete
                                </p>
                              </div>
                            </div>
                            <div className="text-2xl font-bold">
                              {checklist.summary.percentage}%
                            </div>
                          </div>
                        </div>

                        {/* Documents Section */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <FileText size={16} /> Required Documents ({checklist.summary.documents_complete}/{checklist.summary.documents_total})
                          </h4>
                          <div className="space-y-2">
                            {checklist.items.filter(i => i.category === 'documents').map(item => (
                              <div
                                key={item.key}
                                className={`p-3 rounded-lg border flex items-center justify-between ${
                                  item.status === 'complete'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {item.status === 'complete' ? (
                                    <CheckCircle size={16} className="text-green-600" />
                                  ) : (
                                    <XCircle size={16} className="text-red-600" />
                                  )}
                                  <span>{item.label}</span>
                                </div>
                                {item.url && (
                                  <a
                                    href={item.url.startsWith('/') ? `${api.getApiUrl()}${item.url}` : item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                                  >
                                    View <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Menu Items Section */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Utensils size={16} /> Menu Items
                          </h4>
                          {checklist.items.filter(i => i.category === 'menu').map(item => (
                            <div
                              key={item.key}
                              className={`p-3 rounded-lg border ${
                                item.status === 'complete'
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {item.status === 'complete' ? (
                                    <CheckCircle size={16} className="text-green-600" />
                                  ) : (
                                    <XCircle size={16} className="text-red-600" />
                                  )}
                                  <span>{item.message}</span>
                                </div>
                                {item.status === 'incomplete' && (
                                  <Tag color="red">Required</Tag>
                                )}
                              </div>
                              {item.status === 'incomplete' && (
                                <div className="mt-2 ml-6 space-y-2">
                                  <p className="text-sm text-gray-500">
                                    Restaurant must add menu items before going live.
                                  </p>
                                  <div className="flex gap-2">
                                    <a
                                      href={`/admin/menu-review?vendor_id=${selectedVendor?.id}`}
                                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      Add Menu Items (Admin) <ExternalLink size={12} />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Restaurant Info Section */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                            <Building size={16} /> Restaurant Information
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {checklist.items.filter(i => i.category === 'info').map(item => (
                              <div
                                key={item.key}
                                className={`p-2 rounded border flex items-center gap-2 ${
                                  item.status === 'complete'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {item.status === 'complete' ? (
                                  <CheckCircle size={14} className="text-green-600" />
                                ) : (
                                  <AlertCircle size={14} className="text-gray-400" />
                                )}
                                <span className="text-sm">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <Empty description="Failed to load checklist" />
                    )}
                  </div>
                ),
              },
              {
                key: 'delivery',
                label: 'Delivery Settings',
                children: (
                  <Descriptions bordered column={2} size="small">
                    <Descriptions.Item label="Delivery Enabled">
                      {selectedVendor.delivery_enabled ? (
                        <Tag color="green">Yes</Tag>
                      ) : (
                        <Tag color="red">No</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Minimum Order">
                      ${selectedVendor.minimum_order?.toFixed(2) || '0.00'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Delivery Fee">
                      ${selectedVendor.delivery_fee?.toFixed(2) || '0.00'}
                    </Descriptions.Item>
                    <Descriptions.Item label="EIN Number">
                      {selectedVendor.ein_number || 'Not provided'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default Main;
