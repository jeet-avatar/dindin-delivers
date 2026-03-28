import { useEffect, useState, useCallback } from 'react'
import { contractsApi } from '../api/contracts'
import type { WholesaleAgreement, ContractStatus } from '../types/hospital'
import { StatusChip } from '../components/StatusChip'
import { SkeletonRow } from '../components/SkeletonRow'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { DrawerPanel } from '../components/DrawerPanel'
import { LangGraphProgress } from '../components/LangGraphProgress'
import { useRole } from '../hooks/useRole'

interface ContractFormData {
  supplier_id: string
  gpo_contract_number: string
  effective_date: string
  expiration_date: string
}

export function Contracts() {
  const { canActivateContract } = useRole()
  const [contracts, setContracts] = useState<WholesaleAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedContract, setSelectedContract] = useState<WholesaleAgreement | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [form, setForm] = useState<ContractFormData>({
    supplier_id: '',
    gpo_contract_number: '',
    effective_date: '',
    expiration_date: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    contractsApi
      .list()
      .then(setContracts)
      .catch(() => setError('Failed to load contracts'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const contract = await contractsApi.create({
        supplier_id: form.supplier_id || undefined,
        gpo_contract_number: form.gpo_contract_number || undefined,
        effective_date: form.effective_date,
        expiration_date: form.expiration_date,
      })
      setShowUpload(false)
      setForm({ supplier_id: '', gpo_contract_number: '', effective_date: '', expiration_date: '' })
      setProcessingId(contract.contract_id)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSubmitError(msg ?? 'Contract creation failed — please retry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLangGraphReady = (status: ContractStatus) => {
    setProcessingId(null)
    load()
    if (status === 'pending_review') {
      // Nothing — user sees pending_review chip and can review
    }
  }

  const handleActivate = async (contract: WholesaleAgreement) => {
    setActivating(true)
    setActivateError(null)
    try {
      await contractsApi.activate(contract.contract_id)
      setActivateError(null)
      load()
      setSelectedContract(null)
    } catch {
      setActivateError('Activation failed — please try again')
    } finally {
      setActivating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy">Contracts</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-navy text-white text-sm rounded-md hover:bg-navy-light transition-colors"
        >
          + Upload Contract
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* LangGraph processing tracker */}
      {processingId && (
        <div className="bg-surface-card border border-border rounded-lg p-5 shadow-card">
          <p className="text-sm font-medium text-navy mb-3">Processing contract…</p>
          <LangGraphProgress
            contractId={processingId}
            onReady={handleLangGraphReady}
          />
        </div>
      )}

      {/* Contracts table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-navy-muted text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-2.5">Supplier</th>
              <th className="text-left px-4 py-2.5">GPO #</th>
              <th className="text-left px-4 py-2.5">Effective</th>
              <th className="text-left px-4 py-2.5">Expires</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="📄"
                    message="No contracts yet — upload your first wholesale agreement"
                    ctaLabel="Upload Contract"
                    onCta={() => setShowUpload(true)}
                  />
                </td>
              </tr>
            ) : (
              contracts.map((c) => (
                <tr key={c.contract_id} className="border-t border-border hover:bg-slate-50">
                  <td className="px-4 py-3 text-navy font-medium">{c.supplier_id ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.gpo_contract_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.effective_date ? new Date(c.effective_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.expiration_date ? new Date(c.expiration_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedContract(c)}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      View
                    </button>
                    {canActivateContract && c.status === 'pending_review' && (
                      <button
                        onClick={() => handleActivate(c)}
                        disabled={activating}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload drawer */}
      <DrawerPanel
        open={showUpload}
        onClose={() => { setShowUpload(false); setSubmitError(null) }}
        title="New Contract"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter the contract details below. LangGraph will process and extract terms automatically.
          </p>
          {submitError && <ErrorBanner message={submitError} />}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Supplier ID (UUID) *</span>
              <input
                type="text"
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                placeholder="Required"
                className="mt-1 w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">GPO Contract #</span>
              <input
                type="text"
                value={form.gpo_contract_number}
                onChange={(e) => setForm({ ...form, gpo_contract_number: e.target.value })}
                placeholder="Optional"
                className="mt-1 w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Effective Date *</span>
              <input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-navy"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Expiration Date *</span>
              <input
                type="date"
                value={form.expiration_date}
                onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-navy"
              />
            </label>
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting || !form.supplier_id || !form.effective_date || !form.expiration_date}
            className="w-full py-2 bg-navy text-white text-sm rounded-md hover:bg-navy-light disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Contract'}
          </button>
        </div>
      </DrawerPanel>

      {/* Contract detail drawer */}
      <DrawerPanel
        open={!!selectedContract}
        onClose={() => { setSelectedContract(null); setActivateError(null) }}
        title={selectedContract ? `Contract ${selectedContract.gpo_contract_number ?? selectedContract.contract_id.slice(0, 8)}` : ''}
      >
        {selectedContract && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Status</span>
                <div className="mt-1"><StatusChip status={selectedContract.status} /></div>
              </div>
              <div>
                <span className="text-slate-500">Supplier ID</span>
                <div className="mt-1 font-medium text-navy truncate">{selectedContract.supplier_id ?? '—'}</div>
              </div>
              <div>
                <span className="text-slate-500">Effective</span>
                <div className="mt-1">{selectedContract.effective_date ?? '—'}</div>
              </div>
              <div>
                <span className="text-slate-500">Expires</span>
                <div className="mt-1">{selectedContract.expiration_date ?? '—'}</div>
              </div>
              <div>
                <span className="text-slate-500">Admin Fee</span>
                <div className="mt-1">
                  {selectedContract.admin_fee_pct != null
                    ? `${(selectedContract.admin_fee_pct * 100).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">BAA Required</span>
                <div className="mt-1">{selectedContract.baa_required ? 'Yes' : 'No'}</div>
              </div>
            </div>
            {canActivateContract && selectedContract.status === 'pending_review' && (
              <>
                {activateError && <ErrorBanner message={activateError} />}
                <button
                  onClick={() => handleActivate(selectedContract)}
                  disabled={activating}
                  className="w-full py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {activating ? 'Activating…' : 'Activate Contract'}
                </button>
              </>
            )}
            {selectedContract.document_s3_path && (
              <p className="text-xs text-slate-400">
                Document: <span className="font-mono">{selectedContract.document_s3_path}</span>
              </p>
            )}
          </div>
        )}
      </DrawerPanel>
    </div>
  )
}
