import type { DiscrepancyType } from '../types/hospital'

const TYPE_STYLES: Record<DiscrepancyType, string> = {
  price_mismatch: 'bg-red-100 text-red-700',
  tier_mismatch: 'bg-amber-100 text-amber-700',
  sku_mismatch: 'bg-purple-100 text-purple-700',
  expired_contract: 'bg-orange-100 text-orange-700',
  uom_mismatch: 'bg-blue-100 text-blue-700',
  no_contract: 'bg-slate-100 text-slate-600',
}

const TYPE_LABELS: Record<DiscrepancyType, string> = {
  price_mismatch: 'Price Mismatch',
  tier_mismatch: 'Tier Mismatch',
  sku_mismatch: 'SKU Mismatch',
  expired_contract: 'Expired Contract',
  uom_mismatch: 'UOM Mismatch',
  no_contract: 'No Contract',
}

interface Props {
  type: DiscrepancyType
}

export function DiscrepancyBadge({ type }: Props) {
  const style = TYPE_STYLES[type]
  const label = TYPE_LABELS[type]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}
