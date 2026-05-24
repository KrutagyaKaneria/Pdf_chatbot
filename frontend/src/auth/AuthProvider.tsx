import React, {createContext, useContext, useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
  clearAuthSession,
  getStoredAuth,
  loginRequest,
  logoutRequest,
  apiJson,
  refreshAccessToken,
  signupRequest,
} from '../lib/api'
import { useChatStore } from '../store/useChatStore'

export type User = {
  user_id: string
  email?: string
  name?: string
}

type AuthContextValue = {
  user: User | null
  token: string | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()
  const resetForAuthChange = useChatStore((state) => state.resetForAuthChange)

  useEffect(() => {
    const restore = async () => {
      const stored = getStoredAuth()
      if (stored.accessToken && stored.user) {
        setToken(stored.accessToken)
        setUser(stored.user as User)
      }

      if (stored.accessToken) {
        try {
          const me = await apiJson<{ data?: User; user?: User }>("/auth/me")
          const currentUser = me.data ?? me.user ?? stored.user
          if (currentUser) {
            setToken(getStoredAuth().accessToken)
            setUser(currentUser as User)
          }
        } catch {
          const refreshed = await refreshAccessToken()
          if (refreshed?.accessToken && refreshed.user) {
            setToken(refreshed.accessToken)
            setUser(refreshed.user as User)
          } else {
            clearAuthSession()
            setToken(null)
            setUser(null)
          }
        }
      } else {
        const refreshed = await refreshAccessToken()
        if (refreshed?.accessToken && refreshed.user) {
          setToken(refreshed.accessToken)
          setUser(refreshed.user as User)
        } else {
          clearAuthSession()
          setToken(null)
          setUser(null)
        }
      }
      setReady(true)
    }

    void restore()
  }, [])

  const login = async (email: string, password: string) => {
    const session = await loginRequest(email, password)
    resetForAuthChange()
    setToken(session.accessToken)
    setUser(session.user as User)
    navigate('/')
  }

  const signup = async (name: string, email: string, password: string) => {
    const session = await signupRequest(name, email, password)
    resetForAuthChange()
    setToken(session.accessToken)
    setUser(session.user as User)
    navigate('/')
  }

  const logout = async () => {
    await logoutRequest()
    resetForAuthChange()
    setToken(null)
    setUser(null)
    clearAuthSession()
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{user, token, ready, login, signup, logout}}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
