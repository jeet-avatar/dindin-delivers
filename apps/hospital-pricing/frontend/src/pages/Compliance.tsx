import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { contractsApi } from '../api/contracts'
import { useAppContext } from '../contexts/AppContext'
import type { WholesaleAgreement } from '../types/hospital'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'

interface PanelProps {
  title: string
  children: React.ReactNode
}

function CompliancePanel({ title, children }: PanelProps) {
  return (
    <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-slate-50">
        <h2 className="font-semibold text-navy text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function Compliance() {
  const navigate = useNavigate()
  const { currentUser, loading: userLoading } = useAppContext()
  const [contracts, setContracts] = useState<WholesaleAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    contractsApi
      .list()
      .then(setContracts)
      .catch(() => setError('Failed to load compliance data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || userLoading) {
    return <div className="text-sm text-slate-500 py-8 text-center">Loading compliance data…</div>
  }

  // AKS Safe Harbor: admin_fee_pct > 3% or aks_safe_harbor_documented = false
  const aksViolations = contracts.filter(
    (c) =>
      (c.admin_fee_pct != null && c.admin_fee_pct > 0.03) ||
      c.aks_safe_harbor_documented === false
  )

  // BAA
  const baaMissing = contracts.filter(
    (c) => c.baa_required === true && c.status !== 'active'
  )
  const baaOk = contracts.filter(
    (c) => c.baa_required === true && c.status === 'active'
  )

  // MFN
  const mfnContracts = contracts.filter((c) => c.mfn_clause != null)

  // 340B — sourced from currentUser entity, not contracts list
  const isCoveredEntity = currentUser?.entity?.is_covered_entity ?? false
  const pharmaContracts = contracts.filter(
    (c) => isCoveredEntity && c.status === 'active'
  )

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-navy">Compliance</h1>

      {error && <ErrorBanner message={error} />}

      {/* AKS Safe Harbor */}
      <CompliancePanel title="AKS Safe Harbor">
        {aksViolations.length === 0 ? (
          <EmptyState icon="✅" message="No AKS compliance issues found" />
        ) : (
          <div className="space-y-2">
            {aksViolations.map((c) => (
              <div
                key={c.contract_id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded text-xs"
              >
                <div>
                  <span className="font-medium text-red-700 mr-2">⚠</span>
                  <span className="text-navy font-medium">
                    {c.gpo_contract_number ?? c.contract_id.slice(0, 8)}
                  </span>
                  <span className="text-slate-500 ml-2">
                    {c.admin_fee_pct != null && c.admin_fee_pct > 0.03
                      ? `Admin fee ${(c.admin_fee_pct * 100).toFixed(1)}% exceeds 3% safe harbor`
                      : 'Safe harbor not documented'}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/contracts')}
                  className="text-blue-600 hover:underline"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </CompliancePanel>

      {/* BAA Status */}
      <CompliancePanel title="Business Associate Agreement (BAA) Status">
        {baaOk.length === 0 && baaMissing.length === 0 ? (
          <EmptyState icon="✅" message="No BAA requirements found" />
        ) : (
          <div className="space-y-2">
            {baaOk.map((c) => (
              <div key={c.contract_id} className="flex items-center gap-2 text-xs p-2 bg-green-50 border border-green-100 rounded">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-navy font-medium">{c.gpo_contract_number ?? c.contract_id.slice(0, 8)}</span>
                <span className="text-slate-500">BAA active</span>
              </div>
            ))}
            {baaMissing.map((c) => (
              <div key={c.contract_id} className="flex items-center justify-between text-xs p-2 bg-red-50 border border-red-100 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span className="text-navy font-medium">{c.gpo_contract_number ?? c.contract_id.slice(0, 8)}</span>
                  <span className="text-slate-500">BAA missing</span>
                </div>
                <button onClick={() => navigate('/contracts')} className="text-blue-600 hover:underline">
                  Review
                </button>
              </div>
            ))}
          </div>
        )}
      </CompliancePanel>

      {/* MFN Monitoring */}
      <CompliancePanel title="Most Favored Nation (MFN) Monitoring">
        {mfnContracts.length === 0 ? (
          <EmptyState icon="✅" message="No MFN clauses found" />
        ) : (
          <div className="space-y-2">
            {mfnContracts.map((c) => (
              <div key={c.contract_id} className="p-3 bg-blue-50 border border-blue-100 rounded text-xs space-y-1">
                <div className="font-medium text-navy">{c.gpo_contract_number ?? c.contract_id.slice(0, 8)}</div>
                <div className="text-slate-500">
                  MFN clause present · Expires {c.expiration_date ?? 'unknown'}
                </div>
              </div>
            ))}
          </div>
        )}
      </CompliancePanel>

      {/* 340B */}
      <CompliancePanel title="340B Drug Pricing">
        {!isCoveredEntity ? (
          <EmptyState icon="ℹ️" message="Your entity is not a 340B covered entity" />
        ) : pharmaContracts.length === 0 ? (
          <EmptyState icon="✅" message="No 340B-eligible active contracts found" />
        ) : (
          <div className="space-y-2">
            {pharmaContracts.map((c) => (
              <div key={c.contract_id} className="p-3 bg-amber-50 border border-amber-100 rounded text-xs">
                <span className="text-navy font-medium">{c.gpo_contract_number ?? c.contract_id.slice(0, 8)}</span>
                <span className="text-slate-500 ml-2">Active contract — verify 340B eligibility</span>
              </div>
            ))}
          </div>
        )}
      </CompliancePanel>
    </div>
  )
}
