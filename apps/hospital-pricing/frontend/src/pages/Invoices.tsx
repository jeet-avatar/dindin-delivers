import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoicesApi } from '../api/invoices'
import type { Invoice } from '../types/hospital'
import { StatusChip } from '../components/StatusChip'
import { SkeletonRow } from '../components/SkeletonRow'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { UploadZone } from '../components/UploadZone'

export function Invoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    invoicesApi
      .list()
      .then(setInvoices)
      .catch(() => setError('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      await invoicesApi.upload(file)
      load()
    } catch {
      setUploadError('Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy">Invoices</h1>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Upload zone */}
      <div className="bg-surface-card border border-border rounded-lg p-5 shadow-card">
        <p className="text-sm font-medium text-navy mb-3">Upload Invoice</p>
        <UploadZone
          accept=".pdf,.edi"
          onFile={handleFile}
          uploading={uploading}
          error={uploadError ?? undefined}
        />
      </div>

      {/* Invoices table */}
      <div className="bg-surface-card border border-border rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-navy-muted text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-2.5">Invoice #</th>
              <th className="text-left px-4 py-2.5">Supplier</th>
              <th className="text-left px-4 py-2.5">Date</th>
              <th className="text-right px-4 py-2.5">Amount</th>
              <th className="text-right px-4 py-2.5">Lines</th>
              <th className="text-left px-4 py-2.5">Match Status</th>
              <th className="text-right px-4 py-2.5">Discrepancies</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState icon="🧾" message="No invoices uploaded yet" />
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.invoice_id}
                  onClick={() => {
                    if (inv.match_status === 'discrepancies_found') {
                      navigate(`/discrepancies?invoice=${inv.invoice_id}`)
                    }
                  }}
                  className={`border-t border-border ${
                    inv.match_status === 'discrepancies_found'
                      ? 'hover:bg-red-50 cursor-pointer'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{inv.invoice_number ?? inv.invoice_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.supplier_id ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {inv.total_amount != null
                      ? `$${inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{inv.line_count}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={inv.match_status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.discrepancy_count != null && inv.discrepancy_count > 0 ? (
                      <span className="font-medium text-red-600">{inv.discrepancy_count}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
