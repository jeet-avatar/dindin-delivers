import React, { useState, useRef } from 'react';
import * as Papa from 'papaparse';

interface MigrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (results: ImportResults) => void;
}

interface ImportResults {
  imported: number;
  failed: number;
  duplicates?: number;
  errors: Array<{ row?: number; reason: string }>;
}

// ── CRM source config ────────────────────────────────────────────────────────

const CRM_SOURCES = [
  { id: 'salesforce', name: 'Salesforce', icon: '☁️' },
  { id: 'hubspot', name: 'HubSpot', icon: '🟠' },
  { id: 'erp', name: 'ERP', icon: '🔷' },
  { id: 'pipedrive', name: 'Pipedrive', icon: '🟢' },
  { id: 'zoho', name: 'Zoho CRM', icon: '🔴' },
  { id: 'generic', name: 'Generic CSV', icon: '📄' },
];

// ── CSV template headers per CRM ─────────────────────────────────────────────

interface TemplateConfig {
  contacts: string[];
  companies: string[];
  deals: string[];
}

const CRM_TEMPLATES: Record<string, TemplateConfig> = {
  salesforce: {
    contacts: ['First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Title', 'Account Name', 'Lead Status', 'Description'],
    companies: ['Account Name', 'Website', 'Industry', 'Employees', 'Billing City', 'Billing State', 'Phone', 'Description', 'Annual Revenue'],
    deals: ['Opportunity Name', 'Amount', 'Stage', 'Close Date', 'Account Name', 'Contact Name', 'Description', 'Probability'],
  },
  hubspot: {
    contacts: ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Job Title', 'Company Name', 'Lifecycle Stage', 'Notes'],
    companies: ['Company name', 'Company Domain Name', 'Industry', 'Number of Employees', 'City', 'State/Region', 'Phone Number', 'Description', 'Annual Revenue'],
    deals: ['Deal Name', 'Amount', 'Deal Stage', 'Close Date', 'Associated Company', 'Description', 'Deal Probability'],
  },
  erp: {
    contacts: ['First Name', 'Last Name', 'Email', 'Phone', 'Title', 'Company', 'Status', 'Notes'],
    companies: ['Name', 'Website', 'Industry', 'Employee Count', 'Location', 'Phone', 'Description'],
    deals: ['Title', 'Amount', 'Stage', 'Expected Close Date', 'Company Name', 'Contact Email', 'Description'],
  },
  pipedrive: {
    contacts: ['First name', 'Last name', 'Email', 'Phone', 'Job title', 'Organization name', 'Notes'],
    companies: ['Name', 'Address', 'Industry', 'Employee Count', 'Website', 'Phone', 'Description'],
    deals: ['Title', 'Value', 'Stage', 'Expected Close Date', 'Organization Name', 'Person Name', 'Notes'],
  },
  zoho: {
    contacts: ['First Name', 'Last Name', 'Email', 'Phone', 'Title', 'Account Name', 'Lead Status', 'Description'],
    companies: ['Account Name', 'Website', 'Industry', 'Employees', 'Billing City', 'Phone', 'Description'],
    deals: ['Deal Name', 'Amount', 'Stage', 'Closing Date', 'Account Name', 'Contact Name', 'Description'],
  },
  generic: {
    contacts: ['firstName', 'lastName', 'email', 'phone', 'title', 'company', 'status', 'notes', 'linkedin', 'location'],
    companies: ['name', 'domain', 'website', 'industry', 'size', 'location', 'phone', 'description', 'revenue', 'employeeCount'],
    deals: ['title', 'value', 'stage', 'expectedCloseDate', 'contactEmail', 'companyName', 'description'],
  },
};

// ── Field options per entity type ─────────────────────────────────────────────

const FIELD_OPTIONS: Record<string, Array<{ value: string; label: string; required?: boolean }>> = {
  contacts: [
    { value: 'skip', label: '— Skip this column —' },
    { value: 'firstName', label: 'First Name', required: true },
    { value: 'lastName', label: 'Last Name', required: true },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'title', label: 'Job Title' },
    { value: 'company', label: 'Company Name' },
    { value: 'status', label: 'Status' },
    { value: 'notes', label: 'Notes' },
    { value: 'linkedin', label: 'LinkedIn URL' },
    { value: 'location', label: 'Location' },
  ],
  companies: [
    { value: 'skip', label: '— Skip this column —' },
    { value: 'name', label: 'Company Name', required: true },
    { value: 'domain', label: 'Domain' },
    { value: 'website', label: 'Website' },
    { value: 'industry', label: 'Industry' },
    { value: 'size', label: 'Size' },
    { value: 'location', label: 'Location' },
    { value: 'phone', label: 'Phone' },
    { value: 'description', label: 'Description' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'employeeCount', label: 'Employee Count' },
    { value: 'linkedin', label: 'LinkedIn URL' },
  ],
  deals: [
    { value: 'skip', label: '— Skip this column —' },
    { value: 'title', label: 'Deal Title', required: true },
    { value: 'value', label: 'Deal Value ($)', required: true },
    { value: 'stage', label: 'Stage' },
    { value: 'probability', label: 'Probability (%)' },
    { value: 'expectedCloseDate', label: 'Expected Close Date' },
    { value: 'contactEmail', label: 'Contact Email' },
    { value: 'companyName', label: 'Company Name' },
    { value: 'description', label: 'Description' },
  ],
};

// ── Auto-mapping helper ───────────────────────────────────────────────────────

const ALIAS_MAP: Record<string, string> = {
  // contacts
  'first name': 'firstName', 'firstname': 'firstName',
  'last name': 'lastName', 'lastname': 'lastName',
  'email address': 'email', 'email': 'email',
  'phone number': 'phone', 'phone': 'phone', 'mobile': 'phone',
  'job title': 'title', 'title': 'title',
  'company name': 'company', 'account name': 'company', 'organization name': 'company', 'company': 'company',
  'lead status': 'status', 'lifecycle stage': 'status', 'status': 'status',
  'notes': 'notes', 'description': 'description',
  'linkedin': 'linkedin',
  'location': 'location', 'billing city': 'location', 'address': 'location',
  // companies
  'name': 'name',
  'website': 'website',
  'domain': 'domain', 'company domain name': 'domain',
  'industry': 'industry',
  'size': 'size',
  'employees': 'employeeCount', 'number of employees': 'employeeCount', 'employee count': 'employeeCount',
  'revenue': 'revenue', 'annual revenue': 'revenue',
  // deals
  'opportunity name': 'title', 'deal name': 'title',
  'amount': 'value', 'value': 'value',
  'stage': 'stage', 'deal stage': 'stage',
  'close date': 'expectedCloseDate', 'expected close date': 'expectedCloseDate', 'closing date': 'expectedCloseDate',
  'contact email': 'contactEmail',
};

const autoMapColumns = (csvHeaders: string[], et: string): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const fields = FIELD_OPTIONS[et] ?? [];
  csvHeaders.forEach(header => {
    const normalized = header.toLowerCase().trim();
    const mapped = ALIAS_MAP[normalized];
    if (mapped && fields.some(f => f.value === mapped)) {
      mapping[header] = mapped;
    } else {
      mapping[header] = 'skip';
    }
  });
  return mapping;
};

// ── Step indicator ────────────────────────────────────────────────────────────

const STEP_LABELS = ['Choose CRM', 'Entity Type', 'Upload CSV', 'Map Columns', 'Import'];

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
    {STEP_LABELS.map((label, idx) => {
      const stepNum = idx + 1;
      const isActive = stepNum === currentStep;
      const isDone = stepNum < currentStep;
      return (
        <React.Fragment key={stepNum}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isDone || isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              border: `2px solid ${isDone || isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDone || isActive ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.875rem',
            }}>
              {isDone ? '✓' : stepNum}
            </div>
            <span style={{ marginTop: 4, fontSize: '0.75rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: isActive ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {idx < STEP_LABELS.length - 1 && (
            <div style={{ height: 2, flex: 1, background: stepNum < currentStep ? 'var(--accent-primary)' : 'var(--border-default)', margin: '0 0.25rem', marginBottom: 20 }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export function MigrationWizardModal({ isOpen, onClose, onImportComplete }: MigrationWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCRM, setSelectedCRM] = useState<string>('');
  const [entityType, setEntityType] = useState<'contacts' | 'companies' | 'deals' | ''>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mappingError, setMappingError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ── Template download ───────────────────────────────────────────────────────

  const downloadTemplate = () => {
    if (!selectedCRM || !entityType) return;
    const headers = CRM_TEMPLATES[selectedCRM]?.[entityType] ?? [];
    const exampleRow = headers.map(() => '').join(',');
    const csv = headers.join(',') + '\n' + exampleRow;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCRM}-${entityType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── File upload / papaparse ─────────────────────────────────────────────────

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = (results.meta.fields ?? []) as string[];
        setCsvHeaders(headers);
        setCsvData(results.data as Record<string, string>[]);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // ── Validation for step 4 → 5 ──────────────────────────────────────────────

  const validateMappings = (): string => {
    const values = Object.values(columnMappings);
    if (entityType === 'contacts') {
      const missing = [];
      if (!values.includes('firstName')) missing.push('First Name');
      if (!values.includes('lastName')) missing.push('Last Name');
      if (missing.length > 0) return `Required fields not mapped: ${missing.join(', ')}`;
    } else if (entityType === 'companies') {
      if (!values.includes('name')) return 'Required field not mapped: Company Name';
    } else if (entityType === 'deals') {
      const missing = [];
      if (!values.includes('title')) missing.push('Deal Title');
      if (!values.includes('value')) missing.push('Deal Value');
      if (missing.length > 0) return `Required fields not mapped: ${missing.join(', ')}`;
    }
    return '';
  };

  // ── Import handler ──────────────────────────────────────────────────────────

  const handleImport = async () => {
    setIsImporting(true);
    setCurrentStep(5);
    const token = localStorage.getItem('crmToken');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      if (entityType === 'contacts') {
        const mappedHeaders = Object.entries(columnMappings)
          .filter(([_, v]) => v !== 'skip')
          .map(([csvCol, zietraField]) => ({ csvCol, zietraField }));
        const newHeaders = mappedHeaders.map(m => m.zietraField);
        const renamedRows = csvData.map(row => {
          const renamed: Record<string, string> = {};
          mappedHeaders.forEach(({ csvCol, zietraField }) => {
            renamed[zietraField] = row[csvCol] ?? '';
          });
          return renamed;
        });
        const csvContent = [
          newHeaders.join(','),
          ...renamedRows.map(row => newHeaders.map(h => `"${(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const formData = new FormData();
        formData.append('files[]', blob, 'import.csv');
        const res = await fetch(`${apiUrl}/api/contacts/csv-import`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        setImportResults({
          imported: data.contactsImported ?? 0,
          duplicates: data.duplicates ?? 0,
          failed: data.errors?.length ?? 0,
          errors: (data.errors ?? []).map((e: string) => ({ reason: e })),
        });
      } else if (entityType === 'companies') {
        const mappedHeaders = Object.entries(columnMappings)
          .filter(([_, v]) => v !== 'skip')
          .map(([csvCol, zietraField]) => ({ csvCol, zietraField }));
        const newHeaders = mappedHeaders.map(m => m.zietraField);
        const csvContent = [
          newHeaders.join(','),
          ...csvData.map(row =>
            newHeaders.map(h => {
              const csvCol = mappedHeaders.find(m => m.zietraField === h)?.csvCol ?? '';
              return `"${(row[csvCol] ?? '').replace(/"/g, '""')}"`;
            }).join(',')
          ),
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const formData = new FormData();
        formData.append('file', blob, 'import.csv');
        const res = await fetch(`${apiUrl}/api/companies/import`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        setImportResults({
          imported: data.imported ?? 0,
          duplicates: data.duplicates ?? 0,
          failed: data.errors?.length ?? 0,
          errors: (data.errors ?? []).map((e: string) => ({ reason: e })),
        });
      } else if (entityType === 'deals') {
        const mappedDeals = csvData.map(row => {
          const deal: Record<string, string> = {};
          Object.entries(columnMappings).forEach(([csvCol, zietraField]) => {
            if (zietraField !== 'skip') {
              deal[zietraField] = row[csvCol] ?? '';
            }
          });
          return deal;
        }).filter(d => d.title && d.value);
        const res = await fetch(`${apiUrl}/api/deals/bulk-import`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deals: mappedDeals }),
        });
        const data = await res.json();
        setImportResults({
          imported: data.imported ?? 0,
          failed: data.failed ?? 0,
          errors: data.errors ?? [],
        });
      }
    } catch (err) {
      setImportResults({
        imported: 0,
        failed: csvData.length,
        errors: [{ reason: `Network error: ${err}` }],
      });
    } finally {
      setIsImporting(false);
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────

  const resetAll = () => {
    setCurrentStep(1);
    setSelectedCRM('');
    setEntityType('');
    setUploadedFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMappings({});
    setImportResults(null);
    setIsImporting(false);
    setMappingError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: 'var(--bg-elevated)', borderRadius: '1rem', width: '100%', maxWidth: '52rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>CRM Migration Wizard</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Import your contacts, companies, and deals from any CRM
            </p>
          </div>
          <button
            onClick={() => { resetAll(); onClose(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.25rem', lineHeight: 1, padding: 4 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* ── STEP 1: Choose Source CRM ─────────────────────────────────── */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                Step 1: Choose your source CRM
              </h3>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Select the CRM you are migrating from to get the right template CSV.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {CRM_SOURCES.map(crm => (
                  <button
                    key={crm.id}
                    onClick={() => { setSelectedCRM(crm.id); setCurrentStep(2); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '1.25rem 0.75rem', borderRadius: '0.75rem', cursor: 'pointer',
                      border: selectedCRM === crm.id ? '2px solid var(--accent-primary)' : '2px solid var(--border-default)',
                      background: selectedCRM === crm.id ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{crm.icon}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{crm.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Entity Type + Template Download ───────────────────── */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                Step 2: What would you like to import?
              </h3>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Source: <strong style={{ color: 'var(--text-primary)' }}>{CRM_SOURCES.find(c => c.id === selectedCRM)?.name}</strong>
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {(['contacts', 'companies', 'deals'] as const).map(et => (
                  <button
                    key={et}
                    onClick={() => setEntityType(et)}
                    style={{
                      flex: 1, padding: '1rem', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                      border: entityType === et ? '2px solid var(--accent-primary)' : '2px solid var(--border-default)',
                      background: entityType === et ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                      color: entityType === et ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontSize: '0.9375rem', transition: 'all 0.15s',
                    }}
                  >
                    {et.charAt(0).toUpperCase() + et.slice(1)}
                  </button>
                ))}
              </div>

              {entityType && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Download a pre-filled template CSV with the correct column names for <strong style={{ color: 'var(--text-primary)' }}>{CRM_SOURCES.find(c => c.id === selectedCRM)?.name} {entityType}</strong>.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}
                  >
                    Download Template CSV
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => setCurrentStep(1)} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!entityType}
                  style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: entityType ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: entityType ? 1 : 0.5 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Upload CSV ────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                Step 3: Upload your CSV file
              </h3>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Upload the CSV you downloaded (or filled in) for <strong style={{ color: 'var(--text-primary)' }}>{entityType}</strong>.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  borderRadius: '0.75rem', padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  transition: 'all 0.15s', marginBottom: '1rem',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</div>
                <p style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {uploadedFile ? uploadedFile.name : 'Drop your CSV file here'}
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
              </div>

              {/* Column preview */}
              {csvHeaders.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-default)', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                    Detected {csvHeaders.length} columns · {csvData.length} rows
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {csvHeaders.slice(0, 8).map(h => (
                      <span key={h} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        {h}
                      </span>
                    ))}
                    {csvHeaders.length > 8 && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                        +{csvHeaders.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => setCurrentStep(2)} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Back
                </button>
                <button
                  onClick={() => {
                    const initialMappings = autoMapColumns(csvHeaders, entityType);
                    setColumnMappings(initialMappings);
                    setMappingError('');
                    setCurrentStep(4);
                  }}
                  disabled={!uploadedFile || csvHeaders.length === 0}
                  style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: (uploadedFile && csvHeaders.length > 0) ? 'pointer' : 'not-allowed', fontWeight: 600, opacity: (uploadedFile && csvHeaders.length > 0) ? 1 : 0.5 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Column Mapping ────────────────────────────────────── */}
          {currentStep === 4 && (
            <div>
              <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600 }}>
                Step 4: Map your columns
              </h3>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Match each CSV column to the correct Zietra field. Columns auto-mapped based on column names.
              </p>

              {mappingError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
                  {mappingError}
                </div>
              )}

              <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid var(--border-default)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }}>CSV Column</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }}>Sample Value</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-default)' }}>Zietra Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvHeaders.map((header, idx) => (
                      <tr key={header} style={{ borderBottom: idx < csvHeaders.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
                        <td style={{ padding: '0.625rem 1rem', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>{header}</td>
                        <td style={{ padding: '0.625rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {csvData[0]?.[header] ?? '—'}
                        </td>
                        <td style={{ padding: '0.5rem 1rem' }}>
                          <select
                            value={columnMappings[header] ?? 'skip'}
                            onChange={e => setColumnMappings(prev => ({ ...prev, [header]: e.target.value }))}
                            style={{ width: '100%', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                          >
                            {(FIELD_OPTIONS[entityType] ?? []).map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => setCurrentStep(3)} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Back
                </button>
                <button
                  onClick={() => {
                    const err = validateMappings();
                    if (err) { setMappingError(err); return; }
                    setMappingError('');
                    handleImport();
                  }}
                  style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Preview &amp; Import ({csvData.length} rows)
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Results ───────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              {isImporting ? (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Importing your data...</p>
                </>
              ) : importResults ? (
                <>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                    {importResults.imported}
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                    Records Imported
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    {importResults.duplicates ?? 0} duplicates skipped &nbsp;·&nbsp; {importResults.failed} failed
                  </div>
                  {importResults.errors.length > 0 && (
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', maxHeight: 200, overflowY: 'auto', textAlign: 'left' }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Errors:</p>
                      {importResults.errors.map((err, idx) => (
                        <div key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '0.25rem 0' }}>
                          {'row' in err && err.row ? `Row ${err.row}: ` : ''}{err.reason}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button onClick={resetAll} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Import More
                    </button>
                    <button
                      onClick={() => { onImportComplete(importResults); resetAll(); onClose(); }}
                      style={{ background: 'var(--accent-gradient)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default MigrationWizardModal;
