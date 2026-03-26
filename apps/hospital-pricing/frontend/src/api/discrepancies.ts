import apiClient from './client'
import type { DiscrepancyPage, ResolveRequest, Discrepancy } from '../types/discrepancy'

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

export async function resolveDiscrepancy(id: string, body: ResolveRequest): Promise<Discrepancy> {
  const { data } = await apiClient.post<Discrepancy>(`/discrepancies/${id}/resolve`, body)
  return data
}
