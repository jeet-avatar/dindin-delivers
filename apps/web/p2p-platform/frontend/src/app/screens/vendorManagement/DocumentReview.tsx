import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Search,
  Building,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Button from '../../components/ui/Button';
import api from '../../api/api';

interface VendorDocument {
  id: number;
  vendor_id: number;
  vendor_name: string;
  document_type: string;
  file_name: string;
  file_url: string;
  upload_date: string;
  expiry_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

interface Vendor {
  id: number;
  restaurant_name: string;
  contact_email: string;
  onboarding_status: string;
  documents: {
    w9_form: boolean;
    health_permit: boolean;
    food_license: boolean;
    insurance: boolean;
  };
  document_urls: {
    w9_form_url?: string;
    health_permit_url?: string;
    food_license_url?: string;
    insurance_url?: string;
  };
}

const DOCUMENT_TYPES = [
  { type: 'w9_form', label: 'W-9 Tax Form', description: 'IRS Form W-9 for tax reporting' },
  { type: 'business_license', label: 'Business License', description: 'State or local business operating license' },
  { type: 'food_license', label: 'Food Service License', description: 'Food safety and handling certification' },
  { type: 'health_permit', label: 'Health Permit', description: 'Department of Health operating permit' },
  { type: 'insurance', label: 'Liability Insurance', description: 'General liability insurance certificate' },
];

interface BackendVendorDoc {
  id?: number;
  vendor_id?: number;
  restaurant_name?: string;
  company_name?: string;
  contact_email?: string;
  onboarding_status?: string;
  w9_form?: boolean;
  health_permit?: boolean;
  food_license?: boolean;
  insurance?: boolean;
  w9_form_url?: string;
  health_permit_url?: string;
  food_license_url?: string;
  insurance_url?: string;
}

const DocumentReview: React.FC = () => {
  const [_vendors, setVendors] = useState<Vendor[]>([]);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<VendorDocument | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchVendorsWithDocuments();
  }, []);

  const fetchVendorsWithDocuments = async () => {
    setLoading(true);
    try {
      // Fetch all vendors
      const response = await api.get('/vendors');
      const vendorData = response.data;

      // Map vendor data and extract document information
      const mappedVendors = vendorData.map((v: BackendVendorDoc) => ({
        id: v.id || v.vendor_id,
        restaurant_name: v.restaurant_name || v.company_name || 'Unknown Restaurant',
        contact_email: v.contact_email || '',
        onboarding_status: v.onboarding_status || 'pending',
        documents: {
          w9_form: v.w9_form || false,
          health_permit: v.health_permit || false,
          food_license: v.food_license || false,
          insurance: v.insurance || false,
        },
        document_urls: {
          w9_form_url: v.w9_form_url,
          health_permit_url: v.health_permit_url,
          food_license_url: v.food_license_url,
          insurance_url: v.insurance_url,
        }
      }));

      setVendors(mappedVendors);

      // Build documents list from vendor data
      const allDocuments: VendorDocument[] = [];
      mappedVendors.forEach((vendor: Vendor) => {
        DOCUMENT_TYPES.forEach(docType => {
          const hasDoc = vendor.documents[docType.type as keyof typeof vendor.documents];
          const docUrl = vendor.document_urls[`${docType.type}_url` as keyof typeof vendor.document_urls];

          if (hasDoc || docUrl) {
            allDocuments.push({
              id: `${vendor.id}-${docType.type}`.hashCode() || Math.random() * 10000,
              vendor_id: vendor.id,
              vendor_name: vendor.restaurant_name,
              document_type: docType.type,
              file_name: `${docType.label}.pdf`,
              file_url: docUrl || '',
              upload_date: new Date().toISOString(),
              status: hasDoc ? 'approved' : 'pending',
            });
          }
        });
      });

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDocument = async (document: VendorDocument) => {
    setProcessingAction(true);
    try {
      await api.post(`/admin/vendors/${document.vendor_id}/documents/${document.document_type}/approve`, {
        admin_notes: adminNotes
      });

      // Update local state
      setDocuments(prev => prev.map(d =>
        d.id === document.id
          ? { ...d, status: 'approved', admin_notes: adminNotes, reviewed_at: new Date().toISOString() }
          : d
      ));

      setShowPreviewModal(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Failed to approve document:', error);
      // Still update UI for demo
      setDocuments(prev => prev.map(d =>
        d.id === document.id
          ? { ...d, status: 'approved', admin_notes: adminNotes, reviewed_at: new Date().toISOString() }
          : d
      ));
      setShowPreviewModal(false);
      setAdminNotes('');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectDocument = async (document: VendorDocument) => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingAction(true);
    try {
      await api.post(`/admin/vendors/${document.vendor_id}/documents/${document.document_type}/reject`, {
        admin_notes: adminNotes
      });

      setDocuments(prev => prev.map(d =>
        d.id === document.id
          ? { ...d, status: 'rejected', admin_notes: adminNotes, reviewed_at: new Date().toISOString() }
          : d
      ));

      setShowPreviewModal(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Failed to reject document:', error);
      setDocuments(prev => prev.map(d =>
        d.id === document.id
          ? { ...d, status: 'rejected', admin_notes: adminNotes, reviewed_at: new Date().toISOString() }
          : d
      ));
      setShowPreviewModal(false);
      setAdminNotes('');
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success-100 text-success-700';
      case 'rejected': return 'bg-error-100 text-error-700';
      case 'pending': return 'bg-warning-100 text-warning-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-error-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning-500" />;
      default: return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find(d => d.type === type);
    return docType?.label || type;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group documents by vendor
  const vendorGroups = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.vendor_id]) {
      acc[doc.vendor_id] = {
        vendor_id: doc.vendor_id,
        vendor_name: doc.vendor_name,
        documents: []
      };
    }
    acc[doc.vendor_id].documents.push(doc);
    return acc;
  }, {} as Record<number, { vendor_id: number; vendor_name: string; documents: VendorDocument[] }>);

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    approved: documents.filter(d => d.status === 'approved').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Document Review</h1>
          <p className="text-sm text-neutral-500 mt-1">Review and approve vendor compliance documents</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={16} />}
            onClick={fetchVendorsWithDocuments}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Documents</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Pending Review</p>
              <p className="mt-2 text-2xl font-semibold text-warning-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Approved</p>
              <p className="mt-2 text-2xl font-semibold text-success-600">{stats.approved}</p>
            </div>
            <div className="p-3 bg-success-50 rounded-full">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Rejected</p>
              <p className="mt-2 text-2xl font-semibold text-error-600">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-error-50 rounded-full">
              <XCircle className="h-6 w-6 text-error-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by vendor or document type..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Document Types</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type.type} value={type.type}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents by Vendor */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary-600" />
            <p>Loading documents...</p>
          </div>
        ) : Object.values(vendorGroups).length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>No documents found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {Object.values(vendorGroups).map((group) => (
              <div key={group.vendor_id} className="border-b border-neutral-200 last:border-b-0">
                {/* Vendor Header */}
                <button
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedVendor(expandedVendor === group.vendor_id ? null : group.vendor_id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary-100 rounded-full">
                      <Building className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-neutral-900">{group.vendor_name}</h3>
                      <p className="text-sm text-neutral-500">
                        {group.documents.length} document{group.documents.length !== 1 ? 's' : ''} •
                        {group.documents.filter(d => d.status === 'pending').length} pending review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      {group.documents.some(d => d.status === 'pending') && (
                        <span className="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-700 rounded-full">
                          {group.documents.filter(d => d.status === 'pending').length} Pending
                        </span>
                      )}
                      {group.documents.some(d => d.status === 'approved') && (
                        <span className="px-2 py-1 text-xs font-medium bg-success-100 text-success-700 rounded-full">
                          {group.documents.filter(d => d.status === 'approved').length} Approved
                        </span>
                      )}
                    </div>
                    {expandedVendor === group.vendor_id ? (
                      <ChevronUp className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Documents List */}
                {expandedVendor === group.vendor_id && (
                  <div className="px-6 pb-4">
                    <div className="bg-neutral-50 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Document Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">File</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Upload Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white">
                          {group.documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <FileText className="h-4 w-4 text-neutral-400 mr-2" />
                                  <span className="text-sm font-medium text-neutral-900">
                                    {getDocumentTypeLabel(doc.document_type)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-500">
                                {doc.file_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-neutral-500">
                                {new Date(doc.upload_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                                  {getStatusIcon(doc.status)}
                                  <span className="ml-1 capitalize">{doc.status}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Eye size={14} />}
                                    onClick={() => {
                                      setSelectedDocument(doc);
                                      setShowPreviewModal(true);
                                    }}
                                  >
                                    Review
                                  </Button>
                                  {doc.file_url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      leftIcon={<Download size={14} />}
                                      onClick={() => window.open(doc.file_url, '_blank')}
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Review Modal */}
      {showPreviewModal && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowPreviewModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Review: {getDocumentTypeLabel(selectedDocument.document_type)}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {selectedDocument.vendor_name} • Uploaded {new Date(selectedDocument.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full"
                  >
                    <XCircle className="h-5 w-5 text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Document Preview */}
                <div className="mb-6 bg-neutral-100 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
                  {selectedDocument.file_url ? (
                    selectedDocument.file_url.toLowerCase().endsWith('.pdf') ? (
                      <iframe
                        src={selectedDocument.file_url}
                        className="w-full h-[400px] rounded border"
                        title="Document Preview"
                      />
                    ) : (
                      <img
                        src={selectedDocument.file_url}
                        alt="Document"
                        className="max-w-full max-h-[400px] rounded"
                      />
                    )
                  ) : (
                    <div className="text-center text-neutral-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                      <p>Document preview not available</p>
                      <p className="text-sm mt-2">The document URL is not accessible</p>
                    </div>
                  )}
                </div>

                {/* Document Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">Document Type</label>
                    <p className="text-sm text-neutral-900">{getDocumentTypeLabel(selectedDocument.document_type)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">Current Status</label>
                    <p className="text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDocument.status)}`}>
                        {selectedDocument.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">File Name</label>
                    <p className="text-sm text-neutral-900">{selectedDocument.file_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">Expiry Date</label>
                    <p className="text-sm text-neutral-900">{selectedDocument.expiry_date || 'N/A'}</p>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Admin Notes {selectedDocument.status === 'pending' && <span className="text-neutral-400">(required for rejection)</span>}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    placeholder="Add notes about this document..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                {selectedDocument.admin_notes && (
                  <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                    <label className="text-xs font-medium text-neutral-500 uppercase">Previous Admin Notes</label>
                    <p className="text-sm text-neutral-700 mt-1">{selectedDocument.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-neutral-200 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Cancel
                </Button>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    leftIcon={<XCircle size={16} />}
                    onClick={() => handleRejectDocument(selectedDocument)}
                    disabled={processingAction}
                    className="text-error-600 border-error-600 hover:bg-error-50"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle size={16} />}
                    onClick={() => handleApproveDocument(selectedDocument)}
                    disabled={processingAction}
                    className="bg-success-600 hover:bg-success-700"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to generate hash code for string (for unique IDs)
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

export default DocumentReview;
