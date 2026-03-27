import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiClient } from '../api/client'
import { discrepanciesApi } from '../api/discrepancies'
import type { CurrentUser } from '../types/auth'

interface AppContextValue {
  currentUser: CurrentUser | null
  openDiscrepancyCount: number
  decrementDiscrepancyCount: () => void
  loading: boolean
}

const AppContext = createContext<AppContextValue>({
  currentUser: null,
  openDiscrepancyCount: 0,
  decrementDiscrepancyCount: () => {},
  loading: true,
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [openDiscrepancyCount, setOpenDiscrepancyCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    Promise.all([
      apiClient.get<CurrentUser>('/auth/me').then((r) => r.data),
      discrepanciesApi.list({ status: 'open' }).then((items) => items.length).catch(() => 0),
    ])
      .then(([user, count]) => {
        setCurrentUser(user)
        setOpenDiscrepancyCount(count)
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      })
      .finally(() => setLoading(false))
  }, [])

  const decrementDiscrepancyCount = useCallback(() => {
    setOpenDiscrepancyCount((n) => Math.max(0, n - 1))
  }, [])

  return (
    <AppContext.Provider value={{ currentUser, openDiscrepancyCount, decrementDiscrepancyCount, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}
