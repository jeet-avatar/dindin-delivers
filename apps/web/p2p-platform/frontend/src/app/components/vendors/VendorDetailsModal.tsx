import React, { useState } from 'react';
import { 
  X, 
  Building, 
  User, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Edit,
  Download,
  Eye,
  Brain,
} from 'lucide-react';
import Button from '../ui/Button';
import DocumentViewer from '../ui/DocumentViewer';
import DocumentReplaceModal from '../ui/DocumentReplaceModal';
import VendorInsightCard from './VendorInsightCard';
import OnboardingProgressTracker from './OnboardingProgressTracker';
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

interface VendorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onEdit?: (vendor: Vendor) => void;
  insights?: any[];
  onActionClick?: (vendorId: string, action: string) => void;
}

const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  vendor,
  onEdit,
  insights = [],
  onActionClick
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  if (!isOpen || !vendor) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'insights', label: 'AI Insights' + (insights.length > 0 ? ' (' + insights.length + ')' : '') },
    { id: 'onboarding', label: 'Onboarding Progress' },
    { id: 'documents', label: 'Documents' },
    { id: 'performance', label: 'Performance' },
    { id: 'compliance', label: 'Compliance' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-primary-500" />;
      case 'pending_approval':
        return <AlertCircle className="h-5 w-5 text-warning-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-error-500" />;
      default:
        return <Clock className="h-5 w-5 text-neutral-500" />;
    }
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

  const handleDocumentReplace = async (file: File) => {
    console.log('Replacing document:', file.name, 'for vendor:', vendor.companyName);
    
    // Simulate upload and sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Document replaced and synced to external systems');
  };

  const renderOverview = () => {
    let riskRating = 'text-error-500';
    if (vendor.riskRating === 'low') {
      riskRating = 'text-success-500';
    } else if (vendor.riskRating === 'medium') {
      riskRating = 'text-warning-500';
    }
                
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-neutral-900">Company Information</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Company Name</p>
                  <p className="font-medium text-neutral-900">{vendor.companyName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Tax ID</p>
                  <p className="font-medium text-neutral-900">{vendor.taxId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Business Type</p>
                  <p className="font-medium text-neutral-900">{vendor.businessType}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Industry</p>
                  <p className="font-medium text-neutral-900">{vendor.industry}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-medium text-neutral-900">Contact Information</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Primary Contact</p>
                  <p className="font-medium text-neutral-900">{vendor.primaryContact.name}</p>
                  <p className="text-sm text-neutral-500">{vendor.primaryContact.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Email</p>
                  <p className="font-medium text-neutral-900">{vendor.primaryContact.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Phone</p>
                  <p className="font-medium text-neutral-900">{vendor.primaryContact.phone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-600">Address</p>
                  <p className="font-medium text-neutral-900">
                    {vendor.address.street}, {vendor.address.city}, {vendor.address.state} {vendor.address.zip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(vendor.onboardingStatus)}
              <div>
                <p className="text-sm text-neutral-600">Onboarding Status</p>
                <p className="font-medium text-neutral-900 capitalize">
                  {vendor.onboardingStatus.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className={`h-5 w-5 ${riskRating}`} />
              <div>
                <p className="text-sm text-neutral-600">Risk Rating</p>
                <p className="font-medium text-neutral-900 capitalize">{vendor.riskRating}</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-600">Performance Score</p>
                <p className="font-medium text-neutral-900">
                  {vendor.performanceScore > 0 ? `${vendor.performanceScore}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOnboardingProgress = () => {
    let vendorDueStatus = 'pending';
    if (vendor.onboardingPhase === 'final_approval' || vendor.onboardingPhase === 'completed') {
      vendorDueStatus = 'completed';
    } else if (vendor.onboardingPhase === 'due_diligence') {
      vendorDueStatus = 'in_progress';
    }

    let finalApprovalStatus = 'pending';
    if (vendor.onboardingPhase === 'completed') {
      finalApprovalStatus = 'completed';
    } else if (vendor.onboardingPhase === 'final_approval') {
      finalApprovalStatus = 'in_progress';
    }

    return (
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-neutral-900">Onboarding Progress</h4>
        
        <div className="space-y-4">
          {[
            { phase: 'registration', title: 'Initial Registration', status: 'completed' },
            { phase: 'qualification', title: 'Qualification Assessment', status: vendor.onboardingPhase === 'qualification' ? 'in_progress' : 'completed' },
            { phase: 'due_diligence', title: 'Due Diligence', status: vendorDueStatus},
            { phase: 'final_approval', title: 'Final Approval', status: finalApprovalStatus}
          ].map((step, index) => {
            let stepBgClass = 'bg-neutral-100';
            if (step.status === 'completed') {
              stepBgClass = 'bg-success-100';
            } else if (step.status === 'in_progress') {
              stepBgClass = 'bg-primary-100';
            }

            let stepIcon  = <span className="text-neutral-400">{index + 1}</span>;
            if (step.status === 'completed') {
              stepIcon    = <CheckCircle className="h-5 w-5 text-success-600" />;
            } else if (step.status === 'in_progress') {
              stepIcon    = <Clock className="h-5 w-5 text-primary-600" />;
            }

            return (
              <div key={step.phase} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stepBgClass}`}>
                  {stepIcon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{step.title}</p>
                  <p className="text-sm text-neutral-500 capitalize">{step.status.replace('_', ' ')}</p>
                </div>
                {step.status === 'in_progress' && (
                  <Button variant="outline" size="sm">
                    Continue
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDocuments = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Required Documents</h4>
      
      <div className="space-y-4">
        {Object.entries({
          w9Form: 'W-9 Tax Form',
          insurance: 'Certificate of Insurance',
          financialStatements: 'Financial Statements',
          complianceCerts: 'Compliance Certifications',
          securityPolicy: 'Security Policies'
        }).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
            <div className="flex items-center space-x-3">
              {vendor.requiredDocuments[key as keyof typeof vendor.requiredDocuments] ? (
                <CheckCircle className="h-5 w-5 text-success-500" />
              ) : (
                <XCircle className="h-5 w-5 text-error-500" />
              )}
              <div>
                <p className="font-medium text-neutral-900">{label}</p>
                <p className="text-sm text-neutral-500">
                  {vendor.requiredDocuments[key as keyof typeof vendor.requiredDocuments] ? 'Uploaded' : 'Missing'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              {vendor.requiredDocuments[key as keyof typeof vendor.requiredDocuments] ? (
                <>
                  <Button variant="outline" size="sm" leftIcon={<Download size={14} />}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      leftIcon={<Eye size={14} />}
                      onClick={() => handleViewDocument(key, label)}
                    >
                      View
                    </Button>
                  </Button>
                  <Button variant="outline" size="sm" leftIcon={<Edit size={14} />}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      leftIcon={<Download size={14} />}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '#'; // Would be actual document URL
                        link.download = `${label}.pdf`;
                        link.click();
                      }}
                    >
                      Download
                    </Button>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    leftIcon={<Edit size={14} />}
                    onClick={() => handleReplaceDocument(key, label)}
                  >
                    Replace
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" leftIcon={<FileText size={14} />}>
                  Upload
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">{vendor.companyName}</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200">
            <nav className="flex space-x-4 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'insights' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-neutral-900">AI-Generated Insights</h4>
                {insights.length > 0 ? (
                  <VendorInsightCard
                    vendor={vendor}
                    insights={insights}
                    onActionClick={onActionClick || (() => {})}
                  />
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p>No AI insights available for this vendor.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'onboarding' && renderOnboardingProgress()}
            {activeTab === 'onboarding' && (
              <OnboardingProgressTracker
                vendor={vendor}
                onActionClick={onActionClick || (() => {})}
              />
            )}
            {activeTab === 'documents' && renderDocuments()}
            {activeTab === 'performance' && (
              <div className="text-center py-12 text-neutral-500">
                <p>Performance metrics section is under development.</p>
              </div>
            )}
            {activeTab === 'compliance' && (
              <div className="text-center py-12 text-neutral-500">
                <p>Compliance tracking section is under development.</p>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                leftIcon={<Edit size={16} />}
                onClick={() => onEdit?.(vendor)}
              >
                Edit Vendor
              </Button>
              <Button variant="primary">
                Update Status
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

export default VendorDetailsModal;