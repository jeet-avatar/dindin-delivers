import { useEffect, useState, useCallback } from 'react'
import { auditApi } from '../api/audit'
import type { AuditLogEntry } from '../types/hospital'
import { SkeletonRow } from '../components/SkeletonRow'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionType, setActionType] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    auditApi
      .list({
        page,
        limit: 50,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        action_type: actionType || undefined,
        search: search || undefined,
      })
      .then((data) => {
        setEntries(data.items)
        setTotal(data.total)
      })
      .catch(() => setError('Failed to load audit log'))
      .finally(() => setLoading(false))
  }, [page, dateFrom, dateTo, actionType, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-navy">Audit Log</h1>

      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:border-navy"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:border-navy"
        />
        <input
          type="text"
          value={actionType}
          onChange={(e) => { setActionType(e.target.value); setPage(1) }}
          placeholder="Action type…"
          className="px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:border-navy"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search resource…"
          className="px-3 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:border-navy"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-navy-muted text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-2.5">Timestamp</th>
              <th className="text-left px-4 py-2.5">User</th>
              <th className="text-left px-4 py-2.5">Action</th>
              <th className="text-left px-4 py-2.5">Entity Type</th>
              <th className="text-left px-4 py-2.5">Entity ID</th>
              <th className="text-left px-4 py-2.5">Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState icon="📋" message="No audit events recorded yet" />
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.log_id} className="border-t border-border hover:bg-slate-50 text-xs">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">
                    {e.actor_user_id?.slice(0, 8) ?? 'system'}
                  </td>
                  <td className="px-4 py-2.5 text-navy font-medium">{e.event_type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.resource_type}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">
                    {e.resource_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">
                    {e.payload ? JSON.stringify(e.payload).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-slate-500">
            <span>{total} total events</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-border rounded hover:bg-slate-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-3 py-1">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-border rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
