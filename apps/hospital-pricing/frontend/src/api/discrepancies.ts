import { apiClient } from './client'
import type { Discrepancy } from '../types/hospital'
import type { DiscrepancyPage, ResolveRequest, Discrepancy as LegacyDiscrepancy } from '../types/discrepancy'

export type ResolutionValue = 'approve' | 'request_credit' | 'dispute'

export const discrepanciesApi = {
  list: (params?: { status?: string; invoice_id?: string }) =>
    apiClient
      .get<Discrepancy[]>('/discrepancies/', { params })
      .then((r) => r.data),

  resolve: (id: string, resolution: ResolutionValue, note?: string) =>
    apiClient
      .post<Discrepancy>(`/discrepancies/${id}/resolve`, { resolution, note })
      .then((r) => r.data),
}

// ---------------------------------------------------------------------------
// Legacy function-style exports kept for backward compatibility with existing
// pages/Discrepancies.tsx and components/ResolveModal.tsx
// ---------------------------------------------------------------------------
export async function listDiscrepancies(params: {
  invoice_id?: string
  status?: string
  type?: string
  page?: number
  page_size?: number
}): Promise<DiscrepancyPage> {
  const { data } = await apiClient.get<DiscrepancyPage>('/discrepancies', { params })
  return data
}

export async function resolveDiscrepancy(id: string, body: ResolveRequest): Promise<LegacyDiscrepancy> {
  const { data } = await apiClient.post<LegacyDiscrepancy>(`/discrepancies/${id}/resolve`, body)
  return data
}
