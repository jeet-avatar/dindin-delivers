import { useState, useRef } from "react";
import { XMarkIcon, DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon, EyeIcon } from "@heroicons/react/24/outline";
import { InlineError } from "./ErrorDisplay";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function CSVImportModal({ isOpen, onClose, onImportComplete }: CSVImportModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrichData, setEnrichData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const csvFiles = files.filter(file => file.name.endsWith('.csv') || file.type === 'text/csv');

    if (csvFiles.length !== files.length) {
      alert('Only CSV files are allowed');
    }

    setSelectedFiles(csvFiles);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one CSV file');
      return;
    }

    // Parse CSV to show preview
    setLoading(true);
    setError(null);

    try {
      const file = selectedFiles[0];
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((obj: any, header, idx) => {
          obj[header] = values[idx] || '';
          return obj;
        }, {});
      });

      setPreviewData({ headers, rows, totalRows: lines.length - 1 });
      setCurrentStep(2);
    } catch (err) {
      setError('Failed to parse CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setCurrentStep(enrichData ? 3 : 4);
    setError(null);

    try {
      const token = localStorage.getItem("crmToken");
      const formData = new FormData();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      if (enrichData) {
        formData.append('enrich', 'true');
      }

      const response = await fetch(`${apiUrl}/api/contacts/csv-import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to import CSV";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setImportResults(result);
      setCurrentStep(5);
    } catch (error: any) {
      console.error("CSV import error:", error);
      setError(error.message || "An unknown error occurred");
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedFiles([]);
    setPreviewData(null);
    setImportResults(null);
    setEnrichData(false);
    setError(null);
    onClose();
  };

  const handleComplete = () => {
    onImportComplete();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161625] rounded-[40px] shadow-2xl border-4 border-black w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 px-8 py-6 rounded-t-[40px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DocumentArrowUpIcon className="w-8 h-8 text-white" />
              <h2 className="text-3xl font-bold text-white">AI CSV Import</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white hover:bg-[#161625]/20 rounded-lg p-2 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-white/90 mt-2">Import contacts with automatic field mapping and AI enrichment</p>
        </div>

        {/* Step Indicators */}
        <div className="bg-orange-500/10 px-8 py-4 border-b-2 border-orange-200">
          <div className="flex items-center justify-center gap-4">
            <StepIndicator number={1} label="Upload" active={currentStep >= 1} />
            <ProgressBar completed={currentStep >= 2} />
            <StepIndicator number={2} label="Preview" active={currentStep >= 2} />
            <ProgressBar completed={currentStep >= 3} />
            <StepIndicator number={3} label="Enrich" active={currentStep >= 3} />
            <ProgressBar completed={currentStep >= 4} />
            <StepIndicator number={4} label="Import" active={currentStep >= 4} />
            <ProgressBar completed={currentStep >= 5} />
            <StepIndicator number={5} label="Complete" active={currentStep >= 5} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#161625] p-8">

          {/* Step 1: File Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#E2E8F0] mb-2">Upload CSV Files</h3>
                <p className="text-[#94A3B8]">Select one or more CSV files containing contact data</p>
              </div>

              {error && (
                <InlineError
                  message={error}
                  onRetry={() => setError(null)}
                />
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-orange-300 rounded-[32px] p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-orange-500/10 transition-all"
              >
                <DocumentArrowUpIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#CBD5E1] mb-2">Click to browse files</p>
                <p className="text-sm text-[#94A3B8]">or drag and drop CSV files here</p>
                <p className="text-xs text-[#64748B] mt-2">Maximum 10 files, 10MB each</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload CSV files"
              />

              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-[#E2E8F0]">Selected Files ({selectedFiles.length})</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-orange-500/10 border-2 border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <DocumentArrowUpIcon className="w-6 h-6 text-indigo-400" />
                        <div>
                          <p className="font-medium text-[#E2E8F0]">{file.name}</p>
                          <p className="text-sm text-[#94A3B8]">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-600 hover:bg-red-500/15 rounded-lg p-2 transition-colors"
                        aria-label={`Remove ${file.name}`}
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-orange-500/10 border-2 border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-400 mb-2">✨ AI Field Mapping</h4>
                <p className="text-sm text-orange-400">AI automatically detects and maps CSV columns:</p>
                <ul className="text-sm text-indigo-400 mt-2 space-y-1 ml-4">
                  <li>• Email, E-mail, Mail → email</li>
                  <li>• First Name, FirstName, fname → firstName</li>
                  <li>• Company, Organization → company</li>
                  <li>• Phone, Mobile, Cell → phone</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {currentStep === 2 && previewData && (
            <div className="space-y-6">
              <div className="text-center">
                <EyeIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[#E2E8F0] mb-2">Preview Data</h3>
                <p className="text-[#94A3B8]">Found {previewData.totalRows} rows in CSV file</p>
              </div>

              {error && (
                <InlineError
                  message={error}
                  onRetry={() => setError(null)}
                />
              )}

              <div className="bg-[#12121f] border-2 border-[#2a2a44] rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#33335a]">
                      {previewData.headers.map((header: string, idx: number) => (
                        <th key={idx} className="px-4 py-2 text-left font-semibold text-[#CBD5E1] bg-[#1c1c30]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-[#2a2a44]">
                        {previewData.headers.map((header: string, colIdx: number) => (
                          <td key={colIdx} className="px-4 py-2 text-[#94A3B8]">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-rose-500/10 border-2 border-rose-200 rounded-lg p-4">
                <p className="text-sm text-rose-400">
                  Showing first 5 rows. Total rows to import: <strong>{previewData.totalRows}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Enrich Option */}
          {currentStep === 3 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <SparklesIcon className="w-20 h-20 text-purple-400" />
              <div className="text-center max-w-2xl">
                <h3 className="text-2xl font-bold text-[#E2E8F0] mb-4">AI Data Enrichment</h3>
                <p className="text-[#94A3B8] mb-6">
                  Enhance your contact data with AI-powered enrichment. This will add missing information like
                  company details, job titles, and social profiles.
                </p>
                <div className="bg-gradient-to-br from-orange-50 to-rose-50 border-2 border-rose-200 rounded-xl p-6">
                  <h4 className="font-semibold text-rose-800 mb-3">Enrichment includes:</h4>
                  <ul className="text-sm text-rose-400 space-y-2 text-left">
                    <li>• Company information & industry data</li>
                    <li>• Verified email addresses</li>
                    <li>• Social media profiles (LinkedIn, Twitter)</li>
                    <li>• Job titles and roles</li>
                  </ul>
                </div>
              </div>
              <div className="w-24 h-24 border-8 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
              <p className="text-[#94A3B8] font-medium">Enriching contact data...</p>
            </div>
          )}

          {/* Step 4: Importing */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-20 h-20 border-8 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                <DocumentArrowUpIcon className="w-10 h-10 text-indigo-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-2xl font-bold text-[#E2E8F0] mt-8 mb-2">Importing Contacts...</h3>
              <p className="text-[#94A3B8]">Please wait while we process your CSV files</p>
            </div>
          )}

          {/* Step 5: Success */}
          {currentStep === 5 && importResults && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircleIcon className="w-20 h-20 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-[#E2E8F0] mb-2">Import Complete!</h3>
                <p className="text-[#94A3B8]">Your contacts have been successfully imported</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-500/10 border-2 border-orange-200 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-indigo-400">{importResults.contactsImported || importResults.imported || 0}</p>
                  <p className="text-sm font-medium text-[#94A3B8] mt-2">Contacts Imported</p>
                </div>
                <div className="bg-blue-500/10 border-2 border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-blue-600">{importResults.companiesCreated || 0}</p>
                  <p className="text-sm font-medium text-[#94A3B8] mt-2">Companies Created</p>
                </div>
                <div className="bg-orange-500/10 border-2 border-orange-200 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-indigo-400">{importResults.totalProcessed || 0}</p>
                  <p className="text-sm font-medium text-[#94A3B8] mt-2">Total Processed</p>
                </div>
                <div className="bg-yellow-500/10 border-2 border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-yellow-600">{importResults.duplicates || 0}</p>
                  <p className="text-sm font-medium text-[#94A3B8] mt-2">Duplicates Skipped</p>
                </div>
              </div>

              {/* Show detected CSV types */}
              {importResults.detectedTypes && importResults.detectedTypes.length > 0 && (
                <div className="bg-blue-500/10 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📊 Detected Data Types</h4>
                  <div className="space-y-1">
                    {importResults.detectedTypes.map((type: string, idx: number) => (
                      <p key={idx} className="text-sm text-blue-400">• {type}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Show errors if any */}
              {importResults.errors > 0 && importResults.errorsList && (
                <div className="bg-red-500/10 border-2 border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">❌ Errors Encountered</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResults.errorsList.map((error: string, idx: number) => (
                      <p key={idx} className="text-sm text-red-600">• {error}</p>
                    ))}
                  </div>
                </div>
              )}

              {importResults.duplicates > 0 && importResults.duplicatesList && (
                <div className="bg-yellow-500/10 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-400 mb-2">Duplicates Detected</h4>
                      <p className="text-sm text-yellow-400 mb-2">The following contacts already exist and were skipped:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResults.duplicatesList.slice(0, 10).map((dup: string, idx: number) => (
                          <p key={idx} className="text-sm text-yellow-600">• {dup}</p>
                        ))}
                        {importResults.duplicatesList.length > 10 && (
                          <p className="text-sm text-yellow-600 italic">... and {importResults.duplicatesList.length - 10} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-red-500/10 border-2 border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-400 mb-2">Errors Encountered</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResults.errors.map((error: string, idx: number) => (
                      <p key={idx} className="text-sm text-red-600">• {error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#12121f] px-8 py-6 border-t border-[#2a2a44] rounded-b-3xl">
          <div className="flex items-center justify-between">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 text-[#CBD5E1] font-semibold hover:bg-[#252540] rounded-xl transition-colors border-2 border-[#33335a]"
              >
                Back
              </button>
            )}
            {currentStep !== 2 && (
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-[#CBD5E1] font-semibold hover:bg-[#252540] rounded-xl transition-colors border-2 border-[#33335a]"
              >
                {currentStep === 5 ? 'Close' : 'Cancel'}
              </button>
            )}

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={selectedFiles.length === 0 || loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-500/30 rounded-xl font-semibold hover:shadow-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Preview Data
              </button>
            )}

            {currentStep === 2 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEnrichData(false);
                    handleImport();
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] rounded-xl font-semibold hover:bg-[#1c1c30] transition-all shadow-md disabled:opacity-50"
                >
                  Import Without Enrichment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnrichData(true);
                    handleImport();
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-500/30 rounded-xl font-semibold hover:shadow-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Enrich & Import
                </button>
              </div>
            )}

            {currentStep === 5 && (
              <button
                type="button"
                onClick={handleComplete}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-500/30 rounded-xl font-semibold hover:shadow-xl transition-all shadow-md active:scale-95"
              >
                View Contacts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StepIndicator({ number, label, active }: { number: number; label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? 'text-indigo-400' : 'text-[#64748B]'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${active ? 'bg-orange-600 text-white' : 'bg-[#252540]'}`}>
        {number}
      </div>
      <span className="font-medium text-sm hidden sm:inline">{label}</span>
    </div>
  );
}

function ProgressBar({ completed }: { completed: boolean }) {
  return (
    <div className="flex-1 h-1 bg-[#252540] rounded max-w-[60px]">
      <div className={`h-full bg-orange-600 rounded transition-all duration-500 ${completed ? 'w-full' : 'w-0'}`} />
    </div>
  );
}
