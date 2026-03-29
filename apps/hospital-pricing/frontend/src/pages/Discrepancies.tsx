import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { discrepanciesApi } from '../api/discrepancies'
import type { Discrepancy, DiscrepancyStatus, DiscrepancyType } from '../types/hospital'
import type { ResolutionValue } from '../api/discrepancies'
import { StatusChip } from '../components/StatusChip'
import { DiscrepancyBadge } from '../components/DiscrepancyBadge'
import { SkeletonRow } from '../components/SkeletonRow'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { DrawerPanel } from '../components/DrawerPanel'
import { useRole } from '../hooks/useRole'
import { useAppContext } from '../contexts/AppContext'

const TYPE_FILTERS: Array<{ label: string; value: DiscrepancyType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Price', value: 'price_mismatch' },
  { label: 'Tier', value: 'tier_mismatch' },
  { label: 'SKU', value: 'sku_mismatch' },
  { label: 'Expired', value: 'expired_contract' },
  { label: 'UOM', value: 'uom_mismatch' },
  { label: 'No Contract', value: 'no_contract' },
]

export function Discrepancies() {
  const [searchParams] = useSearchParams()
  const { canResolveDiscrepancy } = useRole()
  const { decrementDiscrepancyCount } = useAppContext()

  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<DiscrepancyType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'flagged' | 'resolved' | 'all'>('flagged')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [selected, setSelected] = useState<Discrepancy | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [disputeNote, setDisputeNote] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    // Note: backend GET /discrepancies/ has no server-side status filter.
    // Type, supplier, and status filters are all applied client-side on the full response.
    // Move to server-side params if pagination is added.
    const params: Record<string, string> = {}
    const invoiceId = searchParams.get('invoice')
    if (invoiceId) params.invoice_id = invoiceId

    discrepanciesApi
      .list(params)
      .then(setDiscrepancies)
      .catch(() => setError('Failed to load discrepancies'))
      .finally(() => setLoading(false))
  }, [searchParams])

  useEffect(() => { load() }, [load])

  // Pre-select highlighted row from URL param
  const highlightId = searchParams.get('highlight')
  useEffect(() => {
    if (highlightId && discrepancies.length > 0) {
      const found = discrepancies.find((d) => d.line_id === highlightId)
      if (found) setSelected(found)
    }
  }, [highlightId, discrepancies])

  const RESOLVED_STATUSES: DiscrepancyStatus[] = ['resolved_credit', 'resolved_approved', 'investigating']
  const filtered = discrepancies.filter((d) => {
    if (typeFilter !== 'all' && d.discrepancy_type !== typeFilter) return false
    if (supplierSearch && !(d.supplier_name ?? '').toLowerCase().includes(supplierSearch.toLowerCase())) return false
    if (statusFilter === 'flagged' && d.status !== 'flagged') return false
    if (statusFilter === 'resolved' && !RESOLVED_STATUSES.includes(d.status)) return false
    return true
  })

  const handleResolve = async (resolution: ResolutionValue) => {
    if (!selected) return
    setResolving(true)
    setResolveError(null)
    try {
      const note = resolution === 'dispute' ? disputeNote : undefined
      await discrepanciesApi.resolve(selected.line_id, resolution, note)
      if (selected.status === 'flagged') {
        decrementDiscrepancyCount()
      }
      setSelected(null)
      setDisputeNote('')
      load()
    } catch {
      setResolveError('Resolution failed — please try again')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-navy">Discrepancies</h1>

      {error && <ErrorBanner message={error} />}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value as DiscrepancyType | 'all')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                typeFilter === f.value
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-slate-600 border-border hover:border-navy'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 border border-border rounded-md overflow-hidden">
          {(['flagged', 'resolved', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs capitalize transition-colors ${
                statusFilter === s ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'flagged' ? 'Open' : s === 'resolved' ? 'Resolved' : 'All'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
          placeholder="Search supplier…"
          className="px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:border-navy"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-navy-muted text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-2.5">Item / Supplier</th>
              <th className="text-left px-4 py-2.5">Invoice #</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-right px-4 py-2.5">Contract $</th>
              <th className="text-right px-4 py-2.5">Invoiced $</th>
              <th className="text-right px-4 py-2.5">Delta</th>
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon="✅"
                    message={statusFilter === 'flagged' ? 'All clear — no open discrepancies' : 'No discrepancies found'}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr
                  key={d.line_id}
                  onClick={() => setSelected(d)}
                  className={`border-t border-border cursor-pointer hover:bg-slate-50 ${
                    selected?.line_id === d.line_id ? 'bg-blue-50 border-l-2 border-l-navy' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy">{d.item_name ?? '—'}</div>
                    <div className="text-xs text-slate-500">{d.supplier_name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-mono">{d.invoice_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <DiscrepancyBadge type={d.discrepancy_type} />
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {d.contract_unit_price != null ? `$${d.contract_unit_price.toFixed(4)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {d.invoiced_unit_price != null ? `$${d.invoiced_unit_price.toFixed(4)}` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${d.delta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {d.delta >= 0 ? '+' : ''}${Math.abs(d.delta).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={d.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / resolution drawer */}
      <DrawerPanel
        open={!!selected}
        onClose={() => { setSelected(null); setResolveError(null); setDisputeNote('') }}
        title={
          selected ? (
            <span className="flex items-center gap-2">
              {selected.item_name ?? 'Discrepancy'}
              <DiscrepancyBadge type={selected.discrepancy_type} />
            </span>
          ) : ''
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="text-xs text-slate-500">
              {selected.supplier_name} · Invoice {selected.invoice_id.slice(0, 8)} ·{' '}
              {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}
            </div>

            {/* Price comparison */}
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Contract price</span>
                <span className="font-medium text-green-700">
                  {selected.contract_unit_price != null ? `$${selected.contract_unit_price.toFixed(4)}/EA` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoiced price</span>
                <span className="font-medium text-red-700">
                  {selected.invoiced_unit_price != null ? `$${selected.invoiced_unit_price.toFixed(4)}/EA` : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t border-red-200 pt-1.5">
                <span className="font-medium text-slate-600">{selected.delta >= 0 ? 'Over by' : 'Under by'}</span>
                <span className={`font-bold ${selected.delta >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {selected.delta >= 0 ? '+' : ''}${Math.abs(selected.delta).toFixed(4)}
                </span>
              </div>
            </div>

            {/* AI reasoning */}
            {selected.ai_reasoning && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                <span className="font-semibold">AI Analysis: </span>
                {selected.ai_reasoning}
              </div>
            )}

            {/* Current status */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Status:</span>
              <StatusChip status={selected.status} />
            </div>

            {resolveError && <ErrorBanner message={resolveError} />}

            {/* Action buttons */}
            {canResolveDiscrepancy && selected.status === 'flagged' ? (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve('approve')}
                    disabled={resolving}
                    className="flex-1 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleResolve('request_credit')}
                    disabled={resolving}
                    className="flex-1 py-2 bg-slate-600 text-white text-xs rounded-md hover:bg-slate-700 disabled:opacity-60 transition-colors"
                  >
                    Request Credit
                  </button>
                </div>
                <div className="space-y-1.5">
                  <textarea
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                    placeholder="Optional dispute note…"
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs border border-border rounded resize-none focus:outline-none focus:border-navy"
                  />
                  <button
                    onClick={() => handleResolve('dispute')}
                    disabled={resolving}
                    className="w-full py-2 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    Dispute
                  </button>
                </div>
              </div>
            ) : !canResolveDiscrepancy && selected.status === 'flagged' ? (
              <div className="py-3 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-border">
                Pending approver review
              </div>
            ) : selected.status !== 'flagged' ? (
              <div className="py-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-border">
                Already resolved — no further action required
              </div>
            ) : null}
          </div>
        )}
      </DrawerPanel>
    </div>
  )
}
