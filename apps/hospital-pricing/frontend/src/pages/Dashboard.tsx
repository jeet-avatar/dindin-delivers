import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { contractsApi } from '../api/contracts'
import { invoicesApi } from '../api/invoices'
import { useAppContext } from '../contexts/AppContext'
import { SkeletonRow } from '../components/SkeletonRow'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { DiscrepancyBadge } from '../components/DiscrepancyBadge'
import type { WholesaleAgreement, Invoice } from '../types/hospital'
import { discrepanciesApi } from '../api/discrepancies'
import type { Discrepancy } from '../types/hospital'

function KpiCard({
  label,
  value,
  color,
  loading,
}: {
  label: string
  value: number
  color: string
  loading: boolean
}) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-5 shadow-card">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
      ) : (
        <>
          <div className={`text-3xl font-bold ${color}`}>{value}</div>
          <div className="text-sm text-slate-500 mt-1">{label}</div>
        </>
      )}
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { openDiscrepancyCount } = useAppContext()

  const [contracts, setContracts] = useState<WholesaleAgreement[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [recentDiscrepancies, setRecentDiscrepancies] = useState<Discrepancy[]>([])
  const [resolvedToday, setResolvedToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      contractsApi.list(),
      invoicesApi.list(),
      discrepanciesApi.list({ status: 'open' }),
      discrepanciesApi.list({ status: 'resolved' }),
    ])
      .then(([c, i, openD, resolvedD]) => {
        setContracts(c)
        setInvoices(i)
        setRecentDiscrepancies(openD.slice(0, 5))
        const todayStr = new Date().toISOString().slice(0, 10)
        const todayResolved = resolvedD.filter(
          (d) => d.resolved_at && d.resolved_at.slice(0, 10) === todayStr
        ).length
        setResolvedToday(todayResolved)
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const invoicesThisMonth = invoices.filter(
    (i) => i.invoice_date != null && new Date(i.invoice_date) >= firstOfMonth
  ).length

  const activeContracts = contracts.filter((c) => c.status === 'active').length

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const expiringContracts = contracts.filter((c) => {
    if (!c.expiration_date || c.status !== 'active') return false
    const exp = new Date(c.expiration_date)
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    return exp <= in30 && exp >= todayMidnight
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-navy">Dashboard</h1>

      {error && <ErrorBanner message={error} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Contracts" value={activeContracts} color="text-navy" loading={loading} />
        <KpiCard label="Invoices This Month" value={invoicesThisMonth} color="text-blue-600" loading={loading} />
        <KpiCard label="Open Discrepancies" value={openDiscrepancyCount} color="text-red-600" loading={loading} />
        <KpiCard label="Resolved Today" value={resolvedToday} color="text-green-600" loading={loading} />
      </div>

      {/* Contract expiry alerts — below KPI cards per spec */}
      {expiringContracts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">⚠ Expiring soon:</span>{' '}
          {expiringContracts.map((c, i) => (
            <span key={c.contract_id}>
              {i > 0 && ' · '}
              <button
                onClick={() => navigate('/contracts')}
                className="underline font-medium"
              >
                {c.gpo_contract_number ?? c.contract_id.slice(0, 8)}
              </button>
              {' '}expires {new Date(c.expiration_date!).toLocaleDateString()}
            </span>
          ))}
        </div>
      )}

      {/* Recent discrepancies table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-navy text-sm">Recent Open Discrepancies</h2>
          <button
            onClick={() => navigate('/discrepancies')}
            className="text-xs text-blue-600 hover:underline"
          >
            View all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy text-navy-muted text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-2.5">Item</th>
                <th className="text-left px-4 py-2.5">Supplier</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-right px-4 py-2.5">Delta</th>
                <th className="text-left px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : recentDiscrepancies.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon="✅"
                      message="No activity yet — upload your first contract to get started"
                    />
                  </td>
                </tr>
              ) : (
                recentDiscrepancies.map((d) => (
                  <tr
                    key={d.line_id}
                    onClick={() => navigate(`/discrepancies?highlight=${d.line_id}`)}
                    className="border-t border-border hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-navy">{d.item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{d.supplier_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <DiscrepancyBadge type={d.discrepancy_type} />
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {d.delta >= 0 ? '+' : ''}${Math.abs(d.delta).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
