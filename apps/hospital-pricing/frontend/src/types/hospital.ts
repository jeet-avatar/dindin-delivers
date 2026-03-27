// Contracts
export type ContractStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'suspended'

export interface WholesaleAgreement {
  contract_id: string
  supplier_id: string | null
  gpo_contract_number: string | null
  status: ContractStatus
  effective_date: string | null
  expiration_date: string | null
  document_s3_path: string | null
  admin_fee_pct: number | null
  aks_safe_harbor_documented: boolean
  baa_required: boolean
  mfn_clause: Record<string, unknown> | null
  created_at: string
}

// Invoices
export type InvoiceMatchStatus =
  | 'matched'
  | 'discrepancies_found'
  | 'pending'
  | 'no_contract'

export interface Invoice {
  invoice_id: string
  supplier_id: string | null
  invoice_number: string | null
  invoice_date: string | null
  total_amount: number | null
  match_status: InvoiceMatchStatus
  discrepancy_count: number | null
  line_count: number
  created_at: string
}

// Discrepancies
export type DiscrepancyType =
  | 'price_mismatch'
  | 'tier_mismatch'
  | 'sku_mismatch'
  | 'expired_contract'
  | 'uom_mismatch'
  | 'no_contract'

export type DiscrepancyStatus =
  | 'none'
  | 'flagged'
  | 'investigating'
  | 'resolved_credit'
  | 'resolved_approved'

export interface Discrepancy {
  line_id: string
  invoice_id: string
  item_name: string | null
  supplier_name: string | null
  discrepancy_type: DiscrepancyType
  contract_unit_price: number | null
  invoiced_unit_price: number | null
  delta: number
  ai_reasoning: string | null
  status: DiscrepancyStatus
  resolved_at: string | null
  created_at: string
}

// Audit
export interface AuditLogEntry {
  log_id: string
  entity_id: string
  actor_user_id: string | null
  event_type: string
  resource_type: string
  resource_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogPage {
  items: AuditLogEntry[]
  total: number
  page: number
}
