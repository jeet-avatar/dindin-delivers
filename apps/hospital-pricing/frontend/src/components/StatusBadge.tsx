import type { DiscrepancyStatus } from '../types/discrepancy'

const STATUS_CONFIG: Record<DiscrepancyStatus, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-red-900/60', text: 'text-red-300', label: 'Open' },
  approved: { bg: 'bg-green-900/60', text: 'text-green-300', label: 'Approved' },
  disputed: { bg: 'bg-amber-900/60', text: 'text-amber-300', label: 'Disputed' },
  credited: { bg: 'bg-blue-900/60', text: 'text-blue-300', label: 'Credited' },
}

export function StatusBadge({ status }: { status: DiscrepancyStatus }) {
  const { bg, text, label } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}
