import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.dollor.ai';
import {
  Users,
  Plus,
  Filter,
  Search,
  Upload,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Building,
  Globe,
  Phone,
  Mail,
  ExternalLink,
  Edit,
  Eye,
  Brain,
  Send,
  Loader2
} from 'lucide-react';
import Button from '../../components/ui/Button';
import VendorOnboardingModal from '../../components/vendors/VendorOnboardingModal';
import VendorDetailsModal from '../../components/vendors/VendorDetailsModal';
import ZipVendorUploadModal from '../../components/vendors/ZipVendorUploadModal';
import VendorEditModal from '../../components/vendors/VendorEditModal';
import SyncStatus from '../../components/ui/SyncStatus';
import VendorAnalyticsPanel from '../../components/vendors/VendorAnalyticsPanel';
import VendorInsightCard from '../../components/vendors/VendorInsightCard';
import { useVendorAnalytics } from '../../hooks/useVendorAnalytics';
import AIOnboardingAssistant from '../../components/vendors/AIOnboardingAssistant';

interface Vendor {
  id: string;
  companyName: string;
  taxId: string;
  businessType: string;
  industry: string;
  website: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    title: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  onboardingStatus: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected';
  onboardingPhase: 'registration' | 'qualification' | 'due_diligence' | 'final_approval' | 'completed';
  riskRating: 'low' | 'medium' | 'high';
  performanceScore: number;
  contractStatus: 'none' | 'draft' | 'active' | 'expired';
  lastActivity: string;
  createdDate: string;
  approvedDate?: string;
  zipStatus: 'not_uploaded' | 'uploaded' | 'verified' | 'approved';
  requiredDocuments: {
    w9Form: boolean;
    insurance: boolean;
    financialStatements: boolean;
    complianceCerts: boolean;
    securityPolicy: boolean;
  };
}

