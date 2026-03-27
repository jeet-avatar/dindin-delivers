import { apiClient } from './client'
import type { WholesaleAgreement } from '../types/hospital'

export interface CreateContractBody {
  supplier_id?: string
  gpo_contract_number?: string
  effective_date?: string
  expiration_date?: string
  document_s3_path?: string
}

export const contractsApi = {
  list: () =>
    apiClient.get<WholesaleAgreement[]>('/contracts/').then((r) => r.data),

  get: (id: string) =>
    apiClient.get<WholesaleAgreement>(`/contracts/${id}`).then((r) => r.data),

  create: (body: CreateContractBody) =>
    apiClient.post<WholesaleAgreement>('/contracts/', body).then((r) => r.data),

  activate: (id: string) =>
    apiClient.post<WholesaleAgreement>(`/contracts/${id}/activate`).then((r) => r.data),

  getPresignedUrl: (filename: string, contentType: string) =>
    apiClient
      .post<{ presigned_url: string; s3_path: string }>('/documents/upload', {
        filename,
        content_type: contentType,
      })
      .then((r) => r.data),
}
