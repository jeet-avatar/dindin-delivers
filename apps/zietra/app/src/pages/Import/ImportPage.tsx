import { useState } from 'react';
import MigrationWizardModal from '../../components/MigrationWizardModal';

export function ImportPage() {
  const [open, setOpen] = useState(true);
  const [results, setResults] = useState<{ imported: number; failed: number; errors: any[] } | null>(null);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#F1F5F9]">CRM Migration</h1>
        <p className="text-[#94A3B8] mt-1">Import contacts, companies, and deals from Salesforce, HubSpot, your ERP, Pipedrive, Zoho, or CSV</p>
      </div>

      {results && !open ? (
        <div className="card p-8 max-w-lg">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">Import Complete</h2>
            <p className="text-[#94A3B8] mb-1">
              <span className="font-semibold text-green-600">{results.imported}</span> records imported
            </p>
            {results.failed > 0 && (
              <p className="text-[#94A3B8] mb-4">
                <span className="font-semibold text-red-500">{results.failed}</span> failed
              </p>
            )}
            <button
              onClick={() => { setResults(null); setOpen(true); }}
              className="btn-primary mt-4"
            >
              Run Another Import
            </button>
          </div>
        </div>
      ) : !open ? (
        <div className="card p-8 max-w-lg text-center">
          <p className="text-[#94A3B8] mb-4">Ready to import from another CRM?</p>
          <button onClick={() => setOpen(true)} className="btn-primary">
            Launch Migration Wizard
          </button>
        </div>
      ) : null}

      <MigrationWizardModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onImportComplete={(r) => { setResults(r); setOpen(false); }}
      />
    </div>
  );
}
