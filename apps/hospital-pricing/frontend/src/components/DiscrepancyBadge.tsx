import type { DiscrepancyType } from '../types/discrepancy'

const CONFIG: Record<DiscrepancyType, { bg: string; text: string; label: string }> = {
  PRICE_BREACH: { bg: 'bg-red-900/60', text: 'text-red-300', label: 'Price Breach' },
  QUANTITY_MISMATCH: { bg: 'bg-amber-900/60', text: 'text-amber-300', label: 'Qty Mismatch' },
  UOM_MISMATCH: { bg: 'bg-yellow-900/60', text: 'text-yellow-300', label: 'UOM Mismatch' },
  UNAUTHORIZED_ITEM: { bg: 'bg-purple-900/60', text: 'text-purple-300', label: 'Unauthorized' },
  MFN_VIOLATION: { bg: 'bg-orange-900/60', text: 'text-orange-300', label: 'MFN Violation' },
  DUPLICATE_LINE: { bg: 'bg-blue-900/60', text: 'text-blue-300', label: 'Duplicate' },
}

export function DiscrepancyBadge({ type }: { type: DiscrepancyType }) {
  const { bg, text, label } = CONFIG[type]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}
