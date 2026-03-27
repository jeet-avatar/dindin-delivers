import type { ContractStatus, InvoiceMatchStatus, DiscrepancyStatus } from '../types/hospital'

type AnyStatus = ContractStatus | InvoiceMatchStatus | DiscrepancyStatus

const STATUS_STYLES: Record<string, string> = {
  // Contract
  draft: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  terminated: 'bg-slate-200 text-slate-700',
  suspended: 'bg-orange-100 text-orange-700',
  // Invoice
  matched: 'bg-green-100 text-green-700',
  discrepancies_found: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  no_contract: 'bg-slate-100 text-slate-600',
  // Discrepancy
  none: 'bg-slate-100 text-slate-500',
  flagged: 'bg-amber-100 text-amber-700',
  investigating: 'bg-orange-100 text-orange-700',
  resolved_credit: 'bg-blue-100 text-blue-700',
  resolved_approved: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
  suspended: 'Suspended',
  matched: 'Matched',
  discrepancies_found: 'Discrepancies',
  pending: 'Pending',
  no_contract: 'No Contract',
  none: 'None',
  flagged: 'Flagged',
  investigating: 'Investigating',
  resolved_credit: 'Credit Requested',
  resolved_approved: 'Approved',
}

interface Props {
  status: AnyStatus
}

export function StatusChip({ status }: Props) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}
