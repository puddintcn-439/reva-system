import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, login as apiLogin } from '../services/api'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('hun_token')
    if (token) {
      getMe()
        .then((res) => setUser(res.data.user))  // user now includes permissions[]
        .catch(() => {
          localStorage.removeItem('hun_token')
          localStorage.removeItem('hun_refresh_token')
          localStorage.removeItem('hun_user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (credentials) => {
    const res = await apiLogin(credentials)
    localStorage.setItem('hun_token', res.data.token)
    if (res.data.refreshToken) {
      localStorage.setItem('hun_refresh_token', res.data.refreshToken)
    }
    localStorage.setItem('hun_user', JSON.stringify(res.data.user))
    setUser(res.data.user)   // includes permissions[]
    return res.data
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('hun_refresh_token')
    if (refreshToken) {
      try {
        const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
        await axios.post(`${baseURL}/auth/logout`, { refreshToken })
      } catch { /* ignore — token may already be revoked */ }
    }
    localStorage.removeItem('hun_token')
    localStorage.removeItem('hun_refresh_token')
    localStorage.removeItem('hun_user')
    setUser(null)
  }

  /** Returns true if the logged-in user has the given permission string */
  const can = useCallback((permission) => {
    return Array.isArray(user?.permissions) && user.permissions.includes(permission)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
