import { useState, useEffect, useCallback } from 'react'
import { login as apiLogin, logout as apiLogout, getMe } from '../api/auth'
import type { LoginRequest, UserInfo } from '../types/auth'

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    getMe().then(setUser).catch(() => {
      sessionStorage.removeItem('access_token')
    }).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const { access_token } = await apiLogin(credentials)
    sessionStorage.setItem('access_token', access_token)
    const me = await getMe()
    setUser(me)
    return me
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  return { user, loading, login, logout }
}
