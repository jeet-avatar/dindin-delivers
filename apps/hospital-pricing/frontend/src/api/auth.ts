import apiClient from './client'
import type { LoginRequest, TokenResponse, UserInfo } from '../types/auth'

export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const form = new URLSearchParams()
  form.append('username', credentials.username)
  form.append('password', credentials.password)
  const { data } = await apiClient.post<TokenResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout').catch(() => {})
  sessionStorage.removeItem('access_token')
}

export async function getMe(): Promise<UserInfo> {
  const { data } = await apiClient.get<UserInfo>('/auth/me')
  return data
}
