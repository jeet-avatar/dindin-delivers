import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { LoginRequest, UserInfo } from '../types/auth'

interface AuthContextValue {
  user: UserInfo | null
  loading: boolean
  login: (credentials: LoginRequest) => Promise<UserInfo>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
