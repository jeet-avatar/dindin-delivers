import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { Discrepancy, DiscrepancyType, DiscrepancyStatus, WsDiscrepancyEvent } from '../types/discrepancy'
import { listDiscrepancies } from '../api/discrepancies'
import { DiscrepancyBadge } from '../components/DiscrepancyBadge'
import { StatusBadge } from '../components/StatusBadge'
import { ResolveModal } from '../components/ResolveModal'
import { useWebSocket } from '../hooks/useWebSocket'

const DISCREPANCY_TYPE_LABELS: Record<DiscrepancyType, string> = {
  PRICE_BREACH: 'Price Breach',
  QUANTITY_MISMATCH: 'Qty Mismatch',
  UOM_MISMATCH: 'UOM Mismatch',
  UNAUTHORIZED_ITEM: 'Unauthorized Item',
  MFN_VIOLATION: 'MFN Violation',
  DUPLICATE_LINE: 'Duplicate Line',
}

const ALL_TYPES: DiscrepancyType[] = [
  'PRICE_BREACH',
  'QUANTITY_MISMATCH',
  'UOM_MISMATCH',
  'UNAUTHORIZED_ITEM',
  'MFN_VIOLATION',
  'DUPLICATE_LINE',
]

interface WsBanner {
  id: string
  invoice_id: string
  discrepancy_type: DiscrepancyType
}

function formatAmountDiff(amount: number | null) {
  if (amount === null) return <span className="text-text-muted">—</span>
  const formatted = `${amount >= 0 ? '+' : ''}$${Math.abs(amount).toFixed(2)}`
  return (
    <span className={amount > 0 ? 'text-red-400' : 'text-green-400'}>
      {formatted}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Discrepancies() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Discrepancy | null>(null)
  const [wsBanners, setWsBanners] = useState<WsBanner[]>([])

  const pageSize = 50
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchDiscrepancies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listDiscrepancies({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        page,
        page_size: pageSize,
      })
      setDiscrepancies(result.items)
      setTotal(result.total)
    } catch {
      setError('Failed to load discrepancies.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, page])

  useEffect(() => {
    fetchDiscrepancies()
  }, [fetchDiscrepancies])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, typeFilter])

  const handleWsMessage = useCallback((msg: WsDiscrepancyEvent) => {
    if (msg.type === 'new_discrepancy') {
      const banner: WsBanner = {
        id: msg.data.id,
        invoice_id: msg.data.invoice_id,
        discrepancy_type: msg.data.discrepancy_type,
      }
      setWsBanners(prev => [...prev, banner])
      setTimeout(() => {
        setWsBanners(prev => prev.filter(b => b.id !== banner.id))
      }, 8000)
    }
  }, [])

  useWebSocket<WsDiscrepancyEvent>(
    'ws://localhost:8000/ws/discrepancies',
    handleWsMessage,
    true
  )

  const dismissBanner = (id: string) => {
    setWsBanners(prev => prev.filter(b => b.id !== id))
  }

  const handleResolved = () => {
    fetchDiscrepancies()
  }

  return (
    <div>
      {/* WS Alert Banners */}
      <div className="space-y-2 mb-4">
        {wsBanners.map(banner => (
          <div
            key={banner.id}
            className="bg-amber-900/40 border border-amber-700 text-amber-200 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <span className="text-sm">
              New discrepancy detected on Invoice{' '}
              <span className="font-medium">{banner.invoice_id}</span>{' '}
              &mdash; <span className="font-medium">{DISCREPANCY_TYPE_LABELS[banner.discrepancy_type]}</span>
            </span>
            <button
              onClick={() => dismissBanner(banner.id)}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-amber-800/60 transition-colors ml-3 flex-shrink-0"
              aria-label="Dismiss alert"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Discrepancies</h1>
        <p className="text-text-muted text-sm mt-1">Invoice line verification results</p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary min-h-[44px]"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="approved">Approved</option>
          <option value="disputed">Disputed</option>
          <option value="credited">Credited</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary min-h-[44px]"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          {ALL_TYPES.map(t => (
            <option key={t} value={t}>{DISCREPANCY_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border sticky top-0">
              <th className="text-left px-4 py-3 font-medium text-text-muted">Type</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">Invoice ID</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">Amount Diff</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">Status</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">Detected</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="bg-white/5 animate-pulse rounded h-4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : discrepancies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-text-muted">
                    <AlertTriangle size={32} className="opacity-40" />
                    <p className="font-medium text-text-primary">No discrepancies found</p>
                    <p className="text-xs">Try adjusting your filters or check back later</p>
                  </div>
                </td>
              </tr>
            ) : (
              discrepancies.map(d => (
                <tr
                  key={d.id}
                  className="border-b border-border/50 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <DiscrepancyBadge type={d.discrepancy_type} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {d.invoice_id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    {formatAmountDiff(d.amount_diff)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status as DiscrepancyStatus} />
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setResolveTarget(d)}
                      className="bg-primary/10 text-primary hover:bg-primary/20 rounded px-3 py-1.5 text-xs font-medium min-h-[36px] transition-colors"
                    >
                      Resolve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && discrepancies.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveTarget && (
        <ResolveModal
          discrepancy={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  )
}
