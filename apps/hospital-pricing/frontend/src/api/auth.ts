import apiClient from './client'
import type { LoginRequest, TokenResponse, UserInfo } from '../types/auth'

export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/login', {
    email: credentials.username,
    password: credentials.password,
  })
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout').catch(() => {})
  localStorage.removeItem('access_token')
  sessionStorage.removeItem('access_token')
}

export async function getMe(): Promise<UserInfo> {
  const { data } = await apiClient.get<UserInfo>('/auth/me')
  return data
}
