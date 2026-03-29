import { apiClient } from './client'
import type { Invoice } from '../types/hospital'

export const invoicesApi = {
  list: () =>
    apiClient.get<Invoice[]>('/invoices/').then((r) => r.data),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<Invoice>('/invoices/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
