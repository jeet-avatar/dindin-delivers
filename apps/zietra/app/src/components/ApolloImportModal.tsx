import { useState } from "react";
import { XMarkIcon, MagnifyingGlassIcon, CheckCircleIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface ApolloImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ApolloImportModal({ isOpen, onClose, onImportComplete }: ApolloImportModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Search filters
  const [personTitles, setPersonTitles] = useState<string>("");
  const [personLocations, setPersonLocations] = useState<string>("");
  const [organizationDomains, setOrganizationDomains] = useState<string>("");
  const [organizationIndustries, setOrganizationIndustries] = useState<string>("");
  const [perPage, setPerPage] = useState(25);

  const handleSearch = async () => {
    setLoading(true);
    setCurrentStep(2);

    try {
      const token = localStorage.getItem("crmToken");

      // Build filter object
      const filters: any = {
        perPage,
        page: 1,
      };

      if (personTitles.trim()) {
        filters.personTitles = personTitles.split(",").map(t => t.trim());
      }

      if (personLocations.trim()) {
        filters.personLocations = personLocations.split(",").map(l => l.trim());
      }

      if (organizationDomains.trim()) {
        filters.organizationDomains = organizationDomains.split(",").map(d => d.trim());
      }

      if (organizationIndustries.trim()) {
        filters.organizationIndustries = organizationIndustries.split(",").map(i => i.trim());
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/contacts/apollo-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import contacts");
      }

      const result = await response.json();
      setImportResults(result);
      setCurrentStep(3);
    } catch (error: any) {
      console.error("Apollo import error:", error);
      alert(`Failed to import contacts from Apollo.io: ${error.message}`);
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setImportResults(null);
    onClose();
  };

  const handleComplete = () => {
    onImportComplete();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161625] rounded-2xl shadow-2xl border-4 border-rose-300 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 border-b-4 border-orange-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-white" />
              <h2 className="text-3xl font-bold text-white">Import from Apollo.io</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-[#161625]/20 hover:bg-[#161625]/30 flex items-center justify-center transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="bg-rose-500/10 px-8 py-4 border-b-2 border-rose-200">
          <div className="flex items-center justify-between">
            <StepIndicator number={1} label="Search Filters" active={currentStep === 1} />
            <div className="flex-1 h-0.5 bg-[#252540] mx-4"></div>
            <StepIndicator number={2} label="Importing" active={currentStep === 2} />
            <div className="flex-1 h-0.5 bg-[#252540] mx-4"></div>
            <StepIndicator number={3} label="Complete" active={currentStep === 3} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#161625] p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-orange-500/10 border-l-4 border-indigo-500 p-4 rounded-r-lg">
                <p className="text-sm text-orange-400">
                  <strong>Search Apollo.io database</strong> for contacts matching your criteria.
                  Enter comma-separated values for multiple options (e.g., "CEO, CTO, VP Engineering").
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    Job Titles
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                    placeholder="CEO, CTO, VP Sales"
                    value={personTitles}
                    onChange={(e) => setPersonTitles(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[#94A3B8]">Comma-separated job titles</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    Locations
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                    placeholder="San Francisco, New York, Austin"
                    value={personLocations}
                    onChange={(e) => setPersonLocations(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[#94A3B8]">Comma-separated cities or states</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    Company Domains
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                    placeholder="stripe.com, shopify.com"
                    value={organizationDomains}
                    onChange={(e) => setOrganizationDomains(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[#94A3B8]">Specific company domains</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    Industries
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                    placeholder="Technology, Finance, Healthcare"
                    value={organizationIndustries}
                    onChange={(e) => setOrganizationIndustries(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-[#94A3B8]">Target industries</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">
                    Results Per Page
                  </label>
                  <select
                    className="w-full px-4 py-2 border-2 border-[#33335a] rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all"
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10 contacts</option>
                    <option value={25}>25 contacts</option>
                    <option value={50}>50 contacts</option>
                    <option value={100}>100 contacts</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-rose-500 border-t-transparent mb-6"></div>
              <h3 className="text-xl font-semibold text-[#E2E8F0] mb-2">Importing from Apollo.io...</h3>
              <p className="text-[#94A3B8]">Searching and importing contacts based on your criteria</p>
            </div>
          )}

          {currentStep === 3 && importResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-green-500/15 rounded-full p-4">
                  <CheckCircleIcon className="w-16 h-16 text-green-600" />
                </div>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#F1F5F9] mb-2">Import Complete!</h3>
                <p className="text-[#94A3B8]">Successfully imported contacts from Apollo.io</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-rose-500/10 rounded-lg p-4 text-center border-2 border-rose-200">
                  <div className="text-3xl font-bold text-purple-400">{importResults.imported}</div>
                  <div className="text-sm text-[#94A3B8] mt-1">Imported</div>
                </div>
                <div className="bg-orange-500/10 rounded-lg p-4 text-center border-2 border-orange-200">
                  <div className="text-3xl font-bold text-indigo-400">{importResults.total}</div>
                  <div className="text-sm text-[#94A3B8] mt-1">Total Found</div>
                </div>
                <div className="bg-[#12121f] rounded-lg p-4 text-center border-2 border-[#2a2a44]">
                  <div className="text-3xl font-bold text-[#94A3B8]">
                    {importResults.total - importResults.imported}
                  </div>
                  <div className="text-sm text-[#94A3B8] mt-1">Skipped</div>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                  <h4 className="font-semibold text-yellow-400 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-400 space-y-1">
                    {importResults.errors.slice(0, 5).map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                    {importResults.errors.length > 5 && (
                      <li>...and {importResults.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#12121f] px-8 py-6 border-t-4 border-[#2a2a44] flex justify-between items-center">
          <button
            onClick={handleClose}
            className="px-6 py-3 border-2 border-gray-400 rounded-lg font-medium text-[#CBD5E1] hover:bg-[#1c1c30] transition-colors"
          >
            {currentStep === 3 ? "Close" : "Cancel"}
          </button>

          {currentStep === 1 && (
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              Search & Import
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              View Contacts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ number, label, active }: { number: number; label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
          active
            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white scale-110 shadow-lg"
            : "bg-[#252540] text-[#94A3B8]"
        }`}
      >
        {number}
      </div>
      <span
        className={`mt-2 text-sm font-medium ${
          active ? "text-purple-400" : "text-[#94A3B8]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
