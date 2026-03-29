export type DiscrepancyType =
  | 'PRICE_BREACH'
  | 'QUANTITY_MISMATCH'
  | 'UOM_MISMATCH'
  | 'UNAUTHORIZED_ITEM'
  | 'MFN_VIOLATION'
  | 'DUPLICATE_LINE'

export type DiscrepancyStatus = 'open' | 'approved' | 'disputed' | 'credited'

export interface Discrepancy {
  id: string
  invoice_id: string
  invoice_line_item_id: string
  discrepancy_type: DiscrepancyType
  status: DiscrepancyStatus
  contract_price: number | null
  invoiced_price: number | null
  amount_diff: number | null
  notes: string | null
  created_at: string
  resolved_at: string | null
}

export interface DiscrepancyPage {
  items: Discrepancy[]
  total: number
  page: number
  page_size: number
}

export interface ResolveRequest {
  resolution: 'approved' | 'disputed' | 'credited'
  notes: string
}

export interface WsDiscrepancyEvent {
  type: 'new_discrepancy'
  data: {
    id: string
    discrepancy_type: DiscrepancyType
    invoice_id: string
    amount_diff: number
  }
}
