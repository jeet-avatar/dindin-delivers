import React, { useState, useRef } from 'react';
import { X, Building, User, FileText, Shield, CreditCard, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { ModalOverlay } from '../ui/ModalOverlay';
import Bridge from '../../constants/Bridge';

interface VendorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VendorOnboardingModal: React.FC<VendorOnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [formData, setFormData] = useState({
    // Phase 1: Initial Registration
    companyName: '',
    taxId: '',
    businessRegistrationNumber: '',
    businessType: '',
    industry: '',
    website: '',
    yearEstablished: '',
    annualRevenue: '',
    employeeCount: '',
    naicsCode: '',
    productsServices: '',
    geographicCoverage: '',
    
    // Address Information
    primaryAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    mailingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      sameAsPrimary: true
    },
    
    // Contact Information
    primaryContact: {
      name: '',
      title: '',
      email: '',
      phone: '',
      mobile: ''
    },
    secondaryContact: {
      name: '',
      title: '',
      email: '',
      phone: '',
      mobile: ''
    },
    
    // Phase 2: Qualification Assessment
    dunsNumber: '',
    creditRating: '',
    insuranceCoverage: '',
    bondingCapacity: '',
    professionalLicenses: '',
    qualityCertifications: '',
    safetyRecord: '',
    clientReferences: ['', '', ''],
    bankReferences: ['', ''],
    legalHistory: '',
    
    // Phase 3: Due Diligence
    financialStatements: null,
    taxClearance: null,
    complianceCerts: null,
    insurancePolicy: null,
    qualityDocs: null,
    orgChart: null,
    securityPolicies: null,
    disasterRecovery: null,
    
    // Additional Information
    diversityStatus: '',
    environmentalImpact: '',
    conflictOfInterest: '',
    subcontractorInfo: ''
  });

  const steps = [
    { id: 'registration', title: 'Company Registration', icon: Building },
    { id: 'contacts', title: 'Contact Information', icon: User },
    { id: 'qualification', title: 'Qualification Assessment', icon: Shield },
    { id: 'documents', title: 'Documentation', icon: FileText },
    { id: 'compliance', title: 'Compliance & Risk', icon: Shield },
    { id: 'review', title: 'Review & Submit', icon: CreditCard }
  ];

const handleClientReferenceChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
  const newRefs = [...formData.clientReferences];
  newRefs[index] = e.target.value;
  setFormData(prev => ({ ...prev, clientReferences: newRefs }));
};

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await Bridge.vendorOnboarding.createApplication(formData);
      setApplicationId(response.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit vendor application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setError(null);

    try {
      const response = await Bridge.vendorOnboarding.saveDraft(formData);
      setApplicationId(response.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDocumentUpload = async (docType: string, file: File) => {
    if (!applicationId) {
      // Save draft first to get an application ID
      try {
        const response = await Bridge.vendorOnboarding.saveDraft(formData);
        setApplicationId(response.id);

        // Now upload the document
        setUploadingDoc(docType);
        await Bridge.vendorOnboarding.uploadDocument(response.id, docType, file);
        setFormData(prev => ({ ...prev, [docType]: file.name }));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to upload document');
      } finally {
        setUploadingDoc(null);
      }
    } else {
      setUploadingDoc(docType);
      try {
        await Bridge.vendorOnboarding.uploadDocument(applicationId, docType, file);
        setFormData(prev => ({ ...prev, [docType]: file.name }));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to upload document');
      } finally {
        setUploadingDoc(null);
      }
    }
  };

  const triggerFileUpload = (docType: string) => {
    fileInputRefs.current[docType]?.click();
  };

  const renderRegistrationStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Company Registration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700 mb-1">
            Company Legal Name *
          </label>
          <input
            type="text"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.companyName}
            onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="taxId" className="block text-sm font-medium text-neutral-700 mb-1">
            Tax ID/EIN Number *
          </label>
          <input
            type="text"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.taxId}
            onChange={e => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="businessRegistrationNumber" className="block text-sm font-medium text-neutral-700 mb-1">
            Business Registration Number *
          </label>
          <input
            type="text"
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.businessRegistrationNumber}
            onChange={e => setFormData(prev => ({ ...prev, businessRegistrationNumber: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-neutral-700 mb-1">
            Business Type *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.businessType}
            onChange={e => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
          >
            <option value="">Select Business Type</option>
            <option value="corporation">Corporation</option>
            <option value="llc">LLC</option>
            <option value="partnership">Partnership</option>
            <option value="sole_proprietorship">Sole Proprietorship</option>
          </select>
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-neutral-700 mb-1">
            Industry Classification *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.industry}
            onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
          >
            <option value="">Select Industry</option>
            <option value="technology">Technology</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="services">Professional Services</option>
            <option value="retail">Retail</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
          </select>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-neutral-700 mb-1">
            Website URL
          </label>
          <input
            type="url"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.website}
            onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="yearEstablished" className="block text-sm font-medium text-neutral-700 mb-1">
            Year Established *
          </label>
          <input
            type="number"
            required
            min="1800"
            max={new Date().getFullYear()}
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.yearEstablished}
            onChange={e => setFormData(prev => ({ ...prev, yearEstablished: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="annualRevenue" className="block text-sm font-medium text-neutral-700 mb-1">
            Annual Revenue Range *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.annualRevenue}
            onChange={e => setFormData(prev => ({ ...prev, annualRevenue: e.target.value }))}
          >
            <option value="">Select Revenue Range</option>
            <option value="under_1m">Under $1M</option>
            <option value="1m_10m">$1M - $10M</option>
            <option value="10m_50m">$10M - $50M</option>
            <option value="50m_100m">$50M - $100M</option>
            <option value="over_100m">Over $100M</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="employeeCount" className="block text-sm font-medium text-neutral-700 mb-1">
            Number of Employees *
          </label>
          <select
            required
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.employeeCount}
            onChange={e => setFormData(prev => ({ ...prev, employeeCount: e.target.value }))}
          >
            <option value="">Select Employee Count</option>
            <option value="1_10">1-10</option>
            <option value="11_50">11-50</option>
            <option value="51_200">51-200</option>
            <option value="201_500">201-500</option>
            <option value="over_500">Over 500</option>
          </select>
        </div>

        <div>
          <label htmlFor="naicsCode" className="block text-sm font-medium text-neutral-700 mb-1">
            NAICS Code
          </label>
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.naicsCode}
            onChange={e => setFormData(prev => ({ ...prev, naicsCode: e.target.value }))}
            placeholder="6-digit NAICS code"
          />
        </div>
      </div>

      <div>
        <label htmlFor="productsServices" className="block text-sm font-medium text-neutral-700 mb-1">
          Products/Services Offered *
        </label>
        <textarea
          required
          rows={3}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.productsServices}
          onChange={e => setFormData(prev => ({ ...prev, productsServices: e.target.value }))}
          placeholder="Describe the products or services your company provides..."
        />
      </div>

      <div>
        <label htmlFor="geographicCoverage" className="block text-sm font-medium text-neutral-700 mb-1">
          Geographic Coverage Areas
        </label>
        <textarea
          rows={2}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.geographicCoverage}
          onChange={e => setFormData(prev => ({ ...prev, geographicCoverage: e.target.value }))}
          placeholder="List the geographic areas you serve..."
        />
      </div>
    </div>
  );

  const renderContactsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Contact Information</h3>
      
      {/* Primary Contact */}
      <div>
        <h4 className="text-md font-medium text-neutral-800 mb-4">Primary Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-neutral-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryContact.name}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryContact: { ...prev.primaryContact, name: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-neutral-700 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryContact.title}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryContact: { ...prev.primaryContact, title: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryContact.email}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryContact: { ...prev.primaryContact, email: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryContact.phone}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryContact: { ...prev.primaryContact, phone: e.target.value }
              }))}
            />
          </div>
        </div>
      </div>

      {/* Business Address */}
      <div>
        <h4 className="text-md font-medium text-neutral-800 mb-4">Primary Business Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-neutral-700 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryAddress.street}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryAddress: { ...prev.primaryAddress, street: e.target.value }
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
              value={formData.primaryAddress.city}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryAddress: { ...prev.primaryAddress, city: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-neutral-700 mb-1">
              State/Province *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryAddress.state}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryAddress: { ...prev.primaryAddress, state: e.target.value }
              }))}
            />
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-neutral-700 mb-1">
              ZIP/Postal Code *
            </label>
            <input
              type="text"
              required
              className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={formData.primaryAddress.zip}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryAddress: { ...prev.primaryAddress, zip: e.target.value }
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
              value={formData.primaryAddress.country}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                primaryAddress: { ...prev.primaryAddress, country: e.target.value }
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

  const renderQualificationStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Qualification Assessment</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="dunsNumber" className="block text-sm font-medium text-neutral-700 mb-1">
            D-U-N-S Number
          </label>
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.dunsNumber}
            onChange={e => setFormData(prev => ({ ...prev, dunsNumber: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="creditRating" className="block text-sm font-medium text-neutral-700 mb-1">
            Credit Rating/Score
          </label>
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.creditRating}
            onChange={e => setFormData(prev => ({ ...prev, creditRating: e.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="insuranceCoverage" className="block text-sm font-medium text-neutral-700 mb-1">
            Insurance Coverage Details *
          </label>
          <textarea
            required
            rows={3}
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.insuranceCoverage}
            onChange={e => setFormData(prev => ({ ...prev, insuranceCoverage: e.target.value }))}
            placeholder="Describe your insurance coverage including liability, workers comp, etc."
          />
        </div>

        <div>
          <label htmlFor="bondingCapacity" className="block text-sm font-medium text-neutral-700 mb-1">
            Bonding Capacity
          </label>
          <input
            type="text"
            className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            value={formData.bondingCapacity}
            onChange={e => setFormData(prev => ({ ...prev, bondingCapacity: e.target.value }))}
            placeholder="Maximum bonding capacity"
          />
        </div>
      </div>

      <div>
        <label htmlFor="professionalLicenses" className="block text-sm font-medium text-neutral-700 mb-1">
          Professional Licenses/Certifications
        </label>
        <textarea
          rows={3}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.professionalLicenses}
          onChange={e => setFormData(prev => ({ ...prev, professionalLicenses: e.target.value }))}
          placeholder="List all relevant professional licenses and certifications..."
        />
      </div>

      <div>
        <label htmlFor="qualityCertifications" className="block text-sm font-medium text-neutral-700 mb-1">
          Quality Certifications (ISO, etc.)
        </label>
        <textarea
          rows={3}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          value={formData.qualityCertifications}
          onChange={e => setFormData(prev => ({ ...prev, qualityCertifications: e.target.value }))}
          placeholder="List quality management certifications..."
        />
      </div>

      <div>
        <h4 className="text-md font-medium text-neutral-800 mb-4">Client References (Minimum 3)</h4>
        {formData.clientReferences.map((ref, index) => {
          const key = `${index}`;
          return (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Reference {index + 1} {index < 3 ? '*' : ''}
              </label>
              <input
                type="text"
                required={index < 3}
                className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                value={ref}
                onChange={e => handleClientReferenceChange(index, e)}
                placeholder="Company name, contact person, phone, email"
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Required Documentation</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'financialStatements', label: 'Financial Statements (Last 2 Years)', required: true },
          { key: 'insurancePolicy', label: 'Certificate of Insurance', required: true },
          { key: 'taxClearance', label: 'Tax Clearance Certificates', required: true },
          { key: 'complianceCerts', label: 'Compliance Certifications', required: true },
          { key: 'qualityDocs', label: 'Quality Management System Documentation', required: false },
          { key: 'orgChart', label: 'Organizational Chart', required: false },
          { key: 'securityPolicies', label: 'Data Security Policies', required: true },
          { key: 'disasterRecovery', label: 'Disaster Recovery Plans', required: false }
        ].map((doc) => (
          <div key={doc.key} className="border border-neutral-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-neutral-900">
                  {doc.label} {doc.required && '*'}
                </h4>
                <p className="text-sm text-neutral-500 mt-1">
                  {(formData as any)[doc.key] ? (formData as any)[doc.key] : (doc.required ? 'Required document' : 'Optional document')}
                </p>
              </div>
              <input
                type="file"
                ref={(el) => { fileInputRefs.current[doc.key] = el; }}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDocumentUpload(doc.key, file);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText size={16} />}
                onClick={() => triggerFileUpload(doc.key)}
                isLoading={uploadingDoc === doc.key}
                disabled={!!uploadingDoc}
              >
                {(formData as any)[doc.key] ? 'Replace' : 'Upload'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-neutral-900">Review & Submit</h3>
      
      <div className="bg-neutral-50 rounded-lg p-6">
        <h4 className="text-md font-medium text-neutral-800 mb-4">Application Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-neutral-600">Company Name</p>
            <p className="font-medium text-neutral-900">{formData.companyName || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Tax ID</p>
            <p className="font-medium text-neutral-900">{formData.taxId || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Industry</p>
            <p className="font-medium text-neutral-900">{formData.industry || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600">Primary Contact</p>
            <p className="font-medium text-neutral-900">{formData.primaryContact.name || 'Not provided'}</p>
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-lg p-4">
        <div className="space-y-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              className="h-4 w-4 mt-1 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              required
            />
            <span className="ml-2 text-sm text-neutral-600">
              I certify that all information provided is accurate and complete.
            </span>
          </label>
          <label className="flex items-start">
            <input
              type="checkbox"
              className="h-4 w-4 mt-1 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              required
            />
            <span className="ml-2 text-sm text-neutral-600">
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>
          <label className="flex items-start">
            <input
              type="checkbox"
              className="h-4 w-4 mt-1 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              required
            />
            <span className="ml-2 text-sm text-neutral-600">
              I understand that this application will be reviewed and may require additional documentation.
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderRegistrationStep();
      case 1:
        return renderContactsStep();
      case 2:
        return renderQualificationStep();
      case 3:
        return renderDocumentsStep();
      case 4:
        return (
          <div className="text-center py-12 text-neutral-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>Compliance & Risk Assessment section is under development.</p>
          </div>
        );
      case 5:
        return renderReviewStep();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <ModalOverlay onClose={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900">Vendor Onboarding</h2>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                let stepClass = 'bg-neutral-100 text-neutral-400';
                if (index < currentStep) {
                  stepClass = 'bg-primary-600 text-white';
                } else if (index === currentStep) {
                  stepClass = 'bg-primary-100 text-primary-600 border-2 border-primary-600';
                }

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${stepClass}`}
                    >
                      {index < currentStep ? <CheckCircle size={16} /> : index + 1}
                    </div>
                    <span className={`ml-2 text-sm font-medium hidden lg:block ${
                      index <= currentStep ? 'text-neutral-900' : 'text-neutral-400'
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className="w-12 lg:w-20 mx-2 h-0.5 bg-neutral-200">
                        <div
                          className="h-full bg-primary-600 transition-all duration-300"
                          style={{ width: index < currentStep ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {renderStepContent()}
          </form>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || isSubmitting || isSavingDraft}
            >
              Previous
            </Button>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                isLoading={isSavingDraft}
                disabled={isSubmitting || isSavingDraft}
              >
                Save Draft
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button variant="primary" type="submit" isLoading={isSubmitting} disabled={isSubmitting || isSavingDraft}>
                  Submit Application
                </Button>
              ) : (
                <Button variant="primary" onClick={handleNext} disabled={isSubmitting || isSavingDraft}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorOnboardingModal;