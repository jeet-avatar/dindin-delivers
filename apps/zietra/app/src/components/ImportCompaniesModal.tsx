import { useState, useRef } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import * as Papa from 'papaparse';

interface ImportCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface Company {
  name: string;
  domain?: string;
  industry?: string;
  location?: string;
  size?: string;
  description?: string;
  website?: string;
  employeeCount?: string;
  headquarters?: string;
  enriched?: boolean;
  aiEnhanced?: string[];
}

type ProcessingStatus = 'pending' | 'processing' | 'done' | 'error';

export function ImportCompaniesModal({ isOpen, onClose, onImportComplete }: ImportCompaniesModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [processingStatus, setProcessingStatus] = useState<Record<number, ProcessingStatus>>({});
  const [enrichedCount, setEnrichedCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [importResult, setImportResult] = useState<{ group: string; imported: number; duplicates: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Auto-generate group name from filename
    const baseName = selectedFile.name.replace(/\.\w+$/, '').replace(/[_-]/g, ' ');
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setGroupName(`${baseName} — ${date}`);

    // Parse CSV — accept any text-based file
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // auto-detect delimiter (comma, tab, semicolon)
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          alert('No data found in file. Make sure it has a header row and at least one data row.');
          return;
        }

        // Show detected columns to help debug
        const headers = Object.keys(results.data[0] || {});
        console.log('Detected columns:', headers);

        const parsedCompanies = results.data
          .filter((row: any) => {
            // Try many common column name variations
            return row.name || row.Name || row['Company Name'] || row['company_name'] ||
                   row['Company'] || row.company || row['Organization'] || row['organisation'] ||
                   row['Business Name'] || row['business_name'] || row['Account Name'] ||
                   // If no name column found, use the first non-empty column value
                   Object.values(row).some(v => v && String(v).trim().length > 0);
          })
          .map((row: any) => {
            // Extract company name from many possible column names
            const name = row.name || row.Name || row['Company Name'] || row['company_name'] ||
                         row['Company'] || row.company || row['Organization'] || row['organisation'] ||
                         row['Business Name'] || row['business_name'] || row['Account Name'] ||
                         Object.values(row).find(v => v && String(v).trim().length > 1) || '';

            // Extract other fields from various column names
            const website = row.website || row.Website || row.URL || row.url || row['Web'] || row['web'] || '';
            const domain = row.domain || row.Domain || (website ? String(website).replace(/https?:\/\//g, '').split('/')[0] : '');
            const industry = row.industry || row.Industry || row['Sector'] || row['sector'] || row['Category'] || '';
            const location = row.location || row.Location || row.Headquarters || row['City'] || row['city'] ||
                            row['Address'] || row['Country'] || row['State'] || '';
            const email = row.email || row.Email || row['Contact Email'] || row['Email Address'] || row['e-mail'] || '';
            const phone = row.phone || row.Phone || row['Phone Number'] || row['Tel'] || row['Telephone'] || '';

            return {
              name: String(name).trim(),
              domain: String(domain).trim(),
              industry: String(industry).trim(),
              location: String(location).trim(),
              size: (row.size || row.Size || row['Company Size'] || row['Employees'] || '').toString().trim(),
              description: (row.description || row.Description || row['About'] || '').toString().trim(),
              website: String(website).trim(),
              employeeCount: (row.employeeCount || row.Employees || row['Employee Count'] || row['employees'] || '').toString().trim(),
            };
          })
          .filter((c: any) => c.name && c.name.length > 0);

        if (parsedCompanies.length === 0) {
          alert(`Could not find company names in the file.\n\nDetected columns: ${headers.join(', ')}\n\nMake sure one column is named "name", "Company Name", or "Company".`);
          return;
        }

        setCompanies(parsedCompanies);

        // Initialize processing status
        const initialStatus: Record<number, ProcessingStatus> = {};
        parsedCompanies.forEach((_: any, i: number) => {
          initialStatus[i] = 'pending';
        });
        setProcessingStatus(initialStatus);
      },
      error: (error) => {
        console.error('File parsing error:', error);
        alert('Could not read this file. Please save it as a CSV file (.csv) and try again.\n\nTip: In Excel, go to File → Save As → choose "CSV (Comma delimited)"');
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as any;
      handleFileUpload(fakeEvent);
    }
  };

  const handleAIEnrichment = async () => {
    setCurrentStep(2);

    try {
      const token = localStorage.getItem('crmToken');

      // Set all to processing
      const processingStatuses: Record<number, ProcessingStatus> = {};
      companies.forEach((_, i) => {
        processingStatuses[i] = 'processing';
      });
      setProcessingStatus(processingStatuses);

      // Call backend AI enrichment endpoint
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/companies/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ companies }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Enrichment failed');
      }

      // Update companies with enriched data
      setCompanies(result.companies);

      // Count enriched fields
      let enrichCount = 0;
      result.companies.forEach((company: Company, i: number) => {
        if (company.aiEnhanced && company.aiEnhanced.length > 0) {
          enrichCount += company.aiEnhanced.length;
          setProcessingStatus(prev => ({ ...prev, [i]: 'done' }));
        } else {
          setProcessingStatus(prev => ({ ...prev, [i]: company.enrichmentFailed ? 'error' : 'done' }));
        }
      });

      setEnrichedCount(enrichCount);

      // Move to review step after 1 second
      setTimeout(() => {
        setCurrentStep(3);
      }, 1000);

    } catch (error: any) {
      console.error('AI enrichment error:', error);
      alert('Failed to enrich company data. Please try again.');

      // Mark all as error
      const errorStatuses: Record<number, ProcessingStatus> = {};
      companies.forEach((_, i) => {
        errorStatuses[i] = 'error';
      });
      setProcessingStatus(errorStatuses);
    }
  };

  const handleImport = async () => {
    setImporting(true);

    try {
      const token = localStorage.getItem('crmToken');

      // Create CSV content from enriched companies
      const csvHeaders = 'name,domain,industry,location,size,description,website,employeeCount\n';
      const csvRows = companies.map(c =>
        `"${c.name}","${c.domain || ''}","${c.industry || ''}","${c.location || ''}","${c.size || ''}","${c.description || ''}","${c.website || ''}","${c.employeeCount || ''}"`
      ).join('\n');
      const csvContent = csvHeaders + csvRows;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'enriched_companies.csv');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const groupParam = encodeURIComponent(groupName || `Import — ${new Date().toLocaleDateString()}`);
      const response = await fetch(`${apiUrl}/api/companies/import?group=${groupParam}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      // Show success with group info
      setImportResult({
        group: result.group || groupName,
        imported: result.imported || 0,
        duplicates: result.duplicates || 0,
      });

      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 3000);

    } catch (error: any) {
      console.error('Import error:', error);
      alert(error.message || 'Failed to import companies');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFile(null);
    setCompanies([]);
    setProcessingStatus({});
    setEnrichedCount(0);
    setImporting(false);
    setGroupName('');
    setImportResult(null);
    onClose();
  };

  const Step = ({ number, label, active }: { number: number; label: string; active: boolean }) => (
    <div className="flex items-center">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${active ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-[#252540] text-[#94A3B8]'} font-semibold`}>
        {number}
      </div>
      <span className={`ml-3 text-sm font-medium ${active ? 'text-purple-400' : 'text-[#94A3B8]'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" style={{ paddingLeft: '272px', paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px' }}>
      <div className="bg-[#161625] rounded-2xl shadow-2xl border border-[#2a2a44] w-full max-w-4xl max-h-[85vh] flex flex-col">

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">Import Companies with AI Enhancement</h2>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="bg-[#12121f] px-8 py-4 border-b border-[#2a2a44]">
          <div className="flex items-center justify-between">
          <Step number={1} label="Upload CSV" active={currentStep === 1} />
          <div className="flex-1 h-0.5 bg-[#252540] mx-4"></div>
          <Step number={2} label="AI Processing" active={currentStep === 2} />
          <div className="flex-1 h-0.5 bg-[#252540] mx-4"></div>
          <Step number={3} label="Review & Import" active={currentStep === 3} />
          </div>
        </div>

        {/* Content area - clear white background */}
        <div className="flex-1 overflow-y-auto bg-[#161625] p-8">

        {/* STEP 1: Upload CSV */}
        {currentStep === 1 && (
          <div>
            <div
              className="border-2 border-dashed border-[#33335a] rounded-lg p-12 text-center hover:border-indigo-500 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <p className="text-lg font-medium text-[#CBD5E1] mb-2">
                Drop your company CSV file here
              </p>
              <p className="text-sm text-[#94A3B8] mb-4">
                or click to browse (CSV, XLS, XLSX, TXT accepted)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {file && companies.length > 0 && (
              <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-medium">
                  Found {companies.length} companies in {file.name}
                </p>
                <div className="mt-3 max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#94A3B8] border-b border-[#2a2a44]">
                        <th className="pb-2 font-medium">#</th>
                        <th className="pb-2 font-medium">Company Name</th>
                        <th className="pb-2 font-medium">Industry</th>
                        <th className="pb-2 font-medium">Website</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.slice(0, 20).map((c, i) => (
                        <tr key={i} className="border-b border-[#1e1e36]">
                          <td className="py-2 text-[#64748B]">{i + 1}</td>
                          <td className="py-2 text-[#F1F5F9] font-medium">{c.name}</td>
                          <td className="py-2 text-[#94A3B8]">{c.industry || '—'}</td>
                          <td className="py-2 text-[#6366F1]">{c.website || c.domain || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {companies.length > 20 && (
                    <p className="text-xs text-[#64748B] mt-2">...and {companies.length - 20} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Group Name */}
            {companies.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Group Name</label>
                <p className="text-xs text-[#64748B] mb-2">This keeps your import separate from existing data. You can filter by group later.</p>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. Deloitte Prospects Q1, Tech Companies March 2026"
                  className="w-full bg-[#252540] border border-[#3d3d5c] rounded-lg text-[#F1F5F9] px-4 py-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">&#10003;</div>
                <p className="text-green-400 font-bold text-lg">Import Complete!</p>
                <p className="text-[#94A3B8] text-sm mt-1">
                  {importResult.imported} companies imported to group "<span className="text-indigo-400 font-semibold">{importResult.group}</span>"
                  {importResult.duplicates > 0 && ` (${importResult.duplicates} duplicates skipped)`}
                </p>
              </div>
            )}

            {/* CSV Requirements */}
            <div className="mt-6 bg-[#1e1e36] border border-[#2a2a44] rounded-lg p-4">
              <h4 className="font-semibold text-[#CBD5E1] mb-2">Required Columns:</h4>
              <ul className="text-sm text-[#94A3B8] space-y-1">
                <li>• Company Name (or name / Name / Company Name)</li>
                <li>• Domain or Website URL (optional but recommended)</li>
              </ul>
              <h4 className="font-semibold text-[#CBD5E1] mt-4 mb-2">Optional Columns:</h4>
              <ul className="text-sm text-[#94A3B8] space-y-1">
                <li>• Industry, Location, Size, Employee Count, Description</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: AI Processing */}
        {currentStep === 2 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto mb-6 flex items-center justify-center">
              <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-[#F1F5F9] mb-2">
              AI is Enriching Your Data
            </h3>
            <p className="text-[#94A3B8] mb-6">
              Analyzing {companies.length} companies and gathering information...
            </p>

            {/* Progress for each company */}
            <div className="max-w-2xl mx-auto space-y-2 max-h-96 overflow-y-auto">
              {companies.map((company, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#12121f] rounded-lg">
                  {processingStatus[i] === 'done' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  ) : processingStatus[i] === 'processing' ? (
                    <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ClockIcon className="w-5 h-5 text-[#64748B]" />
                  )}
                  <span className="text-sm text-[#CBD5E1]">{company.name}</span>
                  <span className="ml-auto text-xs text-[#94A3B8]">
                    {processingStatus[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Review Enhanced Data */}
        {currentStep === 3 && (
          <div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-400">
                <SparklesIcon className="w-5 h-5" />
                <span className="font-medium">
                  AI found {enrichedCount} additional data points across {companies.length} companies!
                </span>
              </div>
            </div>

            {/* Company cards with before/after */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {companies.map((company, i) => (
                <div key={i} className="border-2 border-[#2a2a44] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-[#F1F5F9]">{company.name}</h4>
                      <p className="text-sm text-[#94A3B8]">{company.domain || 'No domain'}</p>
                    </div>
                  </div>

                  {/* What AI found */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {company.industry && (
                      <div className={`${company.aiEnhanced?.includes('industry') ? 'bg-rose-500/10' : 'bg-[#12121f]'} rounded p-2`}>
                        <span className={`${company.aiEnhanced?.includes('industry') ? 'text-purple-400' : 'text-[#94A3B8]'} font-medium`}>Industry: </span>
                        <span className="text-[#CBD5E1]">{company.industry}</span>
                        {company.aiEnhanced?.includes('industry') && (
                          <span className="ml-1 text-xs text-purple-400">✨ AI Found</span>
                        )}
                      </div>
                    )}
                    {(company.headquarters || company.location) && (
                      <div className={`${company.aiEnhanced?.includes('headquarters') ? 'bg-orange-500/10' : 'bg-[#12121f]'} rounded p-2`}>
                        <span className={`${company.aiEnhanced?.includes('headquarters') ? 'text-indigo-400' : 'text-[#94A3B8]'} font-medium`}>HQ: </span>
                        <span className="text-[#CBD5E1]">{company.headquarters || company.location}</span>
                        {company.aiEnhanced?.includes('headquarters') && (
                          <span className="ml-1 text-xs text-indigo-400">✨ AI Found</span>
                        )}
                      </div>
                    )}
                    {(company.employeeCount || company.size) && (
                      <div className={`${company.aiEnhanced?.includes('size') ? 'bg-green-500/10' : 'bg-[#12121f]'} rounded p-2`}>
                        <span className={`${company.aiEnhanced?.includes('size') ? 'text-green-600' : 'text-[#94A3B8]'} font-medium`}>Size: </span>
                        <span className="text-[#CBD5E1]">{company.employeeCount || company.size}</span>
                        {company.aiEnhanced?.includes('size') && (
                          <span className="ml-1 text-xs text-green-600">✨ AI Found</span>
                        )}
                      </div>
                    )}
                  </div>

                  {company.description && (
                    <p className="text-sm text-[#94A3B8] mt-2 italic">
                      "{company.description.substring(0, 150)}..."
                      {company.aiEnhanced?.includes('description') && (
                        <span className="ml-1 text-xs text-purple-400">✨ AI Found</span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        </div>

        {/* Footer with actions - separated with border */}
        <div className="bg-[#12121f] px-8 py-6 border-t border-[#2a2a44] flex justify-between items-center">
          <button
            onClick={handleClose}
            className="px-6 py-3 border border-[#3d3d5c] rounded-lg font-medium text-[#94A3B8] hover:bg-[#1e1e36] hover:text-[#F1F5F9] transition-colors"
            disabled={importing}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {currentStep > 1 && currentStep < 3 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-3 border border-[#3d3d5c] rounded-lg font-medium text-[#94A3B8] hover:bg-[#1e1e36] hover:text-[#F1F5F9] transition-colors"
              >
                Back
              </button>
            )}
            {currentStep === 1 && companies.length > 0 && (
              <>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-6 py-3 bg-[#161625] text-[#CBD5E1] border border-[#3d3d5c] rounded-lg font-semibold hover:bg-[#1e1e36] transition-all disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Directly'}
                </button>
                <button
                  onClick={handleAIEnrichment}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Enhance with AI
                </button>
              </>
            )}
            {currentStep === 3 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-5 h-5" />
                    Import {companies.length} Companies
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
