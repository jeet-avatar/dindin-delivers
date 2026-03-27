import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

apiClient.interceptors.response.use(
  r => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          if (original.headers) original.headers.Authorization = `Bearer ${token}`
          return apiClient(original)
        })
      }
      original._retry = true
      isRefreshing = true
      try {
        const { data } = await apiClient.post<{ access_token: string }>('/auth/refresh')
        sessionStorage.setItem('access_token', data.access_token)
        processQueue(null, data.access_token)
        if (original.headers) original.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        sessionStorage.removeItem('access_token')
        localStorage.removeItem('access_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// Default export for backward compatibility with existing api/auth.ts
export default apiClient
