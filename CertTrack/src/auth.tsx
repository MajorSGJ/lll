import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setToken } from './api'
import type { AuthUser, SubscriptionInfo } from './api'

type AuthState = {
  user: AuthUser | null
  subscription: SubscriptionInfo | null
  loading: boolean
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.me()
      setUser(data.user)
      setSubscription(data.subscription)
    } catch {
      setUser(null)
      setSubscription(null)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('oh_token')
    if (token) {
      refresh().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [refresh])

  const logout = () => {
    setToken(null)
    setUser(null)
    setSubscription(null)
    const ohUrl = import.meta.env.VITE_ONEHOST_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:55' : 'https://sklep.onehost.site')
    window.location.href = ohUrl;
  }

  return (
    <AuthContext.Provider value={{ user, subscription, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
