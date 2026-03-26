import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Discrepancy, ResolveRequest } from '../types/discrepancy'
import { DiscrepancyBadge } from './DiscrepancyBadge'
import { resolveDiscrepancy } from '../api/discrepancies'

interface ResolveModalProps {
  discrepancy: Discrepancy
  onClose: () => void
  onResolved: () => void
}

export function ResolveModal({ discrepancy, onClose, onResolved }: ResolveModalProps) {
  const [resolution, setResolution] = useState<ResolveRequest['resolution']>('approved')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLSelectElement>(null)
  const titleId = 'resolve-modal-title'

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    firstFocusableRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await resolveDiscrepancy(discrepancy.id, { resolution, notes })
      onResolved()
      onClose()
    } catch {
      setError('Failed to save resolution. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const amountDiff = discrepancy.amount_diff
  const formattedDiff = amountDiff !== null
    ? `${amountDiff >= 0 ? '+' : ''}$${Math.abs(amountDiff).toFixed(2)}`
    : 'N/A'

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            Resolve Discrepancy
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-white/10 transition-colors text-text-muted hover:text-text-primary"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Discrepancy info */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-lg">
          <DiscrepancyBadge type={discrepancy.discrepancy_type} />
          <span className={`text-sm font-medium ${amountDiff !== null && amountDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {formattedDiff}
          </span>
          <span className="text-text-muted text-xs ml-auto">
            Invoice {discrepancy.invoice_id.slice(0, 8)}...
          </span>
        </div>

        {/* Resolution select */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-muted mb-1.5" htmlFor="resolution-select">
            Resolution
          </label>
          <select
            id="resolution-select"
            ref={firstFocusableRef}
            value={resolution}
            onChange={(e) => setResolution(e.target.value as ResolveRequest['resolution'])}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary min-h-[44px]"
          >
            <option value="approved">Approved</option>
            <option value="disputed">Disputed</option>
            <option value="credited">Credited</option>
          </select>
        </div>

        {/* Notes textarea */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-text-muted mb-1.5" htmlFor="resolve-notes">
            Notes
          </label>
          <textarea
            id="resolve-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add resolution notes..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors min-h-[44px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Save Resolution
          </button>
        </div>
      </div>
    </div>
  )
}