const Main: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'onboarding' | 'active' | 'pending'>('all');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showZipUploadModal, setShowZipUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const { insights, analyzeVendorOnboarding } = useVendorAnalytics();
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [publishingVendorId, setPublishingVendorId] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  // Fetch vendors from backend on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors`);
      const data = await response.json();
      
      // Map backend data to frontend format
      const mappedVendors = data.map((v: any) => ({
        id: v.vendor_id,
        companyName: v.restaurant_name || v.company_name,
        taxId: v.tax_id || '',
        businessType: v.business_type || '',
        industry: v.industry || v.cuisine_type || '',
        website: v.website || '',
        primaryContact: {
          name: v.contact_name || '',
          email: v.contact_email || '',
          phone: v.contact_phone || '',
          title: v.contact_title || ''
        },
        address: {
          street: v.street || '',
          city: v.city || '',
          state: v.state || '',
          zip: v.zip_code || '',
          country: v.country || ''
        },
        onboardingStatus: v.onboarding_status,
        onboardingPhase: v.onboarding_phase,
        riskRating: v.risk_rating,
        performanceScore: v.performance_score || 0,
        contractStatus: v.contract_status || 'none',
        lastActivity: v.last_activity || v.updated_at,
        createdDate: v.created_at,
        approvedDate: v.approved_at,
        zipStatus: v.zip_status || 'not_uploaded',
        requiredDocuments: {
          w9Form: v.w9_form || false,
          insurance: v.insurance || false,
          financialStatements: v.financial_statements || false,
          complianceCerts: v.compliance_certs || false,
          securityPolicy: v.security_policy || false
        }
      }));
      
      setVendors(mappedVendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      alert('Failed to load vendors from backend');
    }
  };

  const [mockVendors] = useState<Vendor[]>([
    {
      id: 'vendor-001',
      companyName: 'Tech Solutions Inc.',
      taxId: '12-3456789',
      businessType: 'Corporation',
      industry: 'Technology',
      website: 'https://techsolutions.com',
      primaryContact: {
        name: 'John Smith',
        email: 'john.smith@techsolutions.com',
        phone: '(555) 123-4567',
        title: 'VP of Sales'
      },
      address: {
        street: '123 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'US'
      },
      onboardingStatus: 'approved',
      onboardingPhase: 'completed',
      riskRating: 'low',
      performanceScore: 95,
      contractStatus: 'active',
      lastActivity: '2024-03-15',
      createdDate: '2024-01-15',
      approvedDate: '2024-02-01',
      zipStatus: 'approved',
      requiredDocuments: {
        w9Form: true,
        insurance: true,
        financialStatements: true,
        complianceCerts: true,
        securityPolicy: true
      }
    },
    {
      id: 'vendor-002',
      companyName: 'Global Supplies Co.',
      taxId: '98-7654321',
      businessType: 'LLC',
      industry: 'Manufacturing',
      website: 'https://globalsupplies.com',
      primaryContact: {
        name: 'Sarah Johnson',
        email: 'sarah.j@globalsupplies.com',
        phone: '(555) 987-6543',
        title: 'Account Manager'
      },
      address: {
        street: '456 Industrial Blvd',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        country: 'US'
      },
      onboardingStatus: 'in_progress',
      onboardingPhase: 'due_diligence',
      riskRating: 'medium',
      performanceScore: 88,
      contractStatus: 'draft',
      lastActivity: '2024-03-16',
      createdDate: '2024-03-01',
      zipStatus: 'uploaded',
      requiredDocuments: {
        w9Form: true,
        insurance: true,
        financialStatements: false,
        complianceCerts: true,
        securityPolicy: false
      }
    },
    {
      id: 'vendor-003',
      companyName: 'Quality Services Ltd.',
      taxId: '55-1122334',
      businessType: 'Corporation',
      industry: 'Professional Services',
      website: 'https://qualityservices.com',
      primaryContact: {
        name: 'Michael Chen',
        email: 'mchen@qualityservices.com',
        phone: '(555) 456-7890',
        title: 'Business Development'
      },
      address: {
        street: '789 Service Ave',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US'
      },
      onboardingStatus: 'pending_approval',
      onboardingPhase: 'final_approval',
      riskRating: 'low',
      performanceScore: 92,
      contractStatus: 'draft',
      lastActivity: '2024-03-14',
      createdDate: '2024-02-20',
      zipStatus: 'verified',
      requiredDocuments: {
        w9Form: true,
        insurance: true,
        financialStatements: true,
        complianceCerts: true,
        securityPolicy: true
      }
    },
    {
      id: 'vendor-004',
      companyName: 'Innovative Materials Corp.',
      taxId: '77-9988776',
      businessType: 'Corporation',
      industry: 'Materials',
      website: 'https://innovativematerials.com',
      primaryContact: {
        name: 'Emma Wilson',
        email: 'ewilson@innovativematerials.com',
        phone: '(555) 321-0987',
        title: 'Sales Director'
      },
      address: {
        street: '321 Innovation Dr',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
        country: 'US'
      },
      onboardingStatus: 'not_started',
      onboardingPhase: 'registration',
      riskRating: 'medium',
      performanceScore: 0,
      contractStatus: 'none',
      lastActivity: '2024-03-16',
      createdDate: '2024-03-16',
      zipStatus: 'not_uploaded',
      requiredDocuments: {
        w9Form: false,
        insurance: false,
        financialStatements: false,
        complianceCerts: false,
        securityPolicy: false
      }
    }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handleVendorAction = async (vendorId: string, action: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;

    console.log(`Executing action "${action}" for vendor ${vendor.companyName}`);
    
    // Simulate different actions
    switch (action.toLowerCase()) {
      case 'send reminder':
      case 'send document request email with templates':
        console.log('Sending automated reminder email...');
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Reminder email sent to ${vendor.companyName}`);
        break;
        
      case 'escalate':
      case 'escalate to onboarding manager':
        console.log('Escalating to onboarding manager...');
        // Update vendor status or create escalation ticket
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Case escalated for ${vendor.companyName}`);
        break;
        
      case 'schedule follow-up call with vendor':
        console.log('Scheduling follow-up call...');
        // Integrate with calendar system
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Follow-up call scheduled with ${vendor.companyName}`);
        break;
        
      case 'initiate zip upload process immediately':
        console.log('Opening ZIP upload modal...');
        setSelectedVendor(vendor);
        setShowZipUploadModal(true);
        break;
        
      case 'conduct enhanced due diligence review':
        console.log('Starting enhanced due diligence...');
        // Create due diligence task
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Enhanced due diligence initiated for ${vendor.companyName}`);
        break;
        
      default:
        console.log(`Executing custom action: ${action}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(`Action "${action}" executed for ${vendor.companyName}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-700';
      case 'in_progress':
        return 'bg-primary-100 text-primary-700';
      case 'pending_approval':
        return 'bg-warning-100 text-warning-700';
      case 'rejected':
        return 'bg-error-100 text-error-700';
      case 'not_started':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getZipStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success-100 text-success-700';
      case 'verified':
        return 'bg-primary-100 text-primary-700';
      case 'uploaded':
        return 'bg-warning-100 text-warning-700';
      case 'not_uploaded':
        return 'bg-neutral-100 text-neutral-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-success-100 text-success-700';
      case 'medium':
        return 'bg-warning-100 text-warning-700';
      case 'high':
        return 'bg-error-100 text-error-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'registration':
        return <FileText className="h-4 w-4" />;
      case 'qualification':
        return <CheckCircle className="h-4 w-4" />;
      case 'due_diligence':
        return <AlertCircle className="h-4 w-4" />;
      case 'final_approval':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchQuery.toLowerCase().split(' ').every(term =>
      vendor.companyName.toLowerCase().includes(term) ||
      vendor.primaryContact.name.toLowerCase().includes(term) ||
      vendor.industry.toLowerCase().includes(term)
    );

    const matchesTab = activeTab === 'all' || 
      (activeTab === 'onboarding' && vendor.onboardingStatus === 'in_progress') ||
      (activeTab === 'active' && vendor.onboardingStatus === 'approved') ||
      (activeTab === 'pending' && vendor.onboardingStatus === 'pending_approval');

    const matchesFilter = !filterStatus || vendor.onboardingStatus === filterStatus;

    return matchesSearch && matchesTab && matchesFilter;
  });

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  const handleZipUpload = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowZipUploadModal(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowEditModal(true);
  };

  const handleSaveVendor = (updatedVendor: Vendor) => {
    setVendors(prev =>
      prev.map(v => v.id === updatedVendor.id ? updatedVendor : v)
    );
    console.log('Vendor updated and synced to external systems:', updatedVendor.companyName);
  };

  const handlePublishVendor = async (vendor: Vendor) => {
    setPublishingVendorId(vendor.id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/admin/vendors/${vendor.id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platforms: ['ios', 'android', 'web'] })
      });
      if (response.ok) {
        alert(`${vendor.companyName} published successfully to iOS, Android, and Web!`);
        fetchVendors();
      } else {
        const error = await response.json();
        alert(`Publish failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Publish failed: ${error}`);
    } finally {
      setPublishingVendorId(null);
    }
  };

  const getDocumentCompletionPercentage = (docs: Vendor['requiredDocuments']) => {
    const total = Object.keys(docs).length;
    const completed = Object.values(docs).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  const handleViewChecklist = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setLoadingChecklist(true);
    setShowChecklistModal(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/vendors/${vendor.id}/publish-checklist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedChecklist(data);
      } else {
        setSelectedChecklist({ error: 'Failed to load checklist' });
      }
    } catch (error) {
      setSelectedChecklist({ error: 'Failed to load checklist' });
    } finally {
      setLoadingChecklist(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Analytics Panel */}
      {showAnalytics && (
        <VendorAnalyticsPanel 
          vendors={vendors}
          onVendorAction={handleVendorAction}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Vendor Management</h1>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Brain size={16} />}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? 'Hide' : 'Show'} AI Analytics
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload size={16} />}
            onClick={() => setShowZipUploadModal(true)}
          >
            ZIP Upload
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowOnboardingModal(true)}
          >
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Vendor Insights Cards */}
      {showAnalytics && Object.keys(insights).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-neutral-900">Vendor-Specific Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(insights)
              .filter(([vendorId, vendorInsights]) => vendorInsights.length > 0)
              .slice(0, 4)
              .map(([vendorId, vendorInsights]) => {
                const vendor = vendors.find(v => v.id === vendorId);
                if (!vendor) return null;
                
                return (
                  <VendorInsightCard
                    key={vendorId}
                    vendor={vendor}
                    insights={vendorInsights}
                    onActionClick={handleVendorAction}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search vendors..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter size={16} />}
            >
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="border-b border-neutral-200">
          <nav className="flex space-x-4 px-4">
            {[
              { id: 'all', label: 'All Vendors', count: vendors.length },
              { id: 'onboarding', label: 'Onboarding', count: vendors.filter(v => v.onboardingStatus === 'in_progress').length },
              { id: 'active', label: 'Active', count: vendors.filter(v => v.onboardingStatus === 'approved').length },
              { id: 'pending', label: 'Pending Approval', count: vendors.filter(v => v.onboardingStatus === 'pending_approval').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Vendor Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Onboarding Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Phase
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  ZIP Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Documents
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Risk Rating
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Performance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          insights[vendor.id]?.some(i => i.priority === 'high') 
                            ? 'bg-error-100 border-2 border-error-300' 
                            : insights[vendor.id]?.length > 0
                            ? 'bg-warning-100 border-2 border-warning-300'
                            : 'bg-primary-100'
                        }`}>
                          <Building className="h-5 w-5 text-primary-600" />
                          {insights[vendor.id]?.some(i => i.priority === 'high') && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-error-500 rounded-full flex items-center justify-center">
                              <span className="text-xs text-white font-bold">!</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {vendor.companyName}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {vendor.industry} • {vendor.businessType}
                        </div>
                        {insights[vendor.id] && insights[vendor.id].length > 0 && (
                          <div className="flex items-center mt-1">
                            <Brain className="h-3 w-3 text-primary-500 mr-1" />
                            <span className="text-xs text-primary-600">
                              {insights[vendor.id].length} AI insight{insights[vendor.id].length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-900">{vendor.primaryContact.name}</div>
                    <div className="text-sm text-neutral-500">{vendor.primaryContact.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vendor.onboardingStatus)}`}>
                      {(vendor.onboardingStatus || 'unknown').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewChecklist(vendor)}
                      className="flex items-center hover:bg-primary-50 rounded px-2 py-1 cursor-pointer transition-colors"
                      title="Click to view publish checklist"
                    >
                      {getPhaseIcon(vendor.onboardingPhase)}
                      <span className="ml-2 text-sm text-primary-600 underline capitalize">
                        {(vendor.onboardingPhase || 'unknown').replace('_', ' ')}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getZipStatusColor(vendor.zipStatus)}`}>
                      {(vendor.zipStatus || 'not_uploaded').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-16 bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${getDocumentCompletionPercentage(vendor.requiredDocuments)}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-neutral-500">
                        {getDocumentCompletionPercentage(vendor.requiredDocuments)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(vendor.riskRating)}`}>
                      {vendor.riskRating}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-neutral-900">
                      {vendor.performanceScore > 0 ? `${vendor.performanceScore}%` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-500">
                    {new Date(vendor.lastActivity).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {insights[vendor.id] && insights[vendor.id].length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Brain size={14} />}
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowDetailsModal(true);
                          }}
                          className="text-primary-600 border-primary-600 hover:bg-primary-50"
                        >
                          AI Insights ({insights[vendor.id].length})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye size={14} />}
                        onClick={() => handleViewDetails(vendor)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Brain size={14} />}
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setShowAIAssistant(true);
                        }}
                        className="text-primary-600 border-primary-600 hover:bg-primary-50"
                      >
                        AI Help
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit size={14} />}
                        onClick={() => handleEditVendor(vendor)}
                        className="text-secondary-600 border-secondary-600 hover:bg-secondary-50"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Upload size={14} />}
                        onClick={() => handleZipUpload(vendor)}
                        className="text-warning-600 border-warning-600 hover:bg-warning-50"
                      >
                        ZIP
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={publishingVendorId === vendor.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        onClick={() => handlePublishVendor(vendor)}
                        disabled={publishingVendorId === vendor.id || vendor.onboardingStatus !== 'approved'}
                        className="text-success-600 border-success-600 hover:bg-success-50 disabled:opacity-50"
                      >
                        {publishingVendorId === vendor.id ? 'Publishing...' : 'Publish'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>No vendors found matching your criteria</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-500">
              Showing <span className="font-medium">{filteredVendors.length}</span> vendors
            </div>
            <SyncStatus 
              status="synced" 
              lastSync="2 minutes ago"
              systems={['ZIP', 'Coupa', 'NetSuite']}
            />
          </div>
        </div>
      </div>

      {/* Onboarding Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Vendors</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{vendors.length}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">In Onboarding</p>
              <p className="mt-2 text-2xl font-semibold text-warning-600">
                {vendors.filter(v => v.onboardingStatus === 'in_progress').length}
              </p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Pending Approval</p>
              <p className="mt-2 text-2xl font-semibold text-primary-600">
                {vendors.filter(v => v.onboardingStatus === 'pending_approval').length}
              </p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <AlertCircle className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Active Vendors</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">
                {vendors.filter(v => v.onboardingStatus === 'approved').length}
              </p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VendorOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
      />
      
      <VendorDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
        onEdit={handleEditVendor}
        insights={selectedVendor ? insights[selectedVendor.id] || [] : []}
        onActionClick={handleVendorAction}
      />

      <ZipVendorUploadModal
        isOpen={showZipUploadModal}
        onClose={() => {
          setShowZipUploadModal(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
      />

      <VendorEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedVendor(null);
        }}
        vendor={selectedVendor}
        onSave={handleSaveVendor}
      />

      {/* AI Onboarding Assistant */}
      {selectedVendor && showAIAssistant && (
        <AIOnboardingAssistant
          vendor={selectedVendor}
          onSuggestionApply={(suggestion) => {
            console.log('Applying AI suggestion:', suggestion);
            handleVendorAction(selectedVendor.id, suggestion);
          }}
        />
      )}
    </div>
  );
};

export default Main;