import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save,
  Building, 
  User, 
  MapPin,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Button from '../ui/Button';
import EditableField from '../ui/EditableField';
import DocumentUpload from '../ui/DocumentUpload';
import DocumentViewer from '../ui/DocumentViewer';
import DocumentReplaceModal from '../ui/DocumentReplaceModal';
import { ModalOverlay } from '../ui/ModalOverlay';

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
  onboardingStatus: string;
  onboardingPhase: string;
  riskRating: string;
  performanceScore: number;
  contractStatus: string;
  lastActivity: string;
  createdDate: string;
  approvedDate?: string;
  zipStatus: string;
  requiredDocuments: {
    w9Form: boolean;
    insurance: boolean;
    financialStatements: boolean;
    complianceCerts: boolean;
    securityPolicy: boolean;
  };
}

interface VendorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onSave: (updatedVendor: Vendor) => void;
}

const VendorEditModal: React.FC<VendorEditModalProps> = ({ 
  isOpen, 
  onClose, 
  vendor,
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [editedVendor, setEditedVendor] = useState<Vendor | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  useEffect(() => {
    if (vendor) {
      setEditedVendor({ ...vendor });
      setHasChanges(false);
    }
  }, [vendor]);

  const tabs = [
    { id: 'basic', label: 'Basic Information', icon: Building },
    { id: 'contact', label: 'Contact Details', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'business', label: 'Business Details', icon: FileText },
    { id: 'status', label: 'Status & Performance', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: Shield }
  ];

  const handleFieldUpdate = (section: string, field: string, value: string | number) => {
    if (!editedVendor) return;

    setEditedVendor(prev => {
      if (!prev) return prev;
      
      if (section === 'root') {
        return { ...prev, [field]: value };
      } else {
        return {
          ...prev,
          [section]: {
            ...((prev[section as keyof Vendor] ?? {}) as object),
            [field]: value
          }
        };
      }
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!editedVendor) return;

    setIsSaving(true);
    
    try {
      // Simulate API call to update vendor
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate sync to external systems
      console.log('Syncing vendor updates to:', ['ZIP', 'Coupa', 'NetSuite', 'Process Unity']);
      
      onSave(editedVendor);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save vendor:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentUpload = async (file: File, metadata: any) => {
    console.log('Uploading document for vendor:', file.name, metadata);
    
    // Update document status
    if (editedVendor) {
      const docType = metadata.category as keyof typeof editedVendor.requiredDocuments;
      if (docType in editedVendor.requiredDocuments) {
        setEditedVendor(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            requiredDocuments: {
              ...prev.requiredDocuments,
              [docType]: true
            }
          };
        });
        setHasChanges(true);
      }
    }
    
    // Simulate upload and sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Document uploaded and synced to external systems');
  };

  const handleViewDocument = (docType: string, docLabel: string) => {
    // Mock document data - in real app, this would come from API
    const mockDocument = {
      name: `${docLabel}.pdf`,
      type: 'application/pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadDate: new Date().toISOString(),
      size: 1024 * 1024, // 1MB
      category: docType
    };
    
    setSelectedDocument(mockDocument);
    setShowDocumentViewer(true);
  };

  const handleReplaceDocument = (docType: string, docLabel: string) => {
    const mockDocument = {
      name: `${docLabel}.pdf`,
      type: 'application/pdf',
      category: docType
    };
    
    setSelectedDocument(mockDocument);
    setShowReplaceModal(true);
  };

  const handleDocumentReplace = async (file: File, metadata: any) => {
    console.log('Replacing document:', file.name, 'for vendor:', editedVendor?.companyName);
    
    // Simulate upload and sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update document status
    if (editedVendor && metadata.category) {
      const docType = metadata.category as keyof typeof editedVendor.requiredDocuments;
      if (docType in editedVendor.requiredDocuments) {
        setEditedVendor(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            requiredDocuments: {
              ...prev.requiredDocuments,
              [docType]: true
            }
          };
        });
        setHasChanges(true);
      }
    }
    
    console.log('Document replaced and synced to external systems');
  };

  const renderBasicInformation = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Basic Company Information</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700 mb-2">
            Company Name
          </label>
          <EditableField
            value={editedVendor?.companyName || ''}
            onSave={(value) => handleFieldUpdate('root', 'companyName', value)}
            placeholder="Company name"
          />
        </div>

        <div>
          <label htmlFor="taxId" className="block text-sm font-medium text-neutral-700 mb-2">
            Tax ID/EIN
          </label>
          <EditableField
            value={editedVendor?.taxId || ''}
            onSave={(value) => handleFieldUpdate('root', 'taxId', value)}
            placeholder="XX-XXXXXXX"
          />
        </div>

        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-neutral-700 mb-2">
            Business Type
          </label>
          <EditableField
            value={editedVendor?.businessType || ''}
            onSave={(value) => handleFieldUpdate('root', 'businessType', value)}
            type="select"
            options={[
              { value: 'Corporation', label: 'Corporation' },
              { value: 'LLC', label: 'LLC' },
              { value: 'Partnership', label: 'Partnership' },
              { value: 'Sole Proprietorship', label: 'Sole Proprietorship' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-neutral-700 mb-2">
            Industry
          </label>
          <EditableField
            value={editedVendor?.industry || ''}
            onSave={(value) => handleFieldUpdate('root', 'industry', value)}
            type="select"
            options={[
              { value: 'Technology', label: 'Technology' },
              { value: 'Manufacturing', label: 'Manufacturing' },
              { value: 'Professional Services', label: 'Professional Services' },
              { value: 'Retail', label: 'Retail' },
              { value: 'Healthcare', label: 'Healthcare' },
              { value: 'Finance', label: 'Finance' },
              { value: 'Food & Beverage', label: 'Food & Beverage' },
              { value: 'Logistics', label: 'Logistics' }
            ]}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="website" className="block text-sm font-medium text-neutral-700 mb-2">
            Website
          </label>
          <EditableField
            value={editedVendor?.website || ''}
            onSave={(value) => handleFieldUpdate('root', 'website', value)}
            placeholder="https://www.example.com"
          />
        </div>
      </div>
    </div>
  );

  const renderContactDetails = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Primary Contact Information</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-neutral-700 mb-2">
            Contact Name
          </label>
          <EditableField
            value={editedVendor?.primaryContact.name || ''}
            onSave={(value) => handleFieldUpdate('primaryContact', 'name', value)}
            placeholder="Full name"
          />
        </div>

        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-neutral-700 mb-2">
            Job Title
          </label>
          <EditableField
            value={editedVendor?.primaryContact.title || ''}
            onSave={(value) => handleFieldUpdate('primaryContact', 'title', value)}
            placeholder="Job title"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
            Email Address
          </label>
          <EditableField
            value={editedVendor?.primaryContact.email || ''}
            onSave={(value) => handleFieldUpdate('primaryContact', 'email', value)}
            type="email"
            placeholder="contact@company.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
            Phone Number
          </label>
          <EditableField
            value={editedVendor?.primaryContact.phone || ''}
            onSave={(value) => handleFieldUpdate('primaryContact', 'phone', value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="bg-neutral-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-neutral-800 mb-3">Contact Verification Status</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-success-500" />
            <span className="text-sm text-neutral-600">Email verified</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-success-500" />
            <span className="text-sm text-neutral-600">Phone verified</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddressDetails = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Business Address</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="street" className="block text-sm font-medium text-neutral-700 mb-2">
            Street Address
          </label>
          <EditableField
            value={editedVendor?.address.street || ''}
            onSave={(value) => handleFieldUpdate('address', 'street', value)}
            placeholder="123 Business St."
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-2">
            City
          </label>
          <EditableField
            value={editedVendor?.address.city || ''}
            onSave={(value) => handleFieldUpdate('address', 'city', value)}
            placeholder="City"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-neutral-700 mb-2">
            State/Province
          </label>
          <EditableField
            value={editedVendor?.address.state || ''}
            onSave={(value) => handleFieldUpdate('address', 'state', value)}
            placeholder="State"
          />
        </div>

        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-neutral-700 mb-2">
            ZIP/Postal Code
          </label>
          <EditableField
            value={editedVendor?.address.zip || ''}
            onSave={(value) => handleFieldUpdate('address', 'zip', value)}
            placeholder="12345"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-neutral-700 mb-2">
            Country
          </label>
          <EditableField
            value={editedVendor?.address.country || ''}
            onSave={(value) => handleFieldUpdate('address', 'country', value)}
            type="select"
            options={[
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' },
              { value: 'MX', label: 'Mexico' },
              { value: 'UK', label: 'United Kingdom' },
              { value: 'DE', label: 'Germany' },
              { value: 'FR', label: 'France' }
            ]}
          />
        </div>
      </div>
    </div>
  );

  const renderBusinessDetails = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Business Information</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="riskRating" className="block text-sm font-medium text-neutral-700 mb-2">
            Risk Rating
          </label>
          <EditableField
            value={editedVendor?.riskRating || ''}
            onSave={(value) => handleFieldUpdate('root', 'riskRating', value)}
            type="select"
            options={[
              { value: 'low', label: 'Low Risk' },
              { value: 'medium', label: 'Medium Risk' },
              { value: 'high', label: 'High Risk' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="contractStatus" className="block text-sm font-medium text-neutral-700 mb-2">
            Contract Status
          </label>
          <EditableField
            value={editedVendor?.contractStatus || ''}
            onSave={(value) => handleFieldUpdate('root', 'contractStatus', value)}
            type="select"
            options={[
              { value: 'none', label: 'No Contract' },
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'terminated', label: 'Terminated' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="performanceScore" className="block text-sm font-medium text-neutral-700 mb-2">
            Performance Score
          </label>
          <EditableField
            value={editedVendor?.performanceScore || 0}
            onSave={(value) => handleFieldUpdate('root', 'performanceScore', value)}
            type="number"
            placeholder="0-100"
          />
        </div>

        <div>
          <label htmlFor="zipStatus" className="block text-sm font-medium text-neutral-700 mb-2">
            ZIP Status
          </label>
          <EditableField
            value={editedVendor?.zipStatus || ''}
            onSave={(value) => handleFieldUpdate('root', 'zipStatus', value)}
            type="select"
            options={[
              { value: 'not_uploaded', label: 'Not Uploaded' },
              { value: 'uploaded', label: 'Uploaded' },
              { value: 'verified', label: 'Verified' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' }
            ]}
          />
        </div>
      </div>

      <div className="bg-warning-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning-800">Business Information Updates</p>
            <p className="text-sm text-warning-700 mt-1">
              Changes to business details will be automatically synced to ZIP, Coupa, NetSuite, and Process Unity systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatusManagement = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Status & Performance Management</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="onboardingStatus" className="block text-sm font-medium text-neutral-700 mb-2">
            Onboarding Status
          </label>
          <EditableField
            value={editedVendor?.onboardingStatus || ''}
            onSave={(value) => handleFieldUpdate('root', 'onboardingStatus', value)}
            type="select"
            options={[
              { value: 'not_started', label: 'Not Started' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'suspended', label: 'Suspended' }
            ]}
          />
        </div>

        <div>
          <label htmlFor="onboardingPhase" className="block text-sm font-medium text-neutral-700 mb-2">
            Onboarding Phase
          </label>
          <EditableField
            value={editedVendor?.onboardingPhase || ''}
            onSave={(value) => handleFieldUpdate('root', 'onboardingPhase', value)}
            type="select"
            options={[
              { value: 'registration', label: 'Registration' },
              { value: 'qualification', label: 'Qualification' },
              { value: 'due_diligence', label: 'Due Diligence' },
              { value: 'final_approval', label: 'Final Approval' },
              { value: 'completed', label: 'Completed' }
            ]}
          />
        </div>
      </div>

      <div className="bg-neutral-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-neutral-800 mb-3">Performance Metrics</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-neutral-900">
              {editedVendor?.performanceScore || 0}%
            </p>
            <p className="text-sm text-neutral-600">Overall Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-success-600">98%</p>
            <p className="text-sm text-neutral-600">On-time Delivery</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-primary-600">4.8/5</p>
            <p className="text-sm text-neutral-600">Quality Rating</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="text-sm font-medium text-neutral-800">Status Change History</h5>
        <div className="space-y-3">
          {[
            { date: '2024-03-15', status: 'Approved', user: 'Sarah Johnson', note: 'All requirements met' },
            { date: '2024-03-10', status: 'Pending Approval', user: 'System', note: 'Submitted for final review' },
            { date: '2024-03-05', status: 'In Progress', user: 'Michael Chen', note: 'Due diligence phase started' },
            { date: '2024-03-01', status: 'Registration', user: 'System', note: 'Initial application received' }
          ].map((entry, index) => {
            const key = `${index}`;

            return (
              <div key={key} className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-neutral-200">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-900">{entry.status}</p>
                    <p className="text-xs text-neutral-500">{entry.date}</p>
                  </div>
                  <p className="text-sm text-neutral-600">{entry.note}</p>
                  <p className="text-xs text-neutral-500">by {entry.user}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDocumentManagement = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Document Management</h4>
      
      <div className="space-y-4">
        {Object.entries({
          w9Form: { label: 'W-9 Tax Form', category: 'tax', required: true },
          insurance: { label: 'Certificate of Insurance', category: 'insurance', required: true },
          financialStatements: { label: 'Financial Statements', category: 'financial', required: true },
          complianceCerts: { label: 'Compliance Certifications', category: 'compliance', required: true },
          securityPolicy: { label: 'Security Policies', category: 'security', required: true }
        }).map(([key, doc]) => (
          <div key={key} className="border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {editedVendor?.requiredDocuments[key as keyof typeof editedVendor.requiredDocuments] ? (
                  <CheckCircle className="h-5 w-5 text-success-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning-500" />
                )}
                <div>
                  <p className="font-medium text-neutral-900">
                    {doc.label} {doc.required && <span className="text-error-500">*</span>}
                  </p>
                  <p className="text-sm text-neutral-500">
                    Status: {editedVendor?.requiredDocuments[key as keyof typeof editedVendor.requiredDocuments] ? 'Uploaded' : 'Missing'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {editedVendor?.requiredDocuments[key as keyof typeof editedVendor.requiredDocuments] ? (
                  <>
                    <Button variant="outline" size="sm">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<Eye size={14} />}
                        onClick={() => handleViewDocument(key, doc.label)}
                      >
                        View
                      </Button>
                    </Button>
                    <Button variant="outline" size="sm">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        leftIcon={<FileText size={14} />}
                        onClick={() => handleReplaceDocument(key, doc.label)}
                      >
                        Replace
                      </Button>
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm">
                    Upload
                  </Button>
                )}
              </div>
            </div>
            
            {!editedVendor?.requiredDocuments[key as keyof typeof editedVendor.requiredDocuments] && (
              <DocumentUpload
                onUpload={(file, metadata) => handleDocumentUpload(file, { ...metadata, category: key })}
                acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.png']}
                maxSize={25}
                category={doc.category}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-primary-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary-800">Document Sync</p>
            <p className="text-sm text-primary-700 mt-1">
              All document changes are automatically synced to ZIP, Coupa, NetSuite, and Process Unity systems for compliance tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInformation();
      case 'contact':
        return renderContactDetails();
      case 'address':
        return renderAddressDetails();
      case 'business':
        return renderBusinessDetails();
      case 'status':
        return renderStatusManagement();
      case 'documents':
        return renderDocumentManagement();
      default:
        return null;
    }
  };

  if (!isOpen || !editedVendor) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Edit Vendor</h2>
              <p className="text-sm text-neutral-500 mt-1">{editedVendor.companyName}</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <span className="text-sm text-warning-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Unsaved changes
                </span>
              )}
              <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-4 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {renderTabContent()}
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                disabled={!hasChanges}
              >
                Save Draft
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave}
                disabled={!hasChanges}
                isLoading={isSaving}
                leftIcon={<Save size={16} />}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onReplace={() => {
          setShowDocumentViewer(false);
          setShowReplaceModal(true);
        }}
      />

      {/* Document Replace Modal */}
      <DocumentReplaceModal
        isOpen={showReplaceModal}
        onClose={() => {
          setShowReplaceModal(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onReplace={handleDocumentReplace}
      />
    </div>
  );
};

export default VendorEditModal;