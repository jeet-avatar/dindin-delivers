import { apiClient } from './client'
import type { AuditLogPage } from '../types/hospital'

export const auditApi = {
  list: (params?: {
    page?: number
    limit?: number
    date_from?: string
    date_to?: string
    action_type?: string
    search?: string
  }) =>
    apiClient.get<AuditLogPage>('/audit/', { params }).then((r) => r.data),
}
