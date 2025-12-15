import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Building, 
  User, 
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Button from '../ui/Button';
import DocumentUpload from '../ui/DocumentUpload';
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

interface ZipVendorUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
}

const ZipVendorUploadModal: React.FC<ZipVendorUploadModalProps> = ({ isOpen, onClose, vendor }) => {
  const [activeSection, setActiveSection] = useState('basic');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [zipFormData, setZipFormData] = useState({
    // Basic Vendor Information
    legalBusinessName: vendor?.companyName || '',
    dbaName: '',
    taxIdNumber: vendor?.taxId || '',
    businessType: vendor?.businessType || '',
    incorporationState: '',
    businessLicense: '',
    
    // Address Information
    businessAddress: {
      street: vendor?.address.street || '',
      city: vendor?.address.city || '',
      state: vendor?.address.state || '',
      zip: vendor?.address.zip || '',
      country: vendor?.address.country || 'US'
    },
    remitToAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      sameAsBusiness: true
    },
    
    // Contact Information
    primaryContact: {
      name: vendor?.primaryContact.name || '',
      title: vendor?.primaryContact.title || '',
      email: vendor?.primaryContact.email || '',
      phone: vendor?.primaryContact.phone || ''
    },
    accountsPayableContact: {
      name: '',
      title: '',
      email: '',
      phone: ''
    },
    
    // Banking Information
    bankingDetails: {
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      accountType: 'checking',
      swiftCode: '',
      intermediaryBank: ''
    },
    
    // Tax Information
    taxInfo: {
      taxClassification: '',
      exemptPayeeCode: '',
      fatcaReporting: false,
      backupWithholding: false,
      foreignTaxId: ''
    },
    
    // Insurance Information
    insurance: {
      generalLiability: {
        carrier: '',
        policyNumber: '',
        coverage: '',
        expirationDate: ''
      },
      workersComp: {
        carrier: '',
        policyNumber: '',
        coverage: '',
        expirationDate: ''
      },
      professionalLiability: {
        carrier: '',
        policyNumber: '',
        coverage: '',
        expirationDate: ''
      }
    },
    
    // Compliance Information
    compliance: {
      minorityOwned: false,
      womanOwned: false,
      veteranOwned: false,
      smallBusiness: false,
      disadvantagedBusiness: false,
      hubzoneQualified: false
    },
    
    // Additional Information
    capabilities: '',
    certifications: '',
    references: ['', '', ''],
    additionalInfo: ''
  });

  const sections = [
    { id: 'basic', label: 'Basic Information', icon: Building },
    { id: 'contacts', label: 'Contacts', icon: User },
    { id: 'banking', label: 'Banking & Tax', icon: CreditCard },
    { id: 'insurance', label: 'Insurance', icon: Shield },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  const handleCheckboxChange = (key: keyof typeof zipFormData.compliance) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setZipFormData(prev => ({ 
      ...prev, 
      compliance: { 
        ...prev.compliance, 
        [key]: e.target.checked 
      }
    }));
};

  const handleDocumentUpload = async (file: File, metadata: any) => {
    console.log('Uploading document to ZIP:', file.name, metadata);
    
    // Simulate upload progress
    const documentType = metadata.category;
    setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setUploadProgress(prev => ({ ...prev, [documentType]: i }));
    }
    
    console.log('Document uploaded and synced to ZIP system');
  };

  const renderBasicInformation = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Basic Vendor Information</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="legalBusinessName" className="block text-sm font-medium text-neutral-700 mb-1">
            Legal Business Name *
          </label>
          <input
            type="text"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={zipFormData.legalBusinessName}
            onChange={e => setZipFormData(prev => ({ ...prev, legalBusinessName: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="dbaName" className="block text-sm font-medium text-neutral-700 mb-1">
            DBA Name (if different)
          </label>
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={zipFormData.dbaName}
            onChange={e => setZipFormData(prev => ({ ...prev, dbaName: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="taxIdNumber" className="block text-sm font-medium text-neutral-700 mb-1">
            Tax ID Number *
          </label>
          <input
            type="text"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={zipFormData.taxIdNumber}
            onChange={e => setZipFormData(prev => ({ ...prev, taxIdNumber: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-neutral-700 mb-1">
            Business Type *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={zipFormData.businessType}
            onChange={e => setZipFormData(prev => ({ ...prev, businessType: e.target.value }))}
          >
            <option value="">Select Business Type</option>
            <option value="corporation">Corporation</option>
            <option value="llc">LLC</option>
            <option value="partnership">Partnership</option>
            <option value="sole_proprietorship">Sole Proprietorship</option>
          </select>
        </div>

        <div>
          <label htmlFor="incorporationState" className="block text-sm font-medium text-neutral-700 mb-1">
            State of Incorporation *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={zipFormData.incorporationState}
            onChange={e => setZipFormData(prev => ({ ...prev, incorporationState: e.target.value }))}
          >
            <option value="">Select State</option>
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="DE">Delaware</option>
          </select>
        </div>

        <div>
          <label htmlFor="businessLicense" className="block text-sm font-medium text-neutral-700 mb-1">
            Business License Number
          </label>
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={zipFormData.businessLicense}
            onChange={e => setZipFormData(prev => ({ ...prev, businessLicense: e.target.value }))}
          />
        </div>
      </div>

      {/* Business Address */}
      <div>
        <h5 className="text-md font-medium text-neutral-800 mb-4">Business Address</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="streetAddress" className="block text-sm font-medium text-neutral-700 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.businessAddress.street}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                businessAddress: { ...prev.businessAddress, street: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-1">
              City *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.businessAddress.city}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                businessAddress: { ...prev.businessAddress, city: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-neutral-700 mb-1">
              State *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.businessAddress.state}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                businessAddress: { ...prev.businessAddress, state: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-neutral-700 mb-1">
              ZIP Code *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.businessAddress.zip}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                businessAddress: { ...prev.businessAddress, zip: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-neutral-700 mb-1">
              Country *
            </label>
            <select
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.businessAddress.country}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                businessAddress: { ...prev.businessAddress, country: e.target.value }
              }))}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="MX">Mexico</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBankingSection = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Banking & Tax Information</h4>
      
      {/* Banking Details */}
      <div>
        <h5 className="text-md font-medium text-neutral-800 mb-4">Banking Information</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-neutral-700 mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.bankingDetails.bankName}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                bankingDetails: { ...prev.bankingDetails, bankName: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-neutral-700 mb-1">
              Account Number *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.bankingDetails.accountNumber}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                bankingDetails: { ...prev.bankingDetails, accountNumber: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="routingNumber" className="block text-sm font-medium text-neutral-700 mb-1">
              Routing Number *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.bankingDetails.routingNumber}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                bankingDetails: { ...prev.bankingDetails, routingNumber: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-neutral-700 mb-1">
              Account Type *
            </label>
            <select
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.bankingDetails.accountType}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                bankingDetails: { ...prev.bankingDetails, accountType: e.target.value }
              }))}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax Information */}
      <div>
        <h5 className="text-md font-medium text-neutral-800 mb-4">Tax Information</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="taxClassification" className="block text-sm font-medium text-neutral-700 mb-1">
              Tax Classification *
            </label>
            <select
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.taxInfo.taxClassification}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                taxInfo: { ...prev.taxInfo, taxClassification: e.target.value }
              }))}
            >
              <option value="">Select Classification</option>
              <option value="individual">Individual/Sole Proprietor</option>
              <option value="c_corp">C Corporation</option>
              <option value="s_corp">S Corporation</option>
              <option value="partnership">Partnership</option>
              <option value="llc">Limited Liability Company</option>
            </select>
          </div>

          <div>
            <label htmlFor="exemptPayeeCode" className="block text-sm font-medium text-neutral-700 mb-1">
              Exempt Payee Code
            </label>
            <input
              type="text"
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.taxInfo.exemptPayeeCode}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                taxInfo: { ...prev.taxInfo, exemptPayeeCode: e.target.value }
              }))}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label htmlFor="fatcaReporting" className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              checked={zipFormData.taxInfo.fatcaReporting}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                taxInfo: { ...prev.taxInfo, fatcaReporting: e.target.checked }
              }))}
            />
            <span className="ml-2 text-sm text-neutral-700">
              Subject to FATCA reporting
            </span>
          </label>

          <label htmlFor="backupWithholding" className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              checked={zipFormData.taxInfo.backupWithholding}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                taxInfo: { ...prev.taxInfo, backupWithholding: e.target.checked }
              }))}
            />
            <span className="ml-2 text-sm text-neutral-700">
              Subject to backup withholding
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderInsuranceSection = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Insurance Information</h4>
      
      {/* General Liability */}
      <div>
        <h5 className="text-md font-medium text-neutral-800 mb-4">General Liability Insurance</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="insuranceCarrier" className="block text-sm font-medium text-neutral-700 mb-1">
              Insurance Carrier *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.insurance.generalLiability.carrier}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                insurance: { 
                  ...prev.insurance, 
                  generalLiability: { ...prev.insurance.generalLiability, carrier: e.target.value }
                }
              }))}
            />
          </div>

          <div>
            <label htmlFor="policyNumber" className="block text-sm font-medium text-neutral-700 mb-1">
              Policy Number *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.insurance.generalLiability.policyNumber}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                insurance: { 
                  ...prev.insurance, 
                  generalLiability: { ...prev.insurance.generalLiability, policyNumber: e.target.value }
                }
              }))}
            />
          </div>

          <div>
            <label htmlFor="coverage" className="block text-sm font-medium text-neutral-700 mb-1">
              Coverage Amount *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.insurance.generalLiability.coverage}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                insurance: { 
                  ...prev.insurance, 
                  generalLiability: { ...prev.insurance.generalLiability, coverage: e.target.value }
                }
              }))}
              placeholder="e.g., $1,000,000"
            />
          </div>

          <div>
            <label htmlFor="expirationDate" className="block text-sm font-medium text-neutral-700 mb-1">
              Expiration Date *
            </label>
            <input
              type="date"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.insurance.generalLiability.expirationDate}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                insurance: { 
                  ...prev.insurance, 
                  generalLiability: { ...prev.insurance.generalLiability, expirationDate: e.target.value }
                }
              }))}
            />
          </div>
        </div>
      </div>

      {/* Workers Compensation */}
      <div>
        <h5 className="text-md font-medium text-neutral-800 mb-4">Workers' Compensation Insurance</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="insuranceCarrier" className="block text-sm font-medium text-neutral-700 mb-1">
              Insurance Carrier *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.insurance.workersComp.carrier}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                insurance: { 
                  ...prev.insurance, 
                  workersComp: { ...prev.insurance.workersComp, carrier: e.target.value }
                }
              }))}
            />
          </div>

          <div>
            <label htmlFor="policyNumber" className="block text-sm font-medium text-neutral-700 mb-1">
              Policy Number *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={zipFormData.insurance.workersComp.policyNumber}
              onChange={e => setZipFormData(prev => ({ 
                ...prev, 
                insurance: { 
                  ...prev.insurance, 
                  workersComp: { ...prev.insurance.workersComp, policyNumber: e.target.value }
                }
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderComplianceSection = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Compliance & Diversity Information</h4>
      
      <div>
        <h5 className="text-md font-medium text-neutral-800 mb-4">Diversity Classifications</h5>
        <div className="space-y-3">
          {[
            { key: 'minorityOwned', label: 'Minority-Owned Business Enterprise (MBE)' },
            { key: 'womanOwned', label: 'Woman-Owned Business Enterprise (WBE)' },
            { key: 'veteranOwned', label: 'Veteran-Owned Small Business (VOSB)' },
            { key: 'smallBusiness', label: 'Small Business Administration (SBA) Certified' },
            { key: 'disadvantagedBusiness', label: 'Disadvantaged Business Enterprise (DBE)' },
            { key: 'hubzoneQualified', label: 'HUBZone Qualified Small Business' }
          ].map((item) => (
            <label key={item.key} className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                checked={zipFormData.compliance[item.key as keyof typeof zipFormData.compliance]}
                onChange={handleCheckboxChange(item.key as keyof typeof zipFormData.compliance)}
              />
              <span className="ml-2 text-sm text-neutral-700">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="capabilities" className="block text-sm font-medium text-neutral-700 mb-1">
          Company Capabilities
        </label>
        <textarea
          rows={4}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={zipFormData.capabilities}
          onChange={e => setZipFormData(prev => ({ ...prev, capabilities: e.target.value }))}
          placeholder="Describe your company's key capabilities and competitive advantages..."
        />
      </div>

      <div>
        <label htmlFor="certifications" className="block text-sm font-medium text-neutral-700 mb-1">
          Certifications & Awards
        </label>
        <textarea
          rows={3}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={zipFormData.certifications}
          onChange={e => setZipFormData(prev => ({ ...prev, certifications: e.target.value }))}
          placeholder="List relevant certifications, awards, and recognitions..."
        />
      </div>
    </div>
  );

  const renderDocumentsSection = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-neutral-900">Document Upload for ZIP</h4>
      
      <div className="grid grid-cols-1 gap-6">
        {[
          { 
            key: 'w9_form', 
            label: 'W-9 Tax Form', 
            description: 'Required for tax reporting purposes',
            required: true,
            acceptedTypes: ['.pdf', '.doc', '.docx']
          },
          { 
            key: 'certificate_of_insurance', 
            label: 'Certificate of Insurance', 
            description: 'General liability and workers compensation',
            required: true,
            acceptedTypes: ['.pdf', '.doc', '.docx']
          },
          { 
            key: 'bank_letter', 
            label: 'Bank Letter/Voided Check', 
            description: 'For ACH payment setup verification',
            required: true,
            acceptedTypes: ['.pdf', '.jpg', '.png']
          },
          { 
            key: 'business_license', 
            label: 'Business License', 
            description: 'Current business operating license',
            required: false,
            acceptedTypes: ['.pdf', '.doc', '.docx']
          },
          { 
            key: 'financial_statements', 
            label: 'Financial Statements', 
            description: 'Last 2 years of financial statements',
            required: false,
            acceptedTypes: ['.pdf', '.xlsx', '.xls']
          },
          { 
            key: 'diversity_certification', 
            label: 'Diversity Certifications', 
            description: 'MBE, WBE, VOSB, or other diversity certifications',
            required: false,
            acceptedTypes: ['.pdf', '.doc', '.docx']
          }
        ].map((doc) => (
          <div key={doc.key} className="border border-neutral-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h5 className="font-medium text-neutral-900">
                  {doc.label} {doc.required && <span className="text-error-500">*</span>}
                </h5>
                <p className="text-sm text-neutral-500 mt-1">{doc.description}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Accepted formats: {doc.acceptedTypes.join(', ')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {uploadProgress[doc.key] !== undefined && (
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[doc.key]}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500">{uploadProgress[doc.key]}%</span>
                  </div>
                )}
                {uploadProgress[doc.key] === 100 && (
                  <CheckCircle className="h-5 w-5 text-success-500" />
                )}
              </div>
            </div>
            
            <DocumentUpload
              onUpload={(file, metadata) => handleDocumentUpload(file, { ...metadata, category: doc.key })}
              acceptedTypes={doc.acceptedTypes}
              maxSize={25}
              category={doc.key}
            />
          </div>
        ))}
      </div>

      <div className="bg-primary-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary-800">ZIP Integration</p>
            <p className="text-sm text-primary-700 mt-1">
              All uploaded documents will be automatically synced to the ZIP system for vendor verification and approval processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'basic':
        return renderBasicInformation();
      case 'contacts':
        return (
          <div className="text-center py-12 text-neutral-500">
            <User className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>Contact information section is under development.</p>
          </div>
        );
      case 'banking':
        return renderBankingSection();
      case 'insurance':
        return renderInsuranceSection();
      case 'compliance':
        return renderComplianceSection();
      case 'documents':
        return renderDocumentsSection();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">ZIP Vendor Upload</h2>
              {vendor && (
                <p className="text-sm text-neutral-500 mt-1">
                  Uploading vendor details for: {vendor.companyName}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          <div className="flex">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-neutral-50 border-r border-neutral-200">
              <nav className="p-4 space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md ${
                      activeSection === section.id
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <section.icon className="h-5 w-5" />
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {renderSectionContent()}
            </div>
          </div>

          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex space-x-3">
              <Button variant="outline">
                Save Draft
              </Button>
              <Button variant="primary">
                Upload to ZIP
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZipVendorUploadModal;